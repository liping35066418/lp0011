import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import logger from '../middleware/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, '..', '..', 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const logDir = path.join(__dirname, '..', '..', 'logs')
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'library.db')
const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

function migrateTables(): void {
  const columns = db
    .prepare("PRAGMA table_info(users)")
    .all() as { name: string }[];
  const hasBalance = columns.some((c) => c.name === "balance");
  if (!hasBalance) {
    db.exec("ALTER TABLE users ADD COLUMN balance REAL NOT NULL DEFAULT 100.0");
    logger.info("Migrated: added balance column to users table");
  }
}

function createTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      parentId INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      cover TEXT NOT NULL,
      isbn TEXT UNIQUE,
      categoryId INTEGER NOT NULL,
      publisher TEXT NOT NULL,
      publishDate TEXT NOT NULL,
      summary TEXT NOT NULL,
      catalog TEXT NOT NULL,
      totalStock INTEGER NOT NULL DEFAULT 1,
      availableStock INTEGER NOT NULL DEFAULT 1,
      borrowCount INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      nickname TEXT NOT NULL,
      avatar TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      balance REAL NOT NULL DEFAULT 100.0,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS borrow_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      bookId INTEGER NOT NULL,
      borrowDate TEXT NOT NULL,
      dueDate TEXT NOT NULL,
      returnDate TEXT,
      renewCount INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'borrowing',
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (bookId) REFERENCES books(id)
    );

    CREATE TABLE IF NOT EXISTS checkin_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      bookId INTEGER NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      note TEXT NOT NULL,
      likes INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (bookId) REFERENCES books(id)
    );

    CREATE TABLE IF NOT EXISTS borrow_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      maxBorrowDays INTEGER NOT NULL DEFAULT 30,
      maxRenewTimes INTEGER NOT NULL DEFAULT 1,
      maxBorrowCount INTEGER NOT NULL DEFAULT 5,
      overdueFinePerDay REAL NOT NULL DEFAULT 0.5
    );
  `);
  migrateTables();
}

function seedCategories(): void {
  const count = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number }
  if (count.count > 0) return

  const categories = [
    { name: '文学小说', parentId: 0, level: 1 },
    { name: '中国文学', parentId: 1, level: 2 },
    { name: '外国文学', parentId: 1, level: 2 },
    { name: '计算机科学', parentId: 0, level: 1 },
    { name: '编程语言', parentId: 4, level: 2 },
    { name: '人工智能', parentId: 4, level: 2 },
    { name: '历史传记', parentId: 0, level: 1 },
    { name: '经济管理', parentId: 0, level: 1 },
    { name: '心理学', parentId: 0, level: 1 },
    { name: '科学技术', parentId: 0, level: 1 },
  ]

  const stmt = db.prepare('INSERT INTO categories (name, parentId, level) VALUES (?, ?, ?)')
  const tx = db.transaction((cats) => {
    for (const cat of cats) {
      stmt.run(cat.name, cat.parentId, cat.level)
    }
  })
  tx(categories)
}

function seedBooks(): void {
  const count = db.prepare('SELECT COUNT(*) as count FROM books').get() as { count: number }
  if (count.count > 0) return

  const covers = [
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=600&fit=crop',
    'https://images.unsplash.com/photo-1515098506762-79e1384e9d8e?w=400&h=600&fit=crop',
  ]

  const books = [
    { title: '活着', author: '余华', cover: covers[0], isbn: '9787506365437', categoryId: 2, publisher: '作家出版社', publishDate: '2012-08-01', summary: '讲述了农村人福贵悲惨的人生遭遇。福贵本是个阔少爷，可他嗜赌如命，终于赌光了家业，一贫如洗。', catalog: '第一章 福贵\n第二章 家珍\n第三章 有庆', totalStock: 5, availableStock: 3, borrowCount: 28 },
    { title: '三体', author: '刘慈欣', cover: covers[1], isbn: '9787536692930', categoryId: 10, publisher: '重庆出版社', publishDate: '2008-01-01', summary: '文化大革命如火如荼进行的同时，军方探寻外星文明的绝秘计划"红岸工程"取得了突破性进展。', catalog: '第一部 三体\n第二部 黑暗森林\n第三部 死神永生', totalStock: 8, availableStock: 5, borrowCount: 45 },
    { title: '百年孤独', author: '加西亚·马尔克斯', cover: covers[2], isbn: '9787544291170', categoryId: 3, publisher: '南海出版公司', publishDate: '2017-08-01', summary: '《百年孤独》是魔幻现实主义文学的代表作，描写了布恩迪亚家族七代人的传奇故事。', catalog: '第一章\n第二章\n第三章', totalStock: 4, availableStock: 2, borrowCount: 35 },
    { title: 'JavaScript高级程序设计', author: 'Nicholas C. Zakas', cover: covers[3], isbn: '9787115545381', categoryId: 5, publisher: '人民邮电出版社', publishDate: '2020-10-01', summary: 'JavaScript是Web开发中最重要的一门编程语言，被广泛用于Web应用开发。', catalog: '第1章 什么是JavaScript\n第2章 HTML中的JavaScript\n第3章 语言基础', totalStock: 6, availableStock: 4, borrowCount: 52 },
    { title: '深入理解计算机系统', author: 'Randal E. Bryant', cover: covers[4], isbn: '9787111544937', categoryId: 4, publisher: '机械工业出版社', publishDate: '2016-11-01', summary: '本书从程序员的视角详细阐述计算机系统的本质概念。', catalog: '第1章 计算机系统漫游\n第2章 信息的表示和处理', totalStock: 3, availableStock: 1, borrowCount: 38 },
    { title: '人类简史', author: '尤瓦尔·赫拉利', cover: covers[5], isbn: '9787508647357', categoryId: 7, publisher: '中信出版社', publishDate: '2014-11-01', summary: '十万年前，地球上至少有六种不同的人，但今日，世界舞台为什么只剩下了我们自己？', catalog: '第一部分 认知革命\n第二部分 农业革命', totalStock: 7, availableStock: 6, borrowCount: 60 },
    { title: '明朝那些事儿', author: '当年明月', cover: covers[6], isbn: '9787213046438', categoryId: 7, publisher: '浙江人民出版社', publishDate: '2011-06-01', summary: '《明朝那些事儿》主要讲述的是从1344年到1644年这三百年间关于明朝的一些事情。', catalog: '第一部 洪武大帝\n第二部 万国来朝', totalStock: 10, availableStock: 8, borrowCount: 67 },
    { title: '原则', author: '瑞·达利欧', cover: covers[7], isbn: '9787508683805', categoryId: 8, publisher: '中信出版社', publishDate: '2018-01-01', summary: '瑞·达利欧分享了他的生活和工作原则，这些原则帮助他创建了世界上最大的对冲基金。', catalog: '第一部分 我的历程\n第二部分 生活原则', totalStock: 5, availableStock: 3, borrowCount: 25 },
    { title: '思考，快与慢', author: '丹尼尔·卡尼曼', cover: covers[8], isbn: '9787508633558', categoryId: 9, publisher: '中信出版社', publishDate: '2012-07-01', summary: '诺贝尔经济学奖得主丹尼尔·卡尼曼力作，探讨大脑的两套思考系统。', catalog: '第一部分 系统1，系统2\n第二部分 启发法与偏见', totalStock: 4, availableStock: 2, borrowCount: 32 },
    { title: '深度学习', author: 'Ian Goodfellow', cover: covers[9], isbn: '9787115461476', categoryId: 6, publisher: '人民邮电出版社', publishDate: '2017-08-01', summary: '深度学习领域奠基性的经典教材，由三位顶尖专家撰写。', catalog: '第一部分 应用数学与机器学习基础\n第二部分 深度网络', totalStock: 3, availableStock: 1, borrowCount: 20 },
    { title: '红楼梦', author: '曹雪芹', cover: covers[0], isbn: '9787020002207', categoryId: 2, publisher: '人民文学出版社', publishDate: '2008-07-01', summary: '中国古典四大名著之首，以贾宝玉、林黛玉、薛宝钗的爱情婚姻悲剧为主线。', catalog: '第一回 甄士隐梦幻识通灵\n第二回 贾夫人仙逝扬州城', totalStock: 6, availableStock: 4, borrowCount: 40 },
    { title: '围城', author: '钱钟书', cover: covers[1], isbn: '9787020090006', categoryId: 2, publisher: '人民文学出版社', publishDate: '2018-01-01', summary: '一部新的"儒林外史"，讽刺当时社会上的各种丑陋现象。', catalog: '第一章\n第二章\n第三章', totalStock: 5, availableStock: 4, borrowCount: 30 },
    { title: 'Python编程：从入门到实践', author: 'Eric Matthes', cover: covers[2], isbn: '9787115546081', categoryId: 5, publisher: '人民邮电出版社', publishDate: '2020-10-01', summary: 'Python入门经典教材，针对所有层次的Python读者。', catalog: '第一部分 基础知识\n第二部分 项目', totalStock: 8, availableStock: 6, borrowCount: 48 },
    { title: '统计学习方法', author: '李航', cover: covers[3], isbn: '9787302275954', categoryId: 6, publisher: '清华大学出版社', publishDate: '2012-03-01', summary: '统计机器学习领域的经典著作，全面系统地介绍了统计学习的主要方法。', catalog: '第1章 统计学习方法概论\n第2章 感知机', totalStock: 4, availableStock: 2, borrowCount: 28 },
    { title: '平凡的世界', author: '路遥', cover: covers[4], isbn: '9787530216781', categoryId: 2, publisher: '北京十月文艺出版社', publishDate: '2017-06-01', summary: '茅盾文学奖获奖作品，一部全景式地表现中国当代城乡社会生活的长篇小说。', catalog: '第一部\n第二部\n第三部', totalStock: 6, availableStock: 4, borrowCount: 35 },
    { title: '小王子', author: '安托万·德·圣-埃克苏佩里', cover: covers[5], isbn: '9787020042494', categoryId: 3, publisher: '人民文学出版社', publishDate: '2003-08-01', summary: '一本写给大人的童话，关于爱与责任的寓言故事。', catalog: '第一章\n第二章\n第三章', totalStock: 10, availableStock: 9, borrowCount: 55 },
    { title: '经济学原理', author: 'N.格里高利·曼昆', cover: covers[6], isbn: '9787301258743', categoryId: 8, publisher: '北京大学出版社', publishDate: '2015-06-01', summary: '经济学入门的经典教材，被称为经济学的"圣经"。', catalog: '第一篇 导言\n第二篇 市场如何运行', totalStock: 5, availableStock: 3, borrowCount: 22 },
    { title: '影响力', author: '罗伯特·西奥迪尼', cover: covers[7], isbn: '9787547012123', categoryId: 9, publisher: '万卷出版公司', publishDate: '2010-10-01', summary: '社会心理学领域的经典之作，揭示人们为什么会被说服。', catalog: '第一章 影响力的武器\n第二章 互惠', totalStock: 4, availableStock: 3, borrowCount: 26 },
    { title: '算法导论', author: 'Thomas H. Cormen', cover: covers[8], isbn: '9787111407010', categoryId: 4, publisher: '机械工业出版社', publishDate: '2013-01-01', summary: '计算机算法领域的圣经，全面覆盖算法理论。', catalog: '第一部分 基础知识\n第二部分 排序和顺序统计量', totalStock: 3, availableStock: 1, borrowCount: 18 },
    { title: '枪炮、病菌与钢铁', author: '贾雷德·戴蒙德', cover: covers[9], isbn: '9787544344401', categoryId: 7, publisher: '海南出版社', publishDate: '2014-01-01', summary: '探讨人类社会不平等的根源，为什么是欧洲人征服了美洲。', catalog: '前言 疑问\n第一章 起点', totalStock: 5, availableStock: 3, borrowCount: 30 },
  ]

  const stmt = db.prepare(
    'INSERT INTO books (title, author, cover, isbn, categoryId, publisher, publishDate, summary, catalog, totalStock, availableStock, borrowCount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const tx = db.transaction((bookList) => {
    for (const book of bookList) {
      stmt.run(
        book.title, book.author, book.cover, book.isbn, book.categoryId,
        book.publisher, book.publishDate, book.summary, book.catalog,
        book.totalStock, book.availableStock, book.borrowCount
      )
    }
  })
  tx(books)
}

function seedUsers(): void {
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  if (count.count > 0) return

  const hashedAdminPassword = bcrypt.hashSync('admin123', 10)
  const hashedUserPassword = bcrypt.hashSync('user123', 10)

  const users = [
    { username: 'admin', password: hashedAdminPassword, nickname: '系统管理员', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', role: 'admin' },
    { username: 'zhangsan', password: hashedUserPassword, nickname: '张三', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan', role: 'user' },
    { username: 'lisi', password: hashedUserPassword, nickname: '李四', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisi', role: 'user' },
    { username: 'wangwu', password: hashedUserPassword, nickname: '王五', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangwu', role: 'user' },
  ]

  const stmt = db.prepare('INSERT INTO users (username, password, nickname, avatar, role) VALUES (?, ?, ?, ?, ?)')
  const tx = db.transaction((userList) => {
    for (const user of userList) {
      stmt.run(user.username, user.password, user.nickname, user.avatar, user.role)
    }
  })
  tx(users)
}

function seedBorrowRecords(): void {
  const count = db.prepare('SELECT COUNT(*) as count FROM borrow_records').get() as { count: number }
  if (count.count > 0) return

  const today = new Date()
  const daysAgo = (days: number): string => {
    const d = new Date(today)
    d.setDate(d.getDate() - days)
    return d.toISOString().split('T')[0]
  }
  const daysLater = (days: number): string => {
    const d = new Date(today)
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }

  const records = [
    { userId: 1, bookId: 1, borrowDate: daysAgo(15), dueDate: daysLater(15), returnDate: null, renewCount: 0, status: 'borrowing' },
    { userId: 1, bookId: 3, borrowDate: daysAgo(25), dueDate: daysAgo(5), returnDate: null, renewCount: 0, status: 'overdue' },
    { userId: 1, bookId: 2, borrowDate: daysAgo(40), dueDate: daysAgo(10), returnDate: daysAgo(8), renewCount: 0, status: 'returned' },
    { userId: 2, bookId: 4, borrowDate: daysAgo(10), dueDate: daysLater(20), returnDate: null, renewCount: 1, status: 'renewed' },
    { userId: 2, bookId: 8, borrowDate: daysAgo(20), dueDate: daysLater(10), returnDate: null, renewCount: 0, status: 'borrowing' },
    { userId: 2, bookId: 6, borrowDate: daysAgo(50), dueDate: daysAgo(20), returnDate: daysAgo(15), renewCount: 1, status: 'returned' },
    { userId: 3, bookId: 5, borrowDate: daysAgo(5), dueDate: daysLater(25), returnDate: null, renewCount: 0, status: 'borrowing' },
    { userId: 3, bookId: 9, borrowDate: daysAgo(30), dueDate: daysAgo(2), returnDate: null, renewCount: 0, status: 'overdue' },
    { userId: 3, bookId: 11, borrowDate: daysAgo(60), dueDate: daysAgo(30), returnDate: daysAgo(25), renewCount: 0, status: 'returned' },
    { userId: 4, bookId: 14, borrowDate: daysAgo(8), dueDate: daysLater(22), returnDate: null, renewCount: 0, status: 'borrowing' },
    { userId: 4, bookId: 17, borrowDate: daysAgo(18), dueDate: daysLater(12), returnDate: null, renewCount: 0, status: 'borrowing' },
    { userId: 4, bookId: 13, borrowDate: daysAgo(35), dueDate: daysAgo(5), returnDate: daysAgo(3), renewCount: 0, status: 'returned' },
  ]

  const stmt = db.prepare(
    'INSERT INTO borrow_records (userId, bookId, borrowDate, dueDate, returnDate, renewCount, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const tx = db.transaction((recs) => {
    for (const rec of recs) {
      stmt.run(rec.userId, rec.bookId, rec.borrowDate, rec.dueDate, rec.returnDate, rec.renewCount, rec.status)
    }
  })
  tx(records)
}

function seedCheckinRecords(): void {
  const count = db.prepare('SELECT COUNT(*) as count FROM checkin_records').get() as { count: number }
  if (count.count > 0) return

  const today = new Date()
  const daysAgo = (days: number): string => {
    const d = new Date(today)
    d.setDate(d.getDate() - days)
    d.setHours(10 + days % 8, Math.floor(Math.random() * 60), 0)
    return d.toISOString()
  }

  const records = [
    { userId: 1, bookId: 1, progress: 60, note: '今天读到福贵失去所有亲人的段落，太感人了。活着本身就是意义。', likes: 24, status: 'approved', createdAt: daysAgo(0) },
    { userId: 2, bookId: 4, progress: 45, note: '终于搞懂了闭包和作用域链，JavaScript真的很精妙！', likes: 31, status: 'approved', createdAt: daysAgo(1) },
    { userId: 3, bookId: 5, progress: 78, note: '虚拟内存那章看完了，对计算机底层有了新的认识。', likes: 18, status: 'approved', createdAt: daysAgo(2) },
    { userId: 1, bookId: 3, progress: 90, note: '布恩迪亚家族的命运轮回，让人唏嘘不已。魔幻现实的巅峰之作。', likes: 42, status: 'approved', createdAt: daysAgo(3) },
    { userId: 4, bookId: 14, progress: 35, note: 'SVM的推导过程有点复杂，需要反复研读。', likes: 12, status: 'approved', createdAt: daysAgo(4) },
    { userId: 2, bookId: 8, progress: 50, note: '桥水基金的管理理念确实先进，透明和极度求真值得学习。', likes: 27, status: 'pending', createdAt: daysAgo(0) },
    { userId: 3, bookId: 9, progress: 65, note: '系统1和系统2的理论很有启发性，原来我们有这么多认知偏差。', likes: 33, status: 'approved', createdAt: daysAgo(1) },
    { userId: 1, bookId: 2, progress: 100, note: '三部曲全部读完！黑暗森林法则让人深思，宇宙社会学太精彩了。', likes: 56, status: 'approved', createdAt: daysAgo(5) },
    { userId: 4, bookId: 17, progress: 28, note: '曼昆的经济学入门果然名不虚传，通俗易懂。', likes: 15, status: 'pending', createdAt: daysAgo(2) },
    { userId: 2, bookId: 6, progress: 100, note: '从认知革命到农业革命，人类发展的脉络清晰了。推荐！', likes: 39, status: 'approved', createdAt: daysAgo(6) },
    { userId: 3, bookId: 11, progress: 80, note: '宝黛初见那段写得真美，字字珠玑。', likes: 21, status: 'approved', createdAt: daysAgo(3) },
    { userId: 1, bookId: 1, progress: 85, note: '有庆死的时候我哭了，余华对苦难的描写太有力量了。', likes: 45, status: 'approved', createdAt: daysAgo(7) },
  ]

  const stmt = db.prepare(
    'INSERT INTO checkin_records (userId, bookId, progress, note, likes, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const tx = db.transaction((recs) => {
    for (const rec of recs) {
      stmt.run(rec.userId, rec.bookId, rec.progress, rec.note, rec.likes, rec.status, rec.createdAt)
    }
  })
  tx(records)
}

function seedBorrowRules(): void {
  const count = db.prepare('SELECT COUNT(*) as count FROM borrow_rules').get() as { count: number }
  if (count.count > 0) return

  db.prepare(
    'INSERT INTO borrow_rules (maxBorrowDays, maxRenewTimes, maxBorrowCount, overdueFinePerDay) VALUES (?, ?, ?, ?)'
  ).run(30, 1, 5, 0.5)
}

export function initDatabase(): Database.Database {
  createTables()
  seedCategories()
  seedBooks()
  seedUsers()
  seedBorrowRecords()
  seedCheckinRecords()
  seedBorrowRules()
  return db
}

export default db
