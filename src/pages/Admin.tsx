import { useState, useEffect } from 'react';
import {
  Layout as LayoutIcon,
  BarChart3,
  BookPlus,
  Settings2,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Package,
  Check,
  X,
  Save,
  RefreshCw,
  BookOpen,
  User,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  BookMarked,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/api/client';
import { useUserStore } from '@/store/user';
import type { Book, BorrowRules, CheckinRecord, PagedResponse, Category } from '../../shared/types';

type TabKey = 'stats' | 'books' | 'rules' | 'review';

interface AdminStats {
  totalBooks: number;
  borrowingCount: number;
  totalBorrowCount: number;
  totalUsers: number;
  todayNewUsers: number;
  totalCheckins: number;
  pendingCheckins: number;
  todayBorrowCount: number;
}

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

interface BookFormData {
  title: string;
  author: string;
  cover: string;
  isbn: string;
  categoryId: string;
  publisher: string;
  publishDate: string;
  summary: string;
  catalog: string;
  totalStock: string;
}

const emptyBookForm: BookFormData = {
  title: '',
  author: '',
  cover: '',
  isbn: '',
  categoryId: '',
  publisher: '',
  publishDate: '',
  summary: '',
  catalog: '',
  totalStock: '',
};

const tabs = [
  { key: 'stats', label: '统计概览', icon: BarChart3 },
  { key: 'books', label: '图书管理', icon: BookPlus },
  { key: 'rules', label: '借阅规则', icon: Settings2 },
  { key: 'review', label: '内容审核', icon: ShieldCheck },
] as const;

export default function Admin() {
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState<TabKey>('stats');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-24 h-24 rounded-full bg-brand-100 flex items-center justify-center mb-6">
          <ShieldCheck className="w-12 h-12 text-brand-400" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-ink mb-2">您没有管理员权限</h2>
        <p className="text-ink-muted text-center max-w-md">
          该页面仅对管理员开放，请联系系统管理员获取相应权限后再访问。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-leaf-600 flex items-center justify-center shadow-md">
          <LayoutIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink">后台管理</h1>
          <p className="text-sm text-ink-muted mt-0.5">管理图书、规则与内容审核</p>
        </div>
      </div>

      <div className="card p-2">
        <div className="relative">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-ink-light hover:bg-brand-50 hover:text-brand-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeTab === 'stats' && <StatsTab showToast={showToast} />}
      {activeTab === 'books' && <BooksTab showToast={showToast} />}
      {activeTab === 'rules' && <RulesTab showToast={showToast} />}
      {activeTab === 'review' && <ReviewTab showToast={showToast} />}

      <div className="fixed top-20 right-6 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-slide-up flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl min-w-[240px] ${
              toast.type === 'success'
                ? 'bg-leaf-50 border border-leaf-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                toast.type === 'success' ? 'bg-leaf-100' : 'bg-red-100'
              }`}
            >
              {toast.type === 'success' ? (
                <Check className="w-4 h-4 text-leaf-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
            <p
              className={`text-sm font-medium ${
                toast.type === 'success' ? 'text-leaf-700' : 'text-red-600'
              }`}
            >
              {toast.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsTab({ showToast }: { showToast: (type: 'success' | 'error', message: string) => void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await apiGet<AdminStats>('/admin/stats');
      setStats(data);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '加载统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const statCards = [
    {
      label: '图书总数',
      value: stats?.totalBooks ?? 0,
      desc: '馆藏图书总量',
      icon: BookOpen,
      color: 'brand',
      bgColor: 'bg-brand-100',
      iconColor: 'text-brand-600',
      valueColor: 'text-brand-600',
    },
    {
      label: '在借数量',
      value: stats?.borrowingCount ?? 0,
      desc: '当前借阅中',
      icon: BookPlus,
      color: 'leaf',
      bgColor: 'bg-leaf-100',
      iconColor: 'text-leaf-600',
      valueColor: 'text-leaf-600',
    },
    {
      label: '总借阅次数',
      value: stats?.totalBorrowCount ?? 0,
      desc: '历史累计借阅',
      icon: RefreshCw,
      color: 'sky',
      bgColor: 'bg-sky-100',
      iconColor: 'text-sky-600',
      valueColor: 'text-sky-600',
    },
    {
      label: '用户总数',
      value: stats?.totalUsers ?? 0,
      desc: '注册用户数量',
      icon: User,
      color: 'purple',
      bgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      valueColor: 'text-purple-600',
    },
    {
      label: '今日新增用户',
      value: stats?.todayNewUsers ?? 0,
      desc: '今日注册人数',
      icon: Plus,
      color: 'amber',
      bgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-600',
    },
    {
      label: '打卡总数',
      value: stats?.totalCheckins ?? 0,
      desc: '累计阅读打卡',
      icon: ShieldCheck,
      color: 'teal',
      bgColor: 'bg-teal-100',
      iconColor: 'text-teal-600',
      valueColor: 'text-teal-600',
    },
    {
      label: '待审核打卡',
      value: stats?.pendingCheckins ?? 0,
      desc: '等待审核处理',
      icon: AlertCircle,
      color: 'orange',
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
      valueColor: 'text-orange-600',
    },
    {
      label: '今日借阅数',
      value: stats?.todayBorrowCount ?? 0,
      desc: '今日借出图书',
      icon: BookMarked,
      color: 'pink',
      bgColor: 'bg-pink-100',
      iconColor: 'text-pink-600',
      valueColor: 'text-pink-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="section-title">
          <BarChart3 className="w-6 h-6 text-brand-600" />
          数据概览
        </h2>
        <button onClick={fetchStats} disabled={loading} className="btn-secondary text-sm flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新数据
        </button>
      </div>

      {loading && !stats ? (
        <div className="card p-12 text-center">
          <RefreshCw className="w-12 h-12 text-brand-300 mx-auto mb-4 animate-spin" />
          <p className="text-ink-muted">加载中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={index} className="card p-5 card-hover">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                </div>
                <p className={`text-3xl font-bold ${card.valueColor} mb-1`}>{card.value}</p>
                <p className="font-medium text-ink">{card.label}</p>
                <p className="text-xs text-ink-muted mt-1">{card.desc}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BooksTab({ showToast }: { showToast: (type: 'success' | 'error', message: string) => void }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<BookFormData>(emptyBookForm);
  const [formLoading, setFormLoading] = useState(false);
  const [restockModal, setRestockModal] = useState<{ id: number; title: string } | null>(null);
  const [restockQuantity, setRestockQuantity] = useState('');
  const [restockLoading, setRestockLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const data = await apiGet<PagedResponse<Book>>('/books', { page, pageSize });
      setBooks(data.list);
      setTotal(data.total);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '加载图书列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiGet<Category[]>('/categories');
      setCategories(data);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '加载分类失败');
    }
  };

  useEffect(() => {
    fetchBooks();
    fetchCategories();
  }, [page]);

  const totalPages = Math.ceil(total / pageSize);

  const handleAdd = () => {
    setEditMode(false);
    setEditingId(null);
    setFormData(emptyBookForm);
    setShowForm(true);
  };

  const handleEdit = (book: Book) => {
    setEditMode(true);
    setEditingId(book.id);
    setFormData({
      title: book.title,
      author: book.author,
      cover: book.cover,
      isbn: book.isbn,
      categoryId: String(book.categoryId),
      publisher: book.publisher,
      publishDate: book.publishDate,
      summary: book.summary,
      catalog: book.catalog,
      totalStock: String(book.totalStock),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = {
        ...formData,
        categoryId: Number(formData.categoryId),
        totalStock: Number(formData.totalStock),
      };
      if (editMode && editingId) {
        await apiPut(`/books/${editingId}`, payload);
        showToast('success', '图书信息更新成功');
      } else {
        await apiPost('/books', payload);
        showToast('success', '图书添加成功');
      }
      setShowForm(false);
      setFormData(emptyBookForm);
      fetchBooks();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : (editMode ? '更新失败' : '添加失败'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleRestock = async () => {
    if (!restockModal || !restockQuantity) return;
    const qty = Number(restockQuantity);
    if (qty <= 0) {
      showToast('error', '请输入有效的补库数量');
      return;
    }
    setRestockLoading(true);
    try {
      await apiPost(`/books/${restockModal.id}/restock`, { quantity: qty });
      showToast('success', `成功补库 ${qty} 册`);
      setRestockModal(null);
      setRestockQuantity('');
      fetchBooks();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '补库失败');
    } finally {
      setRestockLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      await apiDelete(`/books/${deleteConfirm.id}`);
      showToast('success', '图书删除成功');
      setDeleteConfirm(null);
      fetchBooks();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  const updateField = (field: keyof BookFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="section-title">
          <BookPlus className="w-6 h-6 text-brand-600" />
          图书管理
          <span className="text-sm font-normal text-ink-muted ml-2">共 {total} 本</span>
        </h2>
        <button onClick={handleAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新增图书
        </button>
      </div>

      {showForm && (
        <div className="card p-6 border-2 border-brand-200">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-serif font-bold text-ink">
              {editMode ? '编辑图书信息' : '新增图书入库'}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData(emptyBookForm);
              }}
              className="p-2 rounded-lg hover:bg-brand-50 text-ink-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField label="书名" required>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="请输入书名"
                  className="input-base"
                  required
                />
              </FormField>
              <FormField label="作者" required>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => updateField('author', e.target.value)}
                  placeholder="请输入作者"
                  className="input-base"
                  required
                />
              </FormField>
              <FormField label="封面图片URL">
                <input
                  type="url"
                  value={formData.cover}
                  onChange={(e) => updateField('cover', e.target.value)}
                  placeholder="https://..."
                  className="input-base"
                />
              </FormField>
              <FormField label="ISBN">
                <input
                  type="text"
                  value={formData.isbn}
                  onChange={(e) => updateField('isbn', e.target.value)}
                  placeholder="请输入ISBN"
                  className="input-base"
                />
              </FormField>
              <FormField label="分类" required>
                <select
                  value={formData.categoryId}
                  onChange={(e) => updateField('categoryId', e.target.value)}
                  className="input-base"
                  required
                >
                  <option value="">请选择分类</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="库存数量" required>
                <input
                  type="number"
                  min="0"
                  value={formData.totalStock}
                  onChange={(e) => updateField('totalStock', e.target.value)}
                  placeholder="请输入库存数量"
                  className="input-base"
                  required
                />
              </FormField>
              <FormField label="出版社">
                <input
                  type="text"
                  value={formData.publisher}
                  onChange={(e) => updateField('publisher', e.target.value)}
                  placeholder="请输入出版社"
                  className="input-base"
                />
              </FormField>
              <FormField label="出版日期">
                <input
                  type="date"
                  value={formData.publishDate}
                  onChange={(e) => updateField('publishDate', e.target.value)}
                  className="input-base"
                />
              </FormField>
            </div>

            <FormField label="内容简介">
              <textarea
                value={formData.summary}
                onChange={(e) => updateField('summary', e.target.value)}
                placeholder="请输入图书内容简介"
                rows={3}
                className="input-base resize-none"
              />
            </FormField>

            <FormField label="目录">
              <textarea
                value={formData.catalog}
                onChange={(e) => updateField('catalog', e.target.value)}
                placeholder="请输入图书目录，每行一个章节"
                rows={3}
                className="input-base resize-none font-mono text-sm"
              />
            </FormField>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData(emptyBookForm);
                }}
                className="btn-secondary"
                disabled={formLoading}
              >
                取消
              </button>
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={formLoading}>
                <Save className="w-4 h-4" />
                {formLoading ? '保存中...' : editMode ? '保存修改' : '添加图书'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-12 h-12 text-brand-300 mx-auto mb-4 animate-spin" />
            <p className="text-ink-muted">加载中...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-brand-200 mx-auto mb-4" />
            <p className="text-ink-muted">暂无图书数据</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-brand-50/60 border-b border-brand-100">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-ink-light uppercase tracking-wider">
                      图书信息
                    </th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-ink-light uppercase tracking-wider">
                      分类
                    </th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold text-ink-light uppercase tracking-wider">
                      库存
                    </th>
                    <th className="px-5 py-3.5 text-center text-xs font-semibold text-ink-light uppercase tracking-wider">
                      借阅数
                    </th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-ink-light uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {books.map((book, index) => (
                    <tr
                      key={book.id}
                      className={`transition-colors hover:bg-brand-50/40 ${
                        index % 2 === 1 ? 'bg-paper/30' : ''
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-16 rounded-md bg-brand-50 overflow-hidden shrink-0">
                            {book.cover ? (
                              <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-5 h-5 text-brand-300" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-ink truncate max-w-[200px]">{book.title}</p>
                            <p className="text-sm text-ink-muted truncate max-w-[200px]">{book.author}</p>
                            {book.isbn && (
                              <p className="text-xs text-ink-muted mt-0.5">ISBN: {book.isbn}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="tag bg-brand-100 text-brand-700">
                          {book.categoryName || categories.find((c) => c.id === book.categoryId)?.name || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="font-medium text-ink">{book.availableStock}</span>
                        <span className="text-ink-muted"> / {book.totalStock}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="font-medium text-leaf-600">{book.borrowCount}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setRestockModal({ id: book.id, title: book.title })}
                            className="p-2 rounded-lg hover:bg-leaf-50 text-leaf-600 transition-colors"
                            title="补库"
                          >
                            <Package className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(book)}
                            className="p-2 rounded-lg hover:bg-sky-50 text-sky-600 transition-colors"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ id: book.id, title: book.title })}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-t border-brand-100 bg-brand-50/30">
              <p className="text-sm text-ink-muted">
                第 {page} / {totalPages || 1} 页 · 共 {total} 条
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-brand-200 bg-white text-ink-light hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-brand-200 bg-white text-ink-light hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {restockModal && (
        <Modal onClose={() => setRestockModal(null)} title="图书补库">
          <p className="text-ink-light mb-4">
            为《<span className="font-medium text-ink">{restockModal.title}</span>》增加库存数量
          </p>
          <div className="mb-5">
            <label className="block text-sm font-medium text-ink-light mb-2">补库数量</label>
            <input
              type="number"
              min="1"
              value={restockQuantity}
              onChange={(e) => setRestockQuantity(e.target.value)}
              placeholder="请输入数量"
              className="input-base"
              autoFocus
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setRestockModal(null);
                setRestockQuantity('');
              }}
              disabled={restockLoading}
              className="btn-secondary"
            >
              取消
            </button>
            <button onClick={handleRestock} disabled={restockLoading} className="btn-leaf flex items-center gap-2">
              <Package className="w-4 h-4" />
              {restockLoading ? '处理中...' : '确认补库'}
            </button>
          </div>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal onClose={() => setDeleteConfirm(null)} title="确认删除">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-ink">确定要删除这本图书吗？</p>
              <p className="text-sm text-ink-muted mt-1">
                《<span className="font-medium">{deleteConfirm.title}</span>》
              </p>
              <p className="text-xs text-red-500 mt-2">此操作无法撤销，相关借阅记录可能会受到影响。</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setDeleteConfirm(null)}
              disabled={deleteLoading}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-300 active:scale-95 disabled:opacity-70 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {deleteLoading ? '删除中...' : '确认删除'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RulesTab({ showToast }: { showToast: (type: 'success' | 'error', message: string) => void }) {
  const [rules, setRules] = useState<BorrowRules | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const data = await apiGet<BorrowRules>('/admin/rules');
      setRules(data);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '加载借阅规则失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSave = async () => {
    if (!rules) return;
    setSaving(true);
    try {
      await apiPut('/admin/rules', rules);
      showToast('success', '借阅规则保存成功');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const updateRule = (key: keyof BorrowRules, value: string) => {
    if (!rules) return;
    const num = Number(value);
    if (isNaN(num) || num < 0) return;
    setRules({ ...rules, [key]: num });
  };

  const ruleFields = [
    {
      key: 'maxBorrowDays' as const,
      label: '最大借阅天数',
      desc: '每本图书最长可借阅多少天',
      unit: '天',
      icon: RefreshCw,
      color: 'brand',
    },
    {
      key: 'maxRenewTimes' as const,
      label: '最大续借次数',
      desc: '每本图书最多可续借次数',
      unit: '次',
      icon: RotateCcw,
      color: 'sky',
    },
    {
      key: 'maxBorrowCount' as const,
      label: '最大同时借阅数',
      desc: '每位读者最多可同时借阅图书数量',
      unit: '本',
      icon: BookOpen,
      color: 'leaf',
    },
    {
      key: 'overdueFinePerDay' as const,
      label: '逾期罚金/天',
      desc: '逾期未还每天产生的罚金',
      unit: '元',
      icon: AlertCircle,
      color: 'amber',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="section-title">
          <Settings2 className="w-6 h-6 text-brand-600" />
          借阅规则配置
        </h2>
        <div className="flex gap-2">
          <button onClick={fetchRules} disabled={loading} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            重置
          </button>
          <button onClick={handleSave} disabled={!rules || saving} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '保存规则'}
          </button>
        </div>
      </div>

      <div className="card p-6 bg-gradient-to-br from-leaf-50/50 to-brand-50/50 border border-brand-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-leaf-100 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-leaf-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-serif font-semibold text-ink mb-1">借阅规则说明</h3>
            <p className="text-sm text-ink-light leading-relaxed">
              以下规则适用于所有注册读者。请根据实际运营情况合理设置，规则保存后将立即对所有借阅行为生效。
              逾期罚金将在读者归还图书时自动计算并从账户余额扣除。
            </p>
          </div>
        </div>
      </div>

      {loading && !rules ? (
        <div className="card p-12 text-center">
          <RefreshCw className="w-12 h-12 text-brand-300 mx-auto mb-4 animate-spin" />
          <p className="text-ink-muted">加载中...</p>
        </div>
      ) : rules ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ruleFields.map((field) => {
            const Icon = field.icon;
            const bgMap: Record<string, string> = {
              brand: 'bg-brand-100',
              sky: 'bg-sky-100',
              leaf: 'bg-leaf-100',
              amber: 'bg-amber-100',
            };
            const iconMap: Record<string, string> = {
              brand: 'text-brand-600',
              sky: 'text-sky-600',
              leaf: 'text-leaf-600',
              amber: 'text-amber-600',
            };
            return (
              <div key={field.key} className="card p-5 card-hover">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${bgMap[field.color]} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-6 h-6 ${iconMap[field.color]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block font-medium text-ink mb-1">{field.label}</label>
                    <p className="text-xs text-ink-muted mb-3">{field.desc}</p>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={rules[field.key]}
                        onChange={(e) => updateRule(field.key, e.target.value)}
                        className="input-base pr-12 font-semibold text-lg"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-muted font-medium">
                        {field.unit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ReviewTab({ showToast }: { showToast: (type: 'success' | 'error', message: string) => void }) {
  const [records, setRecords] = useState<CheckinRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedNote, setExpandedNote] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ list: CheckinRecord[] }>('/checkin/pending');
      setRecords(data.list || []);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '加载待审核列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await apiPut(`/checkin/${id}/approve`);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      showToast('success', '审核通过');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    try {
      await apiPut(`/checkin/${id}/reject`);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      showToast('success', '已拒绝该打卡');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleNote = (id: number) => {
    setExpandedNote(expandedNote === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="section-title">
          <ShieldCheck className="w-6 h-6 text-brand-600" />
          内容审核
          <span
            className={`text-sm font-normal ml-2 px-3 py-1 rounded-full ${
              records.length > 0 ? 'bg-orange-100 text-orange-700' : 'bg-leaf-100 text-leaf-700'
            }`}
          >
            {records.length > 0 ? `${records.length} 条待审核` : '全部审核完成'}
          </span>
        </h2>
        <button onClick={fetchPending} disabled={loading} className="btn-secondary text-sm flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新列表
        </button>
      </div>

      {loading ? (
        <div className="card p-12 text-center">
          <RefreshCw className="w-12 h-12 text-brand-300 mx-auto mb-4 animate-spin" />
          <p className="text-ink-muted">加载中...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-20 h-20 rounded-full bg-leaf-100 flex items-center justify-center mx-auto mb-5">
            <Check className="w-10 h-10 text-leaf-600" />
          </div>
          <h3 className="text-lg font-serif font-semibold text-ink mb-2">暂无待审核内容</h3>
          <p className="text-sm text-ink-muted">所有打卡内容已审核完成，干得漂亮！</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => {
            const isLoading = actionLoading === record.id;
            const isExpanded = expandedNote === record.id;
            return (
              <div key={record.id} className="card p-5 card-hover">
                <div className="flex items-start gap-4">
                  <img
                    src={record.userAvatar}
                    alt={record.userName}
                    className="w-12 h-12 rounded-full ring-2 ring-white shadow-sm shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-ink">{record.userName}</span>
                          <span className="text-xs text-ink-muted">·</span>
                          <span className="text-sm text-brand-600 font-medium">{record.bookTitle}</span>
                        </div>
                        <p className="text-xs text-ink-muted mt-1 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" />
                          {record.createdAt}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-ink-muted">阅读进度</p>
                          <p className="text-lg font-bold text-leaf-600">{record.progress}%</p>
                        </div>
                        <div className="w-16 h-2 bg-brand-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-leaf-400 to-leaf-600 transition-all duration-500"
                            style={{ width: `${record.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div
                        className={`p-4 rounded-xl bg-paper border border-brand-100 cursor-pointer transition-all ${
                          isExpanded ? 'ring-2 ring-brand-200' : 'hover:border-brand-200'
                        }`}
                        onClick={() => toggleNote(record.id)}
                      >
                        <p
                          className={`text-sm text-ink-light leading-relaxed ${
                            isExpanded ? '' : 'line-clamp-3'
                          }`}
                          style={{
                            display: isExpanded ? 'block' : '-webkit-box',
                            WebkitLineClamp: isExpanded ? 'unset' : 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {record.note || <span className="text-ink-muted italic">（该打卡暂无笔记内容）</span>}
                        </p>
                        {record.note && record.note.length > 100 && (
                          <p className="text-xs text-brand-600 font-medium mt-2">
                            {isExpanded ? '收起内容' : '点击查看完整笔记'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-brand-50">
                      <button
                        onClick={() => handleReject(record.id)}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg border border-red-200 bg-white text-red-600 font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-sm"
                      >
                        {isLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        拒绝
                      </button>
                      <button
                        onClick={() => handleApprove(record.id)}
                        disabled={isLoading}
                        className="btn-leaf text-sm flex items-center gap-1.5 px-4 py-2"
                      >
                        {isLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        通过
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-light mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-brand-100">
          <h3 className="font-serif text-lg font-bold text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-brand-50 text-ink-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
