export interface Book {
  id: number;
  title: string;
  author: string;
  cover: string;
  isbn: string;
  categoryId: number;
  categoryName?: string;
  publisher: string;
  publishDate: string;
  summary: string;
  catalog: string;
  totalStock: number;
  availableStock: number;
  borrowCount: number;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  parentId: number;
  level: number;
}

export type BorrowStatus = 'borrowing' | 'returned' | 'overdue' | 'renewed';

export interface BorrowRecord {
  id: number;
  userId: number;
  bookId: number;
  bookTitle: string;
  bookCover: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
  renewCount: number;
  status: BorrowStatus;
}

export type CheckinStatus = 'pending' | 'approved' | 'rejected';

export interface CheckinRecord {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string;
  bookId: number;
  bookTitle: string;
  progress: number;
  note: string;
  likes: number;
  status: CheckinStatus;
  createdAt: string;
}

export interface BorrowRules {
  maxBorrowDays: number;
  maxRenewTimes: number;
  maxBorrowCount: number;
  overdueFinePerDay: number;
}

export interface User {
  id: number;
  username: string;
  nickname: string;
  avatar: string;
  role: 'user' | 'admin';
}

export interface PagedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface BorrowStatusSummary {
  total: number;
  borrowing: number;
  overdue: number;
  willDueSoon: number;
}
