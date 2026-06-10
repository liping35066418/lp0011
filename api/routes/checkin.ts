import { Router, type Request, type Response } from 'express'
import db from '../db/init.js'
import logger from '../middleware/logger.js'
import { authenticateToken, getUserIdFromRequest } from './auth.js'
import type { CheckinRecord, Book } from '../../shared/types.js'

const router = Router()

type AuthenticatedRequest = Request & { userId?: number; userRole?: string }

const BASE_SELECT_SQL = `
  SELECT cr.id, cr.userId, u.nickname as userName, u.avatar as userAvatar,
         cr.bookId, b.title as bookTitle, cr.progress, cr.note, cr.likes,
         cr.status, cr.createdAt
  FROM checkin_records cr
  LEFT JOIN users u ON cr.userId = u.id
  LEFT JOIN books b ON cr.bookId = b.id
`

function isAdmin(role?: string): boolean {
  return role === 'admin'
}

router.get('/ranking', (_req: Request, res: Response): void => {
  try {
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)
    const startDate = sevenDaysAgo.toISOString()

    const sql = `
      ${BASE_SELECT_SQL}
      WHERE cr.status = 'approved' AND cr.createdAt >= ?
      ORDER BY cr.likes DESC, cr.createdAt DESC
      LIMIT 20
    `

    const records = db.prepare(sql).all(startDate) as CheckinRecord[]

    logger.info(`Fetched checkin ranking, ${records.length} records`)

    res.json({
      code: 0,
      message: 'success',
      data: records,
    })
  } catch (error) {
    logger.error(`Ranking fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

router.get('/feed', (req: Request, res: Response): void => {
  try {
    const { page = '1', pageSize = '20' } = req.query as { page?: string; pageSize?: string }
    const pageNum = Math.max(1, parseInt(page))
    const pageSizeNum = Math.max(1, parseInt(pageSize))
    const offset = (pageNum - 1) * pageSizeNum

    const countSql = "SELECT COUNT(*) as total FROM checkin_records WHERE status = 'approved'"
    const { total } = db.prepare(countSql).get() as { total: number }

    const listSql = `
      ${BASE_SELECT_SQL}
      WHERE cr.status = 'approved'
      ORDER BY cr.createdAt DESC
      LIMIT ? OFFSET ?
    `

    const list = db.prepare(listSql).all(pageSizeNum, offset) as CheckinRecord[]

    logger.info(`Fetched checkin feed, page ${pageNum}, ${list.length} records`)

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
    logger.error(`Feed fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

router.post('/', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { bookId, progress, note } = req.body as {
      bookId: number
      progress: number
      note: string
    }
    const userId = getUserIdFromRequest(req)

    if (!bookId) {
      res.status(400).json({
        code: -1,
        message: 'Book ID is required',
        data: null,
      })
      return
    }

    if (!note || note.trim().length === 0) {
      res.status(400).json({
        code: -1,
        message: 'Note is required',
        data: null,
      })
      return
    }

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId) as Book | undefined
    if (!book) {
      res.status(404).json({
        code: -1,
        message: 'Book not found',
        data: null,
      })
      return
    }

    const stmt = db.prepare(
      'INSERT INTO checkin_records (userId, bookId, progress, note, likes, status, createdAt) VALUES (?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)'
    )
    const result = stmt.run(userId, bookId, progress || 0, note, 'pending')

    const recordSql = `
      ${BASE_SELECT_SQL}
      WHERE cr.id = ?
    `
    const record = db.prepare(recordSql).get(result.lastInsertRowid) as CheckinRecord

    logger.info(`Checkin created by user ${userId}, checkin ID: ${result.lastInsertRowid}`)

    res.status(201).json({
      code: 0,
      message: 'Checkin created, pending review',
      data: record,
    })
  } catch (error) {
    logger.error(`Checkin create error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

router.post('/:id/like', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const id = parseInt(req.params.id)

    if (isNaN(id)) {
      res.status(400).json({
        code: -1,
        message: 'Invalid checkin ID',
        data: null,
      })
      return
    }

    const existing = db.prepare('SELECT id FROM checkin_records WHERE id = ?').get(id) as { id: number } | undefined

    if (!existing) {
      res.status(404).json({
        code: -1,
        message: 'Checkin record not found',
        data: null,
      })
      return
    }

    db.prepare('UPDATE checkin_records SET likes = likes + 1 WHERE id = ?').run(id)

    const recordSql = `
      ${BASE_SELECT_SQL}
      WHERE cr.id = ?
    `
    const record = db.prepare(recordSql).get(id) as CheckinRecord

    const userId = getUserIdFromRequest(req)
    logger.info(`Checkin ${id} liked by user ${userId}, current likes: ${record.likes}`)

    res.json({
      code: 0,
      message: 'Liked successfully',
      data: record,
    })
  } catch (error) {
    logger.error(`Like checkin error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

router.get('/pending', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!isAdmin(req.userRole)) {
      res.status(403).json({
        code: 403,
        message: 'Permission denied: admin role required',
        data: null,
      })
      return
    }

    const { page = '1', pageSize = '20' } = req.query as { page?: string; pageSize?: string }
    const pageNum = Math.max(1, parseInt(page))
    const pageSizeNum = Math.max(1, parseInt(pageSize))
    const offset = (pageNum - 1) * pageSizeNum

    const countSql = "SELECT COUNT(*) as total FROM checkin_records WHERE status = 'pending'"
    const { total } = db.prepare(countSql).get() as { total: number }

    const listSql = `
      ${BASE_SELECT_SQL}
      WHERE cr.status = 'pending'
      ORDER BY cr.createdAt DESC
      LIMIT ? OFFSET ?
    `

    const list = db.prepare(listSql).all(pageSizeNum, offset) as CheckinRecord[]

    logger.info(`Admin fetched pending checkins, page ${pageNum}, ${list.length} records`)

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
    logger.error(`Pending checkins fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

router.put('/:id/approve', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!isAdmin(req.userRole)) {
      res.status(403).json({
        code: 403,
        message: 'Permission denied: admin role required',
        data: null,
      })
      return
    }

    const id = parseInt(req.params.id)

    if (isNaN(id)) {
      res.status(400).json({
        code: -1,
        message: 'Invalid checkin ID',
        data: null,
      })
      return
    }

    const existing = db.prepare('SELECT id, status FROM checkin_records WHERE id = ?').get(id) as { id: number; status: string } | undefined

    if (!existing) {
      res.status(404).json({
        code: -1,
        message: 'Checkin record not found',
        data: null,
      })
      return
    }

    if (existing.status === 'approved') {
      res.status(400).json({
        code: -1,
        message: 'Checkin already approved',
        data: null,
      })
      return
    }

    db.prepare("UPDATE checkin_records SET status = 'approved' WHERE id = ?").run(id)

    const recordSql = `
      ${BASE_SELECT_SQL}
      WHERE cr.id = ?
    `
    const record = db.prepare(recordSql).get(id) as CheckinRecord

    logger.info(`Checkin ${id} approved by admin user ${getUserIdFromRequest(req)}`)

    res.json({
      code: 0,
      message: 'Checkin approved successfully',
      data: record,
    })
  } catch (error) {
    logger.error(`Approve checkin error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

router.put('/:id/reject', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (!isAdmin(req.userRole)) {
      res.status(403).json({
        code: 403,
        message: 'Permission denied: admin role required',
        data: null,
      })
      return
    }

    const id = parseInt(req.params.id)

    if (isNaN(id)) {
      res.status(400).json({
        code: -1,
        message: 'Invalid checkin ID',
        data: null,
      })
      return
    }

    const existing = db.prepare('SELECT id, status FROM checkin_records WHERE id = ?').get(id) as { id: number; status: string } | undefined

    if (!existing) {
      res.status(404).json({
        code: -1,
        message: 'Checkin record not found',
        data: null,
      })
      return
    }

    if (existing.status === 'rejected') {
      res.status(400).json({
        code: -1,
        message: 'Checkin already rejected',
        data: null,
      })
      return
    }

    db.prepare("UPDATE checkin_records SET status = 'rejected' WHERE id = ?").run(id)

    const recordSql = `
      ${BASE_SELECT_SQL}
      WHERE cr.id = ?
    `
    const record = db.prepare(recordSql).get(id) as CheckinRecord

    logger.info(`Checkin ${id} rejected by admin user ${getUserIdFromRequest(req)}`)

    res.json({
      code: 0,
      message: 'Checkin rejected successfully',
      data: record,
    })
  } catch (error) {
    logger.error(`Reject checkin error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

router.get('/my', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = getUserIdFromRequest(req)
    const { page = '1', pageSize = '20' } = req.query as { page?: string; pageSize?: string }
    const pageNum = Math.max(1, parseInt(page))
    const pageSizeNum = Math.max(1, parseInt(pageSize))
    const offset = (pageNum - 1) * pageSizeNum

    const countSql = 'SELECT COUNT(*) as total FROM checkin_records WHERE userId = ?'
    const { total } = db.prepare(countSql).get(userId) as { total: number }

    const listSql = `
      ${BASE_SELECT_SQL}
      WHERE cr.userId = ?
      ORDER BY cr.createdAt DESC
      LIMIT ? OFFSET ?
    `

    const list = db.prepare(listSql).all(userId, pageSizeNum, offset) as CheckinRecord[]

    logger.info(`User ${userId} fetched my checkins, page ${pageNum}, ${list.length} records`)

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
    logger.error(`My checkins fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const id = parseInt(req.params.id)

    if (isNaN(id)) {
      res.status(400).json({
        code: -1,
        message: 'Invalid checkin ID',
        data: null,
      })
      return
    }

    const sql = `
      ${BASE_SELECT_SQL}
      WHERE cr.id = ?
    `

    const record = db.prepare(sql).get(id) as CheckinRecord | undefined

    if (!record) {
      res.status(404).json({
        code: -1,
        message: 'Checkin record not found',
        data: null,
      })
      return
    }

    logger.info(`Fetched checkin detail, ID: ${id}`)

    res.json({
      code: 0,
      message: 'success',
      data: record,
    })
  } catch (error) {
    logger.error(`Checkin detail fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

export default router
