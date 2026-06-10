import { Router, type Request, type Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import db from '../db/init.js'
import logger from '../middleware/logger.js'
import type { User } from '../../shared/types.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'library-secret-key-2026'
const JWT_EXPIRES_IN = '7d'

interface LoginBody {
  username: string
  password: string
}

interface RegisterBody {
  username: string
  password: string
  nickname: string
}

export function authenticateToken(req: Request & { userId?: number; userRole?: string }, res: Response, next: () => void): void {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    res.status(401).json({
      code: 401,
      message: '未登录，请先登录',
      data: null,
    })
    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string }
    req.userId = decoded.id
    req.userRole = decoded.role
    next()
  } catch (error) {
    res.status(403).json({
      code: 403,
      message: '登录已过期，请重新登录',
      data: null,
    })
  }
}

export function getUserIdFromRequest(req: Request & { userId?: number }): number {
  return req.userId || 1
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, nickname } = req.body as RegisterBody

    if (!username || !password) {
      res.status(400).json({
        code: -1,
        message: '用户名和密码不能为空',
        data: null,
      })
      return
    }

    if (username.length < 3 || password.length < 6) {
      res.status(400).json({
        code: -1,
        message: '用户名至少3位，密码至少6位',
        data: null,
      })
      return
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: number } | undefined

    if (existingUser) {
      res.status(400).json({
        code: -1,
        message: '用户名已存在',
        data: null,
      })
      return
    }

    const hashedPassword = bcrypt.hashSync(password, 10)
    const displayNickname = nickname || username
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`

    const stmt = db.prepare(
      'INSERT INTO users (username, password, nickname, avatar, role) VALUES (?, ?, ?, ?, ?)'
    )
    const result = stmt.run(username, hashedPassword, displayNickname, avatar, 'user')

    const user = db.prepare('SELECT id, username, nickname, avatar, role FROM users WHERE id = ?').get(result.lastInsertRowid) as User
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    logger.info(`User registered: ${username} (ID: ${user.id})`)

    res.status(201).json({
      code: 0,
      message: '注册成功',
      data: {
        user,
        token,
      },
    })
  } catch (error) {
    logger.error(`Register error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : '服务器错误',
      data: null,
    })
  }
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body as LoginBody

    if (!username || !password) {
      res.status(400).json({
        code: -1,
        message: '用户名和密码不能为空',
        data: null,
      })
      return
    }

    const userRow = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as (User & { password?: string }) | undefined

    if (!userRow) {
      res.status(401).json({
        code: -1,
        message: '用户名或密码错误',
        data: null,
      })
      return
    }

    const passwordValid = bcrypt.compareSync(password, userRow.password || '')

    if (!passwordValid) {
      res.status(401).json({
        code: -1,
        message: '用户名或密码错误',
        data: null,
      })
      return
    }

    const token = jwt.sign({ id: userRow.id, role: userRow.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })

    const { password: _password, ...userWithoutPassword } = userRow
    const user: User = userWithoutPassword as User

    logger.info(`User logged in: ${username} (ID: ${user.id})`)

    res.json({
      code: 0,
      message: '登录成功',
      data: {
        user,
        token,
      },
    })
  } catch (error) {
    logger.error(`Login error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : '服务器错误',
      data: null,
    })
  }
})

router.get('/me', authenticateToken, (req: Request & { userId?: number }, res: Response): void => {
  try {
    const userId = getUserIdFromRequest(req)
    const user = db.prepare('SELECT id, username, nickname, avatar, role FROM users WHERE id = ?').get(userId) as User | undefined

    if (!user) {
      res.status(404).json({
        code: -1,
        message: '用户不存在',
        data: null,
      })
      return
    }

    res.json({
      code: 0,
      message: 'success',
      data: user,
    })
  } catch (error) {
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : '服务器错误',
      data: null,
    })
  }
})

router.post('/logout', (_req: Request, res: Response): void => {
  res.json({
    code: 0,
    message: '退出登录成功',
    data: null,
  })
})

export default router
