import { Router, type Request, type Response } from 'express'
import db from '../db/init.js'
import logger from '../middleware/logger.js'
import { authenticateToken, getUserIdFromRequest } from './auth.js'
import type { Book, PagedResponse } from '../../shared/types.js'

const router = Router()

interface BookQuery {
  keyword?: string
  categoryId?: number
  page?: string
  pageSize?: string
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const { keyword, categoryId, page = '1', pageSize = '10' } = req.query as BookQuery

    const pageNum = Math.max(1, parseInt(page))
    const pageSizeNum = Math.max(1, parseInt(pageSize))
    const offset = (pageNum - 1) * pageSizeNum

    const conditions: string[] = []
    const params: (string | number)[] = []

    if (keyword) {
      conditions.push('(b.title LIKE ? OR b.author LIKE ? OR b.summary LIKE ?')
      const kw = `%${keyword}%`
      params.push(kw, kw, kw)
    }

    if (categoryId) {
      const catId = parseInt(categoryId as unknown as string)
      if (!isNaN(catId)) {
        conditions.push('(b.categoryId = ? OR c.parentId = ?)')
        params.push(catId, catId)
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const countSql = `
      SELECT COUNT(*) as total
      FROM books b
      LEFT JOIN categories c ON b.categoryId = c.id
      ${whereClause}
    `
    const { total } = db.prepare(countSql).get(...params) as { total: number }

    const listSql = `
      SELECT b.*, c.name as categoryName
      FROM books b
      LEFT JOIN categories c ON b.categoryId = c.id
      ${whereClause}
      ORDER BY b.createdAt DESC
      LIMIT ? OFFSET ?
    `
    params.push(pageSizeNum, offset)
    const list = db.prepare(listSql).all(...params) as Book[]

    const result: PagedResponse<Book> = {
      list,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    }

    res.json({
      code: 0,
      message: 'success',
      data: result,
    })
  } catch (error) {
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

router.get('/new', (_req: Request, res: Response): void => {
  try {
    const sql = `
      SELECT b.*, c.name as categoryName
      FROM books b
      LEFT JOIN categories c ON b.categoryId = c.id
      ORDER BY b.createdAt DESC
      LIMIT 10
    `
    const books = db.prepare(sql).all() as Book[]

    res.json({
      code: 0,
      message: 'success',
      data: books,
    })
  } catch (error) {
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

router.get('/hot', (_req: Request, res: Response): void => {
  try {
    const sql = `
      SELECT b.*, c.name as categoryName
      FROM books b
      LEFT JOIN categories c ON b.categoryId = c.id
      ORDER BY b.borrowCount DESC
      LIMIT 8
    `
    const books = db.prepare(sql).all() as Book[]

    res.json({
      code: 0,
      message: 'success',
      data: books,
    })
  } catch (error) {
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
        message: 'Invalid book ID',
        data: null,
      })
      return
    }

    const sql = `
      SELECT b.*, c.name as categoryName
      FROM books b
      LEFT JOIN categories c ON b.categoryId = c.id
      WHERE b.id = ?
    `
    const book = db.prepare(sql).get(id) as Book | undefined

    if (!book) {
      res.status(404).json({
        code: -1,
        message: 'Book not found',
        data: null,
      })
      return
    }

    res.json({
      code: 0,
      message: 'success',
      data: book,
    })
  } catch (error) {
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

interface CreateBookBody {
  title: string
  author: string
  cover: string
  isbn: string
  categoryId: number
  publisher: string
  publishDate: string
  summary: string
  catalog: string
  totalStock: number
}

router.post('/', authenticateToken, (req: Request & { userId?: number }, res: Response): void => {
  try {
    const { title, author, cover, isbn, categoryId, publisher, publishDate, summary, catalog, totalStock } = req.body as CreateBookBody

    if (!title || !author || !cover || !isbn || !categoryId || !publisher || !publishDate || !summary || !catalog) {
      res.status(400).json({
        code: -1,
        message: '必填字段不能为空',
        data: null,
      })
      return
    }

    const stock = totalStock && totalStock > 0 ? totalStock : 1

    const existingIsbn = db.prepare('SELECT id FROM books WHERE isbn = ?').get(isbn) as { id: number } | undefined
    if (existingIsbn) {
      res.status(400).json({
        code: -1,
        message: 'ISBN已存在',
        data: null,
      })
      return
    }

    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId) as { id: number } | undefined
    if (!category) {
      res.status(400).json({
        code: -1,
        message: '分类不存在',
        data: null,
      })
      return
    }

    const stmt = db.prepare(
      'INSERT INTO books (title, author, cover, isbn, categoryId, publisher, publishDate, summary, catalog, totalStock, availableStock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const result = stmt.run(title, author, cover, isbn, categoryId, publisher, publishDate, summary, catalog, stock, stock)

    const book = db.prepare(
      'SELECT b.*, c.name as categoryName FROM books b LEFT JOIN categories c ON b.categoryId = c.id WHERE b.id = ?'
    ).get(result.lastInsertRowid) as Book

    const userId = getUserIdFromRequest(req)
    logger.info(`Book created: ${title} (ID: ${book.id}) by user ID: ${userId}`)

    res.status(201).json({
      code: 0,
      message: '图书入库成功',
      data: book,
    })
  } catch (error) {
    logger.error(`Create book error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : '服务器错误',
      data: null,
    })
  }
})

interface UpdateBookBody {
  title?: string
  author?: string
  cover?: string
  isbn?: string
  categoryId?: number
  publisher?: string
  publishDate?: string
  summary?: string
  catalog?: string
}

router.put('/:id', authenticateToken, (req: Request & { userId?: number }, res: Response): void => {
  try {
    const id = parseInt(req.params.id)

    if (isNaN(id)) {
      res.status(400).json({
        code: -1,
        message: '无效的图书ID',
        data: null,
      })
      return
    }

    const existingBook = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as Book | undefined
    if (!existingBook) {
      res.status(404).json({
        code: -1,
        message: '图书不存在',
        data: null,
      })
      return
    }

    const body = req.body as UpdateBookBody
    const fields: string[] = []
    const params: (string | number)[] = []

    if (body.title !== undefined) {
      fields.push('title = ?')
      params.push(body.title)
    }
    if (body.author !== undefined) {
      fields.push('author = ?')
      params.push(body.author)
    }
    if (body.cover !== undefined) {
      fields.push('cover = ?')
      params.push(body.cover)
    }
    if (body.isbn !== undefined) {
      const duplicateIsbn = db.prepare('SELECT id FROM books WHERE isbn = ? AND id != ?').get(body.isbn, id) as { id: number } | undefined
      if (duplicateIsbn) {
        res.status(400).json({
          code: -1,
          message: 'ISBN已存在',
          data: null,
        })
        return
      }
      fields.push('isbn = ?')
      params.push(body.isbn)
    }
    if (body.categoryId !== undefined) {
      const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(body.categoryId) as { id: number } | undefined
      if (!category) {
        res.status(400).json({
          code: -1,
          message: '分类不存在',
          data: null,
        })
        return
      }
      fields.push('categoryId = ?')
      params.push(body.categoryId)
    }
    if (body.publisher !== undefined) {
      fields.push('publisher = ?')
      params.push(body.publisher)
    }
    if (body.publishDate !== undefined) {
      fields.push('publishDate = ?')
      params.push(body.publishDate)
    }
    if (body.summary !== undefined) {
      fields.push('summary = ?')
      params.push(body.summary)
    }
    if (body.catalog !== undefined) {
      fields.push('catalog = ?')
      params.push(body.catalog)
    }

    if (fields.length === 0) {
      res.status(400).json({
        code: -1,
        message: '没有需要更新的字段',
        data: null,
      })
      return
    }

    params.push(id)
    const sql = `UPDATE books SET ${fields.join(', ')} WHERE id = ?`
    db.prepare(sql).run(...params)

    const book = db.prepare(
      'SELECT b.*, c.name as categoryName FROM books b LEFT JOIN categories c ON b.categoryId = c.id WHERE b.id = ?'
    ).get(id) as Book

    const userId = getUserIdFromRequest(req)
    logger.info(`Book updated: ${book.title} (ID: ${id}) by user ID: ${userId}`)

    res.json({
      code: 0,
      message: '图书信息更新成功',
      data: book,
    })
  } catch (error) {
    logger.error(`Update book error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : '服务器错误',
      data: null,
    })
  }
})

router.delete('/:id', authenticateToken, (req: Request & { userId?: number }, res: Response): void => {
  try {
    const id = parseInt(req.params.id)

    if (isNaN(id)) {
      res.status(400).json({
        code: -1,
        message: '无效的图书ID',
        data: null,
      })
      return
    }

    const existingBook = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as Book | undefined
    if (!existingBook) {
      res.status(404).json({
        code: -1,
        message: '图书不存在',
        data: null,
      })
      return
    }

    const borrowingCount = db.prepare(
      "SELECT COUNT(*) as count FROM borrow_records WHERE bookId = ? AND status IN ('borrowing', 'overdue', 'renewed')"
    ).get(id) as { count: number }

    if (borrowingCount.count > 0) {
      res.status(400).json({
        code: -1,
        message: `该图书存在 ${borrowingCount.count} 条未归还的借阅记录，无法删除`,
        data: null,
      })
      return
    }

    const userId = getUserIdFromRequest(req)
    const bookTitle = existingBook.title

    db.prepare('DELETE FROM books WHERE id = ?').run(id)

    logger.info(`Book deleted: ${bookTitle} (ID: ${id}) by user ID: ${userId}`)

    res.json({
      code: 0,
      message: '图书删除成功',
      data: null,
    })
  } catch (error) {
    logger.error(`Delete book error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : '服务器错误',
      data: null,
    })
  }
})

interface RestockBody {
  quantity: number
}

router.post('/:id/restock', authenticateToken, (req: Request & { userId?: number }, res: Response): void => {
  try {
    const id = parseInt(req.params.id)
    const { quantity } = req.body as RestockBody

    if (isNaN(id)) {
      res.status(400).json({
        code: -1,
        message: '无效的图书ID',
        data: null,
      })
      return
    }

    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
      res.status(400).json({
        code: -1,
        message: '补库数量必须为正整数',
        data: null,
      })
      return
    }

    const existingBook = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as Book | undefined
    if (!existingBook) {
      res.status(404).json({
        code: -1,
        message: '图书不存在',
        data: null,
      })
      return
    }

    db.prepare(
      'UPDATE books SET totalStock = totalStock + ?, availableStock = availableStock + ? WHERE id = ?'
    ).run(quantity, quantity, id)

    const book = db.prepare(
      'SELECT b.*, c.name as categoryName FROM books b LEFT JOIN categories c ON b.categoryId = c.id WHERE b.id = ?'
    ).get(id) as Book

    const userId = getUserIdFromRequest(req)
    logger.info(`Book restocked: ${book.title} (ID: ${id}) +${quantity} by user ID: ${userId}`)

    res.json({
      code: 0,
      message: `补库成功，新增库存 ${quantity} 本`,
      data: book,
    })
  } catch (error) {
    logger.error(`Restock book error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : '服务器错误',
      data: null,
    })
  }
})

export default router
