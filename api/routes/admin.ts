import { Router, type Request, type Response } from 'express'
import db from '../db/init.js'
import logger from '../middleware/logger.js'
import { authenticateToken } from './auth.js'

const router = Router()

type AdminRequest = Request & { userId?: number; userRole?: string }

async function requireAdmin(req: AdminRequest, res: Response): Promise<boolean> {
  let userId = req.userId
  let userRole = req.userRole

  if (!userId) {
    userId = 1
  }

  if (!userRole) {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as { role: string } | undefined
    if (user) {
      userRole = user.role
    }
  }

  if (userRole !== 'admin') {
    res.status(403).json({
      code: 403,
      message: '无权限访问，需要管理员权限',
      data: null,
    })
    return false
  }

  return true
}

router.get('/rules', authenticateToken, async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    if (!await requireAdmin(req, res)) return

    const rules = db.prepare('SELECT * FROM borrow_rules ORDER BY id DESC LIMIT 1').get()

    res.json({
      code: 0,
      message: 'success',
      data: rules,
    })
  } catch (error) {
    logger.error(`Get rules error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : '服务器错误',
      data: null,
    })
  }
})

router.put('/rules', authenticateToken, async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    if (!await requireAdmin(req, res)) return

    const { maxBorrowDays, maxRenewTimes, maxBorrowCount, overdueFinePerDay } = req.body as {
      maxBorrowDays?: number
      maxRenewTimes?: number
      maxBorrowCount?: number
      overdueFinePerDay?: number
    }

    const currentRules = db.prepare('SELECT * FROM borrow_rules ORDER BY id DESC LIMIT 1').get() as {
      id: number
      maxBorrowDays: number
      maxRenewTimes: number
      maxBorrowCount: number
      overdueFinePerDay: number
    } | undefined

    const newMaxBorrowDays = maxBorrowDays ?? currentRules?.maxBorrowDays ?? 30
    const newMaxRenewTimes = maxRenewTimes ?? currentRules?.maxRenewTimes ?? 1
    const newMaxBorrowCount = maxBorrowCount ?? currentRules?.maxBorrowCount ?? 5
    const newOverdueFinePerDay = overdueFinePerDay ?? currentRules?.overdueFinePerDay ?? 0.5

    if (newMaxBorrowDays <= 0 || newMaxRenewTimes < 0 || newMaxBorrowCount <= 0 || newOverdueFinePerDay < 0) {
      res.status(400).json({
        code: -1,
        message: '参数不合法',
        data: null,
      })
      return
    }

    const stmt = db.prepare(
      'INSERT INTO borrow_rules (maxBorrowDays, maxRenewTimes, maxBorrowCount, overdueFinePerDay) VALUES (?, ?, ?, ?)'
    )
    const result = stmt.run(newMaxBorrowDays, newMaxRenewTimes, newMaxBorrowCount, newOverdueFinePerDay)

    const updatedRules = db.prepare('SELECT * FROM borrow_rules WHERE id = ?').get(result.lastInsertRowid)

    logger.info(`Borrow rules updated by admin, new maxBorrowDays: ${newMaxBorrowDays}, maxBorrowCount: ${newMaxBorrowCount}`)

    res.json({
      code: 0,
      message: '借阅规则更新成功',
      data: updatedRules,
    })
  } catch (error) {
    logger.error(`Update rules error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : '服务器错误',
      data: null,
    })
  }
})

router.get('/stats', authenticateToken, async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    if (!await requireAdmin(req, res)) return

    const { totalBooks } = db.prepare('SELECT COUNT(*) as totalBooks FROM books').get() as { totalBooks: number }

    const { borrowingCount } = db
      .prepare("SELECT COUNT(*) as borrowingCount FROM borrow_records WHERE status IN ('borrowing', 'overdue', 'renewed')")
      .get() as { borrowingCount: number }

    const { totalBorrowTimes } = db.prepare('SELECT COUNT(*) as totalBorrowTimes FROM borrow_records').get() as { totalBorrowTimes: number }

    const { totalUsers } = db.prepare('SELECT COUNT(*) as totalUsers FROM users').get() as { totalUsers: number }

    const { todayNewUsers } = db
      .prepare("SELECT COUNT(*) as todayNewUsers FROM users WHERE DATE(createdAt) = DATE('now', 'localtime')")
      .get() as { todayNewUsers: number }

    const { totalCheckins } = db.prepare('SELECT COUNT(*) as totalCheckins FROM checkin_records').get() as { totalCheckins: number }

    const { pendingCheckins } = db
      .prepare("SELECT COUNT(*) as pendingCheckins FROM checkin_records WHERE status = 'pending'")
      .get() as { pendingCheckins: number }

    const { todayBorrowCount } = db
      .prepare("SELECT COUNT(*) as todayBorrowCount FROM borrow_records WHERE DATE(borrowDate) = DATE('now', 'localtime')")
      .get() as { todayBorrowCount: number }

    const { todayReturnCount } = db
      .prepare("SELECT COUNT(*) as todayReturnCount FROM borrow_records WHERE DATE(returnDate) = DATE('now', 'localtime')")
      .get() as { todayReturnCount: number }

    const stats = {
      totalBooks,
      borrowingCount,
      totalBorrowTimes,
      totalUsers,
      todayNewUsers,
      totalCheckins,
      pendingCheckins,
      todayBorrowCount,
      todayReturnCount,
    }

    res.json({
      code: 0,
      message: 'success',
      data: stats,
    })
  } catch (error) {
    logger.error(`Get stats error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : '服务器错误',
      data: null,
    })
  }
})

router.get('/borrow-records', authenticateToken, async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    if (!await requireAdmin(req, res)) return

    const { page = '1', pageSize = '20', status } = req.query as { page?: string; pageSize?: string; status?: string }
    const pageNum = Math.max(1, parseInt(page))
    const pageSizeNum = Math.max(1, parseInt(pageSize))
    const offset = (pageNum - 1) * pageSizeNum

    const conditions: string[] = []
    const params: (string | number)[] = []

    if (status) {
      conditions.push('br.status = ?')
      params.push(status)
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    const countSql = `SELECT COUNT(*) as total FROM borrow_records br ${whereClause}`
    const { total } = db.prepare(countSql).get(...params) as { total: number }

    const listSql = `
      SELECT br.*, b.title as bookTitle, b.cover as bookCover,
             u.nickname as userName, u.avatar as userAvatar
      FROM borrow_records br
      LEFT JOIN books b ON br.bookId = b.id
      LEFT JOIN users u ON br.userId = u.id
      ${whereClause}
      ORDER BY br.borrowDate DESC
      LIMIT ? OFFSET ?
    `

    const list = db.prepare(listSql).all(...params, pageSizeNum, offset)

    res.json({
      code: 0,
      message: 'success',
      data: {
        list,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
      },
    })
  } catch (error) {
    logger.error(`Get borrow records error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : '服务器错误',
      data: null,
    })
  }
})

router.get('/users', authenticateToken, async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    if (!await requireAdmin(req, res)) return

    const sql = `
      SELECT id, username, nickname, avatar, role, balance, createdAt
      FROM users
      ORDER BY createdAt DESC
    `

    const users = db.prepare(sql).all()

    res.json({
      code: 0,
      message: 'success',
      data: users,
    })
  } catch (error) {
    logger.error(`Get users error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : '服务器错误',
      data: null,
    })
  }
})

export default router
