import { useState, useEffect } from 'react';
import {
  CalendarCheck2,
  Plus,
  Heart,
  BookOpen,
  Send,
  Clock,
  TrendingUp,
  Award,
  ChevronDown,
  User,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { apiGet, apiPost } from '@/api/client';
import type { CheckinRecord, BorrowRecord, PagedResponse } from '../../shared/types';

interface MyCheckinStats {
  totalCount: number;
  monthCount: number;
  streakDays: number;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 30) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function calculateStreakDays(records: CheckinRecord[]): number {
  if (records.length === 0) return 0;

  const approvedDates = records
    .filter((r) => r.status === 'approved')
    .map((r) => {
      const d = new Date(r.createdAt);
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    });

  const uniqueDates = [...new Set(approvedDates)].sort().reverse();
  if (uniqueDates.length === 0) return 0;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;

  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
    return 0;
  }

  let streak = 1;
  let current = new Date(uniqueDates[0]);

  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(current);
    prev.setDate(prev.getDate() - 1);
    const prevStr = `${prev.getFullYear()}-${prev.getMonth() + 1}-${prev.getDate()}`;

    if (uniqueDates[i] === prevStr) {
      streak++;
      current = prev;
    } else {
      break;
    }
  }

  return streak;
}

function Flame(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

export default function Checkin() {
  const [feedList, setFeedList] = useState<CheckinRecord[]>([]);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotal, setFeedTotal] = useState(0);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedLoadingMore, setFeedLoadingMore] = useState(false);

  const [myStats, setMyStats] = useState<MyCheckinStats>({
    totalCount: 0,
    monthCount: 0,
    streakDays: 0,
  });
  const [myRecords, setMyRecords] = useState<CheckinRecord[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const [borrowingBooks, setBorrowingBooks] = useState<BorrowRecord[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formBookId, setFormBookId] = useState<number | ''>('');
  const [formProgress, setFormProgress] = useState(0);
  const [formNote, setFormNote] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [showBookDropdown, setShowBookDropdown] = useState(false);

  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const PAGE_SIZE = 10;

  const fetchFeed = async (page: number, append: boolean) => {
    if (append) {
      setFeedLoadingMore(true);
    } else {
      setFeedLoading(true);
    }
    setError(null);
    try {
      const data = await apiGet<PagedResponse<CheckinRecord>>('/checkin/feed', {
        page,
        pageSize: PAGE_SIZE,
      });
      if (append) {
        setFeedList((prev) => [...prev, ...data.list]);
      } else {
        setFeedList(data.list);
      }
      setFeedTotal(data.total);
      setFeedPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载动态失败');
    } finally {
      setFeedLoading(false);
      setFeedLoadingMore(false);
    }
  };

  const fetchMyStats = async () => {
    setStatsLoading(true);
    try {
      const data = await apiGet<PagedResponse<CheckinRecord>>('/checkin/my', {
        page: 1,
        pageSize: 1000,
      });
      const records = data.list;
      setMyRecords(records);

      const totalCount = data.total;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthCount = records.filter((r) => {
        const d = new Date(r.createdAt);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }).length;

      const streakDays = calculateStreakDays(records);

      setMyStats({ totalCount, monthCount, streakDays });
    } catch (err) {
      console.error('加载统计数据失败:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchBorrowingBooks = async () => {
    setBooksLoading(true);
    try {
      const data = await apiGet<BorrowRecord[]>('/borrow/my', { status: 'borrowing' });
      setBorrowingBooks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('加载借阅书籍失败:', err);
    } finally {
      setBooksLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed(1, false);
    fetchMyStats();
    fetchBorrowingBooks();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-book-dropdown]')) {
        setShowBookDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLoadMore = () => {
    if (feedList.length < feedTotal) {
      fetchFeed(feedPage + 1, true);
    }
  };

  const handleLike = async (record: CheckinRecord) => {
    if (likedIds.has(record.id)) return;

    try {
      await apiPost<CheckinRecord>(`/checkin/${record.id}/like`);
      setLikedIds((prev) => new Set(prev).add(record.id));
      setFeedList((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, likes: r.likes + 1 } : r))
      );
      setMyRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, likes: r.likes + 1 } : r))
      );
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  const isFormValid =
    formBookId !== '' &&
    formNote.trim().length >= 5 &&
    formNote.trim().length <= 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || formSubmitting) return;

    setFormSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      await apiPost<CheckinRecord>('/checkin', {
        bookId: Number(formBookId),
        progress: formProgress,
        note: formNote.trim(),
      });

      setFormSuccess('打卡成功，等待审核');
      setFormBookId('');
      setFormProgress(0);
      setFormNote('');
      setShowForm(false);

      setTimeout(() => setFormSuccess(null), 3000);

      fetchFeed(1, false);
      fetchMyStats();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setFormSubmitting(false);
    }
  };

  const selectedBook = borrowingBooks.find((b) => b.id === formBookId);

  const allRecords = [...feedList];
  const pendingMyRecords = myRecords.filter((r) => r.status === 'pending');
  const pendingNotInFeed = pendingMyRecords.filter(
    (pr) => !allRecords.some((r) => r.id === pr.id)
  );
  const displayList = [...pendingNotInFeed, ...feedList].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-serif font-bold text-ink flex items-center gap-2">
          <CalendarCheck2 className="w-7 h-7 text-brand-600" />
          读书打卡
        </h1>
        <p className="text-sm text-ink-muted mt-1">记录每一次阅读，见证成长的足迹</p>
      </div>

      {formSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-leaf-600 text-white px-6 py-3 rounded-xl shadow-lg animate-slide-up flex items-center gap-2">
          <Award className="w-5 h-5" />
          {formSuccess}
        </div>
      )}

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-leaf-600 via-leaf-500 to-brand-600 p-6 sm:p-8 text-white">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-leaf-200" />
                <span className="text-sm text-leaf-100">我的打卡统计</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold">坚持阅读，遇见更好的自己</h2>
            </div>
            <button
              onClick={() => {
                if (borrowingBooks.length === 0) {
                  fetchBorrowingBooks();
                }
                setShowForm((prev) => !prev);
                setFormError(null);
              }}
              className={`shrink-0 px-6 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 ${
                showForm
                  ? 'bg-white/20 hover:bg-white/30 backdrop-blur border border-white/30'
                  : 'bg-white text-leaf-700 hover:bg-leaf-50 shadow-lg'
              }`}
            >
              {showForm ? (
                <>
                  <ChevronDown className="w-5 h-5" />
                  收起表单
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  今日打卡
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Award className="w-4 h-4 text-leaf-200" />
                <span className="text-xs text-leaf-100/80">总打卡</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">
                {statsLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                ) : (
                  myStats.totalCount
                )}
              </p>
              <p className="text-xs text-leaf-100/60 mt-0.5">次</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <CalendarCheck2 className="w-4 h-4 text-leaf-200" />
                <span className="text-xs text-leaf-100/80">本月打卡</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">
                {statsLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                ) : (
                  myStats.monthCount
                )}
              </p>
              <p className="text-xs text-leaf-100/60 mt-0.5">次</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Flame className="w-4 h-4 text-orange-300" />
                <span className="text-xs text-leaf-100/80">连续打卡</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">
                {statsLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                ) : (
                  myStats.streakDays
                )}
              </p>
              <p className="text-xs text-leaf-100/60 mt-0.5">天</p>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card p-6 animate-slide-up">
          <h3 className="font-serif text-lg font-semibold text-ink mb-5 flex items-center gap-2">
            <Send className="w-5 h-5 text-leaf-600" />
            发布今日打卡
          </h3>

          {booksLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
            </div>
          ) : borrowingBooks.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-brand-200 mx-auto mb-3" />
              <p className="text-ink-muted mb-2">您当前没有正在借阅的书籍</p>
              <p className="text-sm text-ink-muted">请先借阅图书后再进行打卡</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  选择书籍 <span className="text-red-500">*</span>
                </label>
                <div className="relative" data-book-dropdown>
                  <button
                    type="button"
                    onClick={() => setShowBookDropdown((prev) => !prev)}
                    className="input-base w-full flex items-center justify-between text-left"
                  >
                    <span className={selectedBook ? 'text-ink' : 'text-ink-muted'}>
                      {selectedBook ? `《${selectedBook.bookTitle}》` : '请选择正在借阅的书籍'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-ink-muted transition-transform ${
                        showBookDropdown ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {showBookDropdown && (
                    <div className="absolute z-20 mt-2 w-full bg-white rounded-xl shadow-book border border-brand-100 overflow-hidden max-h-60 overflow-y-auto">
                      {borrowingBooks.map((book) => (
                        <button
                          key={book.id}
                          type="button"
                          onClick={() => {
                            setFormBookId(book.id);
                            setShowBookDropdown(false);
                          }}
                          className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-brand-50 transition-colors text-left ${
                            formBookId === book.id ? 'bg-leaf-50' : ''
                          }`}
                        >
                          <img
                            src={book.bookCover}
                            alt={book.bookTitle}
                            className="w-10 h-14 rounded-lg object-cover shrink-0 bg-brand-100"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-ink truncate">《{book.bookTitle}》</p>
                            <p className="text-xs text-ink-muted mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              借阅于 {book.borrowDate}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  阅读进度：
                  <span className="ml-2 text-leaf-600 font-bold">{formProgress}%</span>
                </label>
                <div className="px-1">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={formProgress}
                    onChange={(e) => setFormProgress(Number(e.target.value))}
                    className="w-full h-2 bg-brand-100 rounded-full appearance-none cursor-pointer accent-leaf-600"
                    style={{
                      background: `linear-gradient(to right, #2E8B57 0%, #2E8B57 ${formProgress}%, #F5EBDF ${formProgress}%, #F5EBDF 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-xs text-ink-muted mt-2 px-0.5">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
                <div className="mt-3 h-3 bg-brand-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-leaf-400 to-leaf-600 rounded-full transition-all duration-500"
                    style={{ width: `${formProgress}%` }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  读书笔记 <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs text-ink-muted font-normal">
                    ({formNote.length}/500字，至少5字)
                  </span>
                </label>
                <textarea
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value.slice(0, 500))}
                  placeholder="记录今天的阅读心得、精彩片段或思考感悟..."
                  rows={5}
                  className="input-base resize-none"
                />
                {formNote.length > 0 && formNote.length < 5 && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    笔记内容至少需要5个字
                  </p>
                )}
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {formError}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormError(null);
                  }}
                  disabled={formSubmitting}
                  className="btn-secondary flex-1"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid || formSubmitting}
                  className={`flex-1 bg-gradient-to-r from-leaf-600 to-leaf-500 hover:from-leaf-700 hover:to-leaf-600 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${
                    !isFormValid || formSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      提交中...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      发布打卡
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div>
        <h3 className="font-serif text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-600" />
          打卡动态
        </h3>

        {error ? (
          <div className="card p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <p className="text-red-500 font-medium mb-2">加载失败</p>
            <p className="text-sm text-ink-muted mb-4">{error}</p>
            <button onClick={() => fetchFeed(1, false)} className="btn-primary">
              重新加载
            </button>
          </div>
        ) : feedLoading && displayList.length === 0 ? (
          <div className="card p-12 text-center">
            <Loader2 className="w-12 h-12 text-brand-300 mx-auto mb-4 animate-spin" />
            <p className="text-ink-muted">加载中...</p>
          </div>
        ) : displayList.length === 0 ? (
          <div className="card p-12 text-center">
            <CalendarCheck2 className="w-16 h-16 text-brand-200 mx-auto mb-4" />
            <p className="text-ink-muted mb-2">暂无打卡动态</p>
            <p className="text-sm text-ink-muted">成为第一个打卡的人吧！</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-leaf-300 via-brand-200 to-transparent" />

            <div className="space-y-4">
              {displayList.map((record) => {
                const isPending = record.status === 'pending';
                const isLiked = likedIds.has(record.id);

                return (
                  <div key={record.id} className="relative pl-14">
                    <div
                      className={`absolute left-2 top-5 w-7 h-7 rounded-full flex items-center justify-center z-10 ${
                        isPending
                          ? 'bg-gray-200 border-2 border-gray-300'
                          : 'bg-gradient-to-br from-leaf-400 to-leaf-600 shadow-md shadow-leaf-200'
                      }`}
                    >
                      <BookOpen
                        className={`w-3.5 h-3.5 ${isPending ? 'text-gray-500' : 'text-white'}`}
                      />
                    </div>

                    <div
                      className={`card card-hover p-5 ${
                        isPending ? 'opacity-80 border-2 border-dashed border-gray-200' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-4">
                        {record.userAvatar ? (
                          <img
                            src={record.userAvatar}
                            alt={record.userName}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-brand-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-ink">{record.userName}</p>
                            {isPending && (
                              <span className="tag bg-gray-100 text-gray-600 text-[10px]">
                                审核中
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ink-muted mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(record.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4 p-3 bg-brand-50/70 rounded-xl flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-brand-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-serif font-medium text-ink truncate">
                            《{record.bookTitle}》
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-ink-muted mb-1.5">
                          <span>阅读进度</span>
                          <span className="font-medium text-leaf-600">{record.progress}%</span>
                        </div>
                        <div className="h-2.5 bg-brand-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-leaf-400 to-leaf-600 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(record.progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      {record.note && (
                        <p className="text-sm text-ink-light leading-relaxed mb-4 whitespace-pre-wrap bg-paper/50 rounded-lg p-3">
                          {record.note}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-brand-50">
                        <span className="text-xs text-ink-muted">#{record.id}</span>
                        <button
                          onClick={() => handleLike(record)}
                          disabled={isLiked || isPending}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                            isLiked
                              ? 'bg-red-50 text-red-600'
                              : isPending
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-ink-muted hover:bg-red-50 hover:text-red-500'
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 transition-all ${
                              isLiked ? 'fill-red-500 text-red-500' : ''
                            }`}
                          />
                          <span className="text-sm font-medium">{record.likes}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {feedList.length < feedTotal && (
              <div className="mt-6 text-center pl-14">
                <button
                  onClick={handleLoadMore}
                  disabled={feedLoadingMore}
                  className="btn-secondary px-8 inline-flex items-center gap-2"
                >
                  {feedLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      加载中...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      加载更多 ({feedList.length}/{feedTotal})
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
