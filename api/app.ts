/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { initDatabase } from './db/init.js'
import { loggerMiddleware, default as logger } from './middleware/logger.js'

import authRoutes from './routes/auth.js'
import bookRoutes from './routes/books.js'
import borrowRoutes from './routes/borrow.js'
import categoryRoutes from './routes/categories.js'
import checkinRoutes from './routes/checkin.js'
import adminRoutes from './routes/admin.js'

initDatabase()
logger.info('Database initialized successfully')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(loggerMiddleware)

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.url} - Request received`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  })
  next()
})

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/books', bookRoutes)
app.use('/api/borrow', borrowRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/checkin', checkinRoutes)
app.use('/api/admin', adminRoutes)

/**
 * health
 */
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
      timestamp: new Date().toISOString(),
    })
  },
)

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled error: ${error.message}`, {
    stack: error.stack,
    url: req.url,
    method: req.method,
  })
  res.status(500).json({
    success: false,
    code: -1,
    message: 'Server internal error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  logger.warn(`API not found: ${req.method} ${req.url}`)
  res.status(404).json({
    success: false,
    code: 404,
    message: 'API not found',
  })
})

export default app
