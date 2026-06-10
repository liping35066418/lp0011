import { Router, type Request, type Response } from 'express'
import db from '../db/init.js'
import type { Category } from '../../shared/types.js'

const router = Router()

router.get('/', (_req: Request, res: Response): void => {
  try {
    const sql = 'SELECT * FROM categories ORDER BY level, id'
    const categories = db.prepare(sql).all() as Category[]

    const categoryMap = new Map<number, Category & { children?: Category[] }>()
    const rootCategories: (Category & { children?: Category[] })[] = []

    for (const cat of categories) {
      categoryMap.set(cat.id, { ...cat, children: [] })
    }

    for (const cat of categories) {
      const mappedCat = categoryMap.get(cat.id)!
      if (cat.parentId === 0) {
        rootCategories.push(mappedCat)
      } else {
        const parent = categoryMap.get(cat.parentId)
        if (parent && parent.children) {
          parent.children.push(mappedCat)
        } else {
          rootCategories.push(mappedCat)
        }
      }
    }

    res.json({
      code: 0,
      message: 'success',
      data: rootCategories,
    })
  } catch (error) {
    res.status(500).json({
      code: -1,
      message: error instanceof Error ? error.message : 'Server error',
      data: null,
    })
  }
})

export default router
