import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  User,
  Building2,
  Calendar,
  Hash,
  Layers,
  Copy,
  BookmarkPlus,
  Share2,
  Star,
  Heart,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { apiGet, apiPost } from '@/api/client';
import { useUserStore } from '@/store/user';
import type { Book } from '../../shared/types';

type ToastType = 'success' | 'error' | null;

interface ToastMessage {
  type: ToastType;
  text: string;
}

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useUserStore();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(false);
  const [toast, setToast] = useState<ToastMessage>({ type: null, text: '' });

  const showToast = (type: ToastType, text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast({ type: null, text: '' }), 3000);
  };

  const fetchBook = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await apiGet<Book>(`/books/${id}`);
      setBook(data);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '加载图书详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBook();
  }, [id]);

  const handleBorrow = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/books/${id}` } });
      return;
    }
    if (!book || !id) return;

    try {
      setBorrowing(true);
      await apiPost('/borrow', { bookId: Number(id) });
      showToast('success', '借阅成功！请在规定时间内归还');
      fetchBook();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '借阅失败，请稍后重试');
    } finally {
      setBorrowing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <button className="inline-flex items-center gap-2 text-sm text-ink-light hover:text-brand-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </button>
        <div className="bg-white rounded-3xl shadow-book overflow-hidden animate-pulse">
          <div className="bg-gradient-to-br from-brand-50 via-paper to-leaf-50 p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col md:flex-row gap-6 lg:gap-10">
              <div className="w-48 sm:w-56 shrink-0 mx-auto md:mx-0">
                <div className="aspect-[3/4] rounded-2xl bg-brand-100" />
              </div>
              <div className="flex-1 min-w-0 space-y-4">
                <div className="h-6 w-20 bg-leaf-100 rounded-lg" />
                <div className="h-10 w-48 bg-brand-100 rounded-lg" />
                <div className="h-5 w-32 bg-brand-50 rounded-lg" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white/80 rounded-xl p-4 space-y-2">
                      <div className="h-7 w-12 bg-brand-100 rounded mx-auto" />
                      <div className="h-3 w-16 bg-brand-50 rounded mx-auto" />
                    </div>
                  ))}
                </div>
                <div className="h-12 w-40 bg-brand-100 rounded-xl mt-6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-ink-light hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </button>
        <div className="bg-white rounded-3xl shadow-book p-12 text-center">
          <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <p className="text-ink-muted">未找到该图书</p>
        </div>
      </div>
    );
  }

  const infoItems = [
    { icon: User, label: '作者', value: book.author },
    { icon: Building2, label: '出版社', value: book.publisher },
    { icon: Calendar, label: '出版日期', value: book.publishDate },
    { icon: Hash, label: 'ISBN', value: book.isbn },
    { icon: Layers, label: '分类', value: book.categoryName || '-' },
    { icon: Copy, label: '馆藏数量', value: `${book.totalStock} 本` },
  ];

  return (
    <div className="space-y-6 relative">
      {toast.type && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-down ${
            toast.type === 'success' ? 'bg-leaf-600 text-white' : 'bg-red-500 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="font-medium">{toast.text}</span>
        </div>
      )}

      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-ink-light hover:text-brand-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回列表
      </button>

      <div className="bg-white rounded-3xl shadow-book overflow-hidden">
        <div className="bg-gradient-to-br from-brand-50 via-paper to-leaf-50 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col md:flex-row gap-6 lg:gap-10">
            <div className="w-48 sm:w-56 shrink-0 mx-auto md:mx-0">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-xl shadow-brand-200/50 ring-4 ring-white">
                <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="tag bg-leaf-100 text-leaf-700 mb-3">{book.categoryName}</span>
                  <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink leading-tight">{book.title}</h1>
                  <p className="text-lg text-ink-light mt-2">作者：{book.author}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="p-2.5 rounded-xl bg-white hover:bg-brand-50 shadow-sm transition-all" title="收藏">
                    <Heart className="w-5 h-5 text-ink-muted hover:text-red-500" />
                  </button>
                  <button className="p-2.5 rounded-xl bg-white hover:bg-brand-50 shadow-sm transition-all" title="分享">
                    <Share2 className="w-5 h-5 text-ink-muted hover:text-brand-500" />
                  </button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/80 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-brand-600">
                    {book.availableStock}
                    <span className="text-sm font-normal text-ink-muted">/{book.totalStock}</span>
                  </p>
                  <p className="text-xs text-ink-muted mt-1">可借数量</p>
                </div>
                <div className="bg-white/80 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-leaf-600">{book.borrowCount}</p>
                  <p className="text-xs text-ink-muted mt-1">借阅次数</p>
                </div>
                <div className="bg-white/80 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-500 flex items-center justify-center gap-1">
                    <Star className="w-5 h-5 fill-amber-400" />
                    4.9
                  </p>
                  <p className="text-xs text-ink-muted mt-1">读者评分</p>
                </div>
                <div className="bg-white/80 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-sky-600">#3</p>
                  <p className="text-xs text-ink-muted mt-1">借阅排行</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={handleBorrow}
                  disabled={book.availableStock === 0 || borrowing}
                  className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {borrowing ? (
                    <>
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      借阅中...
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="w-5 h-5" />
                      {book.availableStock === 0 ? '已借完' : '立即借阅'}
                    </>
                  )}
                </button>
                <button className="btn-secondary flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  加入书架
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10 grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="section-title mb-4">
              <span className="w-1 h-6 bg-brand-600 rounded-full"></span>
              图书信息
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {infoItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="p-3 rounded-xl bg-paper/60">
                    <div className="flex items-center gap-2 text-ink-muted text-xs mb-1">
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </div>
                    <p className="text-sm font-medium text-ink truncate" title={item.value}>
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="section-title mb-4">
              <span className="w-1 h-6 bg-leaf-600 rounded-full"></span>
              目录
            </h2>
            <div className="p-4 rounded-xl bg-paper/60 whitespace-pre-line text-sm text-ink-light font-serif leading-loose max-h-80 overflow-y-auto">
              {book.catalog}
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8 lg:px-10 pb-8">
          <h2 className="section-title mb-4">
            <span className="w-1 h-6 bg-amber-500 rounded-full"></span>
            内容简介
          </h2>
          <p className="text-ink-light leading-relaxed indent-8 font-serif">
            {book.summary}
          </p>
        </div>
      </div>
    </div>
  );
}
