import winston from 'winston'
import path from 'path'
import { fileURLToPath } from 'url'
import { type Request, type Response, type NextFunction } from 'express'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const logDir = path.join(__dirname, '..', '..', 'logs')

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      maxsize: 5242880,
      maxFiles: 10,
    }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, ...meta }) =>
            `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`
        )
      ),
    })
  )
}

export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startAt = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startAt
    const logMessage = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`

    if (res.statusCode >= 500) {
      logger.error(logMessage, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        body: req.method !== 'GET' ? req.body : undefined,
      })
    } else if (res.statusCode >= 400) {
      logger.warn(logMessage, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })
    } else {
      logger.info(logMessage, {
        ip: req.ip,
      })
    }
  })

  next()
}

export default logger
