import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  Flame,
  Trophy,
  ChevronRight,
  BookOpen,
  BookMarked,
  Clock,
  AlertTriangle,
  Heart,
  User,
  Loader2,
  Bell,
} from 'lucide-react';
import type { Book, CheckinRecord, BorrowStatusSummary } from '../../shared/types';
import { apiGet } from '@/api/client';

export default function Home() {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');

  const [newBooks, setNewBooks] = useState<Book[]>([]);
  const [hotBooks, setHotBooks] = useState<Book[]>([]);
  const [checkinRanking, setCheckinRanking] = useState<CheckinRecord[]>([]);
  const [borrowStatus, setBorrowStatus] = useState<BorrowStatusSummary | null>(null);

  const [loadingNew, setLoadingNew] = useState(true);
  const [loadingHot, setLoadingHot] = useState(true);
  const [loadingCheckin, setLoadingCheckin] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const loadData = async () => {
    try {
      const [newData, hotData, checkinData, statusData] = await Promise.all([
        apiGet<Book[]>('/books/new').catch(() => []),
        apiGet<Book[]>('/books/hot').catch(() => []),
        apiGet<CheckinRecord[]>('/checkin/ranking').catch(() => []),
        apiGet<BorrowStatusSummary>('/borrow/status').catch(() => null),
      ]);
      setNewBooks(Array.isArray(newData) ? newData : []);
      setHotBooks(Array.isArray(hotData) ? hotData : []);
      setCheckinRanking(Array.isArray(checkinData) ? checkinData : []);
      setBorrowStatus(statusData);
    } catch (error) {
      console.error('加载首页数据失败:', error);
    } finally {
      setLoadingNew(false);
      setLoadingHot(false);
      setLoadingCheckin(false);
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchKeyword.trim()) {
      navigate(`/books?keyword=${encodeURIComponent(searchKeyword.trim())}`);
    } else {
      navigate('/books');
    }
  };

  const SkeletonCard = () => (
    <div className="shrink-0 w-40 animate-pulse">
      <div className="aspect-[3/4] rounded-xl bg-brand-100" />
      <div className="mt-3 space-y-2">
        <div className="h-4 bg-brand-100 rounded w-3/4" />
        <div className="h-3 bg-brand-50 rounded w-1/2" />
      </div>
    </div>
  );

  const SkeletonRow = () => (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-brand-100" />
      <div className="w-16 h-20 rounded-lg bg-brand-100" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-brand-100 rounded w-1/3" />
        <div className="h-3 bg-brand-50 rounded w-1/4" />
      </div>
      <div className="w-16 h-4 bg-brand-100 rounded" />
    </div>
  );

  const SkeletonCheckin = () => (
    <div className="p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-100" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-brand-100 rounded w-1/4" />
          <div className="h-3 bg-brand-50 rounded w-1/3" />
        </div>
      </div>
      <div className="h-3 bg-brand-50 rounded w-full" />
      <div className="h-3 bg-brand-50 rounded w-2/3" />
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {loadingStatus ? (
        <div className="h-20 rounded-2xl bg-brand-50 animate-pulse" />
      ) : borrowStatus && (borrowStatus.overdue > 0 || borrowStatus.willDueSoon > 0) ? (
        <div
          className={`rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all hover:shadow-md ${
            borrowStatus.overdue > 0
              ? 'bg-gradient-to-r from-red-50 to-red-100 border border-red-200'
              : 'bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200'
          }`}
          onClick={() => navigate('/my-borrow')}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              borrowStatus.overdue > 0 ? 'bg-red-200' : 'bg-amber-200'
            }`}
          >
            {borrowStatus.overdue > 0 ? (
              <AlertTriangle className="w-6 h-6 text-red-600" />
            ) : (
              <Bell className="w-6 h-6 text-amber-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold ${borrowStatus.overdue > 0 ? 'text-red-800' : 'text-amber-800'}`}>
              {borrowStatus.overdue > 0 ? '借阅到期提醒' : '即将到期提醒'}
            </p>
            <p className={`text-sm mt-0.5 ${borrowStatus.overdue > 0 ? 'text-red-600' : 'text-amber-600'}`}>
              {borrowStatus.overdue > 0
                ? `您有 ${borrowStatus.overdue} 本图书已逾期，请尽快归还`
                : `您有 ${borrowStatus.willDueSoon} 本图书即将到期，请及时续借或归还`}
            </p>
          </div>
          <ChevronRight className={`w-5 h-5 shrink-0 ${borrowStatus.overdue > 0 ? 'text-red-400' : 'text-amber-400'}`} />
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-brand-200" />
            <span className="text-sm text-brand-100">欢迎回来</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-3">开启今日阅读之旅</h1>
          <p className="text-brand-100/90 mb-6 max-w-md">在书香中遇见更好的自己，探索海量图书，记录阅读心得</p>

          <form onSubmit={handleSearch} className="max-w-xl mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索书名、作者、ISBN..."
                className="w-full pl-12 pr-28 py-3.5 rounded-2xl bg-white/95 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-4 focus:ring-white/30 transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-leaf-600 hover:bg-leaf-700 text-white px-5 py-2 rounded-xl font-medium transition-colors"
              >
                搜索
              </button>
            </div>
          </form>

          <div className="grid grid-cols-3 gap-4 max-w-md">
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <BookMarked className="w-4 h-4 text-brand-200" />
                <span className="text-xs text-brand-100/80">借阅总数</span>
              </div>
              <p className="text-2xl font-bold">
                {loadingStatus ? <Loader2 className="w-5 h-5 animate-spin inline" /> : borrowStatus?.total ?? 0}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-brand-200" />
                <span className="text-xs text-brand-100/80">借阅中</span>
              </div>
              <p className="text-2xl font-bold">
                {loadingStatus ? <Loader2 className="w-5 h-5 animate-spin inline" /> : borrowStatus?.borrowing ?? 0}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-brand-200" />
                <span className="text-xs text-brand-100/80">已逾期</span>
              </div>
              <p className={`text-2xl font-bold ${borrowStatus && borrowStatus.overdue > 0 ? 'text-red-300' : ''}`}>
                {loadingStatus ? <Loader2 className="w-5 h-5 animate-spin inline" /> : borrowStatus?.overdue ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="section-title">新书上架</h2>
              <p className="text-sm text-ink-muted">最新上架的优质图书</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/books')}
            className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors group"
          >
            查看更多
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="-mx-4 px-4 overflow-x-auto pb-4 scrollbar-hide">
          {loadingNew ? (
            <div className="flex gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : newBooks.length > 0 ? (
            <div className="flex gap-4">
              {newBooks.map((book) => (
                <div
                  key={book.id}
                  onClick={() => navigate(`/books/${book.id}`)}
                  className="shrink-0 w-40 cursor-pointer group"
                >
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-brand-50 shadow-book group-hover:shadow-book-hover transition-all duration-300 group-hover:-translate-y-1">
                    <img
                      src={book.cover}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="mt-3">
                    {book.categoryName && (
                      <span className="tag bg-leaf-50 text-leaf-700 mb-2 text-[10px]">
                        {book.categoryName}
                      </span>
                    )}
                    <h3 className="font-serif font-semibold text-ink line-clamp-1 group-hover:text-brand-600 transition-colors text-sm">
                      {book.title}
                    </h3>
                    <p className="text-xs text-ink-muted mt-1 line-clamp-1">{book.author}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center w-full">
              <BookOpen className="w-12 h-12 text-brand-200 mx-auto mb-3" />
              <p className="text-ink-muted">暂无新书数据</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-orange-200">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="section-title">热门借阅</h2>
              <p className="text-sm text-ink-muted">大家都在读的热门图书</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/books?sort=hot')}
            className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors group"
          >
            查看更多
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="card overflow-hidden divide-y divide-brand-50">
          {loadingHot ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : hotBooks.length > 0 ? (
            hotBooks.slice(0, 5).map((book, index) => (
              <div
                key={book.id}
                onClick={() => navigate(`/books/${book.id}`)}
                className="flex items-center gap-4 p-4 hover:bg-brand-50/50 cursor-pointer transition-colors group"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${
                    index === 0
                      ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                      : index === 1
                      ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white'
                      : index === 2
                      ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
                      : 'bg-brand-100 text-brand-500'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="w-14 h-20 rounded-lg overflow-hidden bg-brand-50 shrink-0 shadow-sm">
                  <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif font-semibold text-ink line-clamp-1 group-hover:text-brand-600 transition-colors">
                    {book.title}
                  </h3>
                  <p className="text-sm text-ink-muted mt-0.5 line-clamp-1">{book.author}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-ink-muted flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      借阅 {book.borrowCount} 次
                    </span>
                  </div>
                </div>
                <span
                  className={`tag shrink-0 text-xs ${
                    book.availableStock > 0 ? 'bg-leaf-100 text-leaf-700' : 'bg-red-100 text-red-600'
                  }`}
                >
                  {book.availableStock > 0 ? `可借 ${book.availableStock}` : '已借完'}
                </span>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-brand-200 mx-auto mb-3" />
              <p className="text-ink-muted">暂无热门数据</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-leaf-400 to-leaf-600 flex items-center justify-center shadow-lg shadow-leaf-200">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="section-title">每日打卡榜</h2>
              <p className="text-sm text-ink-muted">今日优秀读书笔记</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/checkin')}
            className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors group"
          >
            查看更多
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {loadingCheckin ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card">
                <SkeletonCheckin />
              </div>
            ))
          ) : checkinRanking.length > 0 ? (
            checkinRanking.slice(0, 4).map((record, index) => (
              <div
                key={record.id}
                onClick={() => navigate(`/books/${record.bookId}`)}
                className="card card-hover cursor-pointer p-5 relative overflow-hidden"
              >
                {index < 3 && (
                  <div
                    className={`absolute top-0 right-0 w-16 h-16 ${
                      index === 0
                        ? 'bg-gradient-to-br from-yellow-400/20 to-transparent'
                        : index === 1
                        ? 'bg-gradient-to-br from-gray-300/20 to-transparent'
                        : 'bg-gradient-to-br from-amber-600/20 to-transparent'
                    }`}
                  >
                    <span
                      className={`absolute top-2 right-3 text-lg font-bold ${
                        index === 0
                          ? 'text-yellow-500'
                          : index === 1
                          ? 'text-gray-400'
                          : 'text-amber-600'
                      }`}
                    >
                      #{index + 1}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    {record.userAvatar ? (
                      <img
                        src={record.userAvatar}
                        alt={record.userName}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-brand-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink line-clamp-1">{record.userName}</p>
                    <p className="text-xs text-ink-muted flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      正在读《{record.bookTitle}》
                    </p>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-ink-muted mb-1.5">
                    <span>阅读进度</span>
                    <span className="font-medium text-leaf-600">{record.progress}%</span>
                  </div>
                  <div className="h-2 bg-brand-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-leaf-400 to-leaf-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(record.progress, 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm text-ink-light line-clamp-2 mb-3 leading-relaxed">
                  {record.note || '暂无笔记内容'}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-brand-50">
                  <span className="text-xs text-ink-muted">
                    {new Date(record.createdAt).toLocaleDateString('zh-CN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-ink-muted">
                    <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                    <span className="font-medium">{record.likes}</span>
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="sm:col-span-2 card p-12 text-center">
              <Trophy className="w-12 h-12 text-brand-200 mx-auto mb-3" />
              <p className="text-ink-muted">暂无打卡数据</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
