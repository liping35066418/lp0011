import { Router, type Request, type Response } from 'express'
import db from '../db/init.js'
import logger from '../middleware/logger.js'
import { authenticateToken, getUserIdFromRequest } from './auth.js'
import type { BorrowRecord, BorrowStatusSummary, Book } from '../../shared/types.js'

const router = Router()

function checkOverdue(): number {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const tx = db.transaction(() => {
    const result = db
      .prepare(
        "UPDATE borrow_records SET status = 'overdue' WHERE status IN ('borrowing', 'renewed') AND dueDate < ?"
      )
      .run(todayStr)
    return result.changes
  })

  const updatedCount = tx()
  if (updatedCount > 0) {
    logger.info(`Overdue check completed, updated ${updatedCount} records marked as overdue`)
  }
  return updatedCount
}

interface AuthRequest extends Request {
  userId?: number
  userRole?: string
}

router.post('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { bookId } = req.body as { bookId: number }
    const userId = getUserIdFromRequest(req)

    if (!bookId) {
      res.status(400).json({
        code: -1,
        message: 'Book ID is required',
        data: null,
      })
      return
    }

    checkOverdue()

    const tx = db.transaction(() => {
      const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId) as Book | undefined
      if (!book) {
        return { errorCode: 404, message: 'Book not found' }
      }

      if (book.availableStock <= 0) {
        return { errorCode: 400, message: 'No available stock' }
      }

      const rules = db.prepare('SELECT * FROM borrow_rules ORDER BY id DESC LIMIT 1').get() as {
        maxBorrowDays: number
        maxBorrowCount: number
      }

      const borrowingCount = db
        .prepare("SELECT COUNT(*) as count FROM borrow_records WHERE userId = ? AND status IN ('borrowing', 'overdue', 'renewed')")
        .get(userId) as { count: number }

      if (borrowingCount.count >= rules.maxBorrowCount) {
        return {
          errorCode: 400,
          message: `Maximum borrow count (${rules.maxBorrowCount}) reached`,
        }
      }

      const today = new Date()
      const borrowDate = today.toISOString().split('T')[0]
      const dueDate = new Date(today)
      dueDate.setDate(dueDate.getDate() + rules.maxBorrowDays)
      const dueDateStr = dueDate.toISOString().split('T')[0]

      const stmt = db.prepare(
        'INSERT INTO borrow_records (userId, bookId, borrowDate, dueDate, returnDate, renewCount, status) VALUES (?, ?, ?, ?, NULL, 0, ?)'
      )
      const result = stmt.run(userId, bookId, borrowDate, dueDateStr, 'borrowing')
      const recordId = result.lastInsertRowid

      db.prepare('UPDATE books SET availableStock = availableStock - 1, borrowCount = borrowCount + 1 WHERE id = ?').run(bookId)

      const recordSql = `
        SELECT br.*, b.title as bookTitle, b.cover as bookCover
        FROM borrow_records br
        LEFT JOIN books b ON br.bookId = b.id
        WHERE br.id = ?
      `
      const record = db.prepare(recordSql).get(recordId) as BorrowRecord

      return { errorCode: 0, message: 'Borrow success', data: record }
    })

    const result = tx()

    if (result.errorCode !== 0) {
      res.status(result.errorCode).json({
        code: -1,
        message: result.message,
        data: null,
      })
      return
    }

    logger.info(`User ${userId} borrowed book ${bookId}, record ID: ${(result.data as BorrowRecord).id}`)

    res.json({
      code: 0,
      message: result.message,
      data: result.data,
    })
  } catch (error) {
    logger.error(`Borrow error: ${error instanceof Error ? error.message : 'Unknown error'}`, { userId: req.userId })
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

router.get('/my', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const userId = getUserIdFromRequest(req)
    const status = req.query.status as string | undefined

    checkOverdue()

    const conditions: string[] = ['br.userId = ?']
    const params: (string | number)[] = [userId]

    if (status) {
      conditions.push('br.status = ?')
      params.push(status)
    }

    const whereClause = conditions.join(' AND ')

    const sql = `
      SELECT br.*, b.title as bookTitle, b.cover as bookCover
      FROM borrow_records br
      LEFT JOIN books b ON br.bookId = b.id
      WHERE ${whereClause}
      ORDER BY br.borrowDate DESC
    `

    const tx = db.transaction(() => {
      return db.prepare(sql).all(...params) as BorrowRecord[]
    })

    const records = tx()

    logger.info(`User ${userId} fetched their borrow records, count: ${records.length}`)

    res.json({
      code: 0,
      message: 'success',
      data: records,
    })
  } catch (error) {
    logger.error(`Get my borrow records error: ${error instanceof Error ? error.message : 'Unknown error'}`, { userId: req.userId })
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

router.put('/:id/renew', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const id = parseInt(req.params.id)
    const userId = getUserIdFromRequest(req)

    if (isNaN(id)) {
      res.status(400).json({
        code: -1,
        message: 'Invalid record ID',
        data: null,
      })
      return
    }

    checkOverdue()

    const tx = db.transaction(() => {
      const record = db.prepare('SELECT * FROM borrow_records WHERE id = ? AND userId = ?').get(id, userId) as BorrowRecord | undefined

      if (!record) {
        return { errorCode: 404, message: 'Borrow record not found' }
      }

      if (record.status === 'returned') {
        return { errorCode: 400, message: 'Cannot renew a returned book' }
      }

      if (record.status === 'overdue') {
        return { errorCode: 400, message: 'Cannot renew an overdue book' }
      }

      const rules = db.prepare('SELECT * FROM borrow_rules ORDER BY id DESC LIMIT 1').get() as {
        maxBorrowDays: number
        maxRenewTimes: number
      }

      if (record.renewCount >= rules.maxRenewTimes) {
        return { errorCode: 400, message: `Maximum renew times (${rules.maxRenewTimes}) reached` }
      }

      const currentDueDate = new Date(record.dueDate)
      currentDueDate.setDate(currentDueDate.getDate() + rules.maxBorrowDays)
      const newDueDateStr = currentDueDate.toISOString().split('T')[0]

      db.prepare(
        'UPDATE borrow_records SET dueDate = ?, renewCount = renewCount + 1, status = ? WHERE id = ?'
      ).run(newDueDateStr, 'renewed', id)

      const recordSql = `
        SELECT br.*, b.title as bookTitle, b.cover as bookCover
        FROM borrow_records br
        LEFT JOIN books b ON br.bookId = b.id
        WHERE br.id = ?
      `
      const updatedRecord = db.prepare(recordSql).get(id) as BorrowRecord

      return { errorCode: 0, message: 'Renew success', data: updatedRecord }
    })

    const result = tx()

    if (result.errorCode !== 0) {
      res.status(result.errorCode).json({
        code: -1,
        message: result.message,
        data: null,
      })
      return
    }

    logger.info(`User ${userId} renewed borrow record ${id}`)

    res.json({
      code: 0,
      message: result.message,
      data: result.data,
    })
  } catch (error) {
    logger.error(`Renew error: ${error instanceof Error ? error.message : 'Unknown error'}`, { userId: req.userId, recordId: req.params.id })
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

router.get('/status', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const userId = getUserIdFromRequest(req)

    checkOverdue()

    const tx = db.transaction(() => {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const soonDate = new Date(today)
      soonDate.setDate(soonDate.getDate() + 3)
      const soonDateStr = soonDate.toISOString().split('T')[0]

      const { total } = db
        .prepare('SELECT COUNT(*) as total FROM borrow_records WHERE userId = ?')
        .get(userId) as { total: number }

      const { borrowing } = db
        .prepare("SELECT COUNT(*) as borrowing FROM borrow_records WHERE userId = ? AND status IN ('borrowing', 'renewed')")
        .get(userId) as { borrowing: number }

      const { overdue } = db
        .prepare("SELECT COUNT(*) as overdue FROM borrow_records WHERE userId = ? AND status = 'overdue'")
        .get(userId) as { overdue: number }

      const { willDueSoon } = db
        .prepare(
          "SELECT COUNT(*) as willDueSoon FROM borrow_records WHERE userId = ? AND status IN ('borrowing', 'renewed') AND dueDate >= ? AND dueDate <= ?"
        )
        .get(userId, todayStr, soonDateStr) as { willDueSoon: number }

      const summary: BorrowStatusSummary = {
        total,
        borrowing,
        overdue,
        willDueSoon,
      }

      return summary
    })

    const summary = tx()

    logger.info(`User ${userId} fetched borrow status summary`)

    res.json({
      code: 0,
      message: 'success',
      data: summary,
    })
  } catch (error) {
    logger.error(`Get borrow status error: ${error instanceof Error ? error.message : 'Unknown error'}`, { userId: req.userId })
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

router.put('/:id/return', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const id = parseInt(req.params.id)
    const userId = getUserIdFromRequest(req)

    if (isNaN(id)) {
      res.status(400).json({
        code: -1,
        message: 'Invalid record ID',
        data: null,
      })
      return
    }

    checkOverdue()

    const tx = db.transaction(() => {
      const record = db.prepare('SELECT * FROM borrow_records WHERE id = ? AND userId = ?').get(id, userId) as (BorrowRecord & { bookId: number }) | undefined

      if (!record) {
        return { errorCode: 404, message: 'Borrow record not found' }
      }

      if (record.status === 'returned') {
        return { errorCode: 400, message: 'Book already returned' }
      }

      const today = new Date()
      const returnDateStr = today.toISOString().split('T')[0]

      db.prepare(
        "UPDATE borrow_records SET returnDate = ?, status = 'returned' WHERE id = ?"
      ).run(returnDateStr, id)

      db.prepare('UPDATE books SET availableStock = availableStock + 1 WHERE id = ?').run(record.bookId)

      const recordSql = `
        SELECT br.*, b.title as bookTitle, b.cover as bookCover
        FROM borrow_records br
        LEFT JOIN books b ON br.bookId = b.id
        WHERE br.id = ?
      `
      const updatedRecord = db.prepare(recordSql).get(id) as BorrowRecord

      return { errorCode: 0, message: 'Return success', data: updatedRecord }
    })

    const result = tx()

    if (result.errorCode !== 0) {
      res.status(result.errorCode).json({
        code: -1,
        message: result.message,
        data: null,
      })
      return
    }

    logger.info(`User ${userId} returned book, record ID: ${id}`)

    res.json({
      code: 0,
      message: result.message,
      data: result.data,
    })
  } catch (error) {
    logger.error(`Return error: ${error instanceof Error ? error.message : 'Unknown error'}`, { userId: req.userId, recordId: req.params.id })
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

router.get('/check-overdue', (_req: Request, res: Response): void => {
  try {
    const tx = db.transaction(() => {
      return checkOverdue()
    })

    const updatedCount = tx()

    logger.info(`Manual overdue check completed, ${updatedCount} records updated`)

    res.json({
      code: 0,
      message: 'Overdue check completed',
      data: { updatedCount },
    })
  } catch (error) {
    logger.error(`Check overdue error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

export default router
