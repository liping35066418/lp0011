import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked, Clock, AlertTriangle, CheckCircle2, RefreshCw, ChevronRight, BookOpen, RotateCcw, LogIn } from 'lucide-react';
import { apiGet, apiPut } from '@/api/client';
import type { BorrowRecord, BorrowStatusSummary } from '../../shared/types';

const statusConfig = {
  borrowing: { label: '借阅中', tagClass: 'tag-borrowing', icon: Clock },
  returned: { label: '已归还', tagClass: 'tag-returned', icon: CheckCircle2 },
  overdue: { label: '已逾期', tagClass: 'tag-overdue', icon: AlertTriangle },
  renewed: { label: '已续借', tagClass: 'bg-sky-100 text-sky-700', icon: RefreshCw },
};

const MAX_RENEW_TIMES = 2;

const filterOptions = [
  { key: 'all', label: '全部' },
  { key: 'borrowing', label: '借阅中' },
  { key: 'returned', label: '已归还' },
  { key: 'overdue', label: '已逾期' },
];

export default function MyBorrow() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [summary, setSummary] = useState<BorrowStatusSummary | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'renew' | 'return'; record: BorrowRecord } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recordsData, summaryData] = await Promise.all([
        apiGet<BorrowRecord[]>('/borrow/my', filter !== 'all' ? { status: filter } : undefined),
        apiGet<BorrowStatusSummary>('/borrow/status'),
      ]);
      setRecords(recordsData);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 60000);
    return () => clearInterval(interval);
  }, [filter]);

  const handleRenew = async (record: BorrowRecord) => {
    setConfirmAction({ type: 'renew', record });
    setActionError(null);
  };

  const handleReturn = async (record: BorrowRecord) => {
    setConfirmAction({ type: 'return', record });
    setActionError(null);
  };

  const confirmExecute = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    setActionError(null);
    try {
      if (confirmAction.type === 'renew') {
        await apiPut(`/borrow/${confirmAction.record.id}/renew`);
      } else {
        await apiPut(`/borrow/${confirmAction.record.id}/return`);
      }
      setConfirmAction(null);
      fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const canRenew = (record: BorrowRecord) => {
    if (record.status === 'overdue' || record.status === 'returned') return false;
    if (record.renewCount >= MAX_RENEW_TIMES) return false;
    return true;
  };

  const canReturn = (record: BorrowRecord) => {
    return record.status !== 'returned';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-ink">我的借阅</h1>
        <p className="text-sm text-ink-muted mt-1">管理您的图书借阅记录</p>
      </div>

      {summary && summary.willDueSoon > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-800 font-medium">
              您有 <span className="font-bold">{summary.willDueSoon}</span> 本书将在3天内到期，请及时归还或续借
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-100 flex items-center justify-center">
              <BookMarked className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-xs text-ink-muted">借阅总数</p>
              <p className="text-2xl font-bold text-ink">{summary?.total ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-leaf-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-leaf-600" />
            </div>
            <div>
              <p className="text-xs text-ink-muted">借阅中</p>
              <p className="text-2xl font-bold text-leaf-600">{summary?.borrowing ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-ink-muted">已逾期</p>
              <p className="text-2xl font-bold text-red-500">{summary?.overdue ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-ink-muted">将到期</p>
              <p className="text-2xl font-bold text-amber-600">{summary?.willDueSoon ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-2 flex flex-wrap gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === opt.key
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-ink-light hover:bg-brand-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && records.length === 0 ? (
        <div className="card p-12 text-center">
          <RefreshCw className="w-12 h-12 text-brand-300 mx-auto mb-4 animate-spin" />
          <p className="text-ink-muted">加载中...</p>
        </div>
      ) : error ? (
        <div className="card p-12 text-center">
          <AlertTriangle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <p className="text-red-500 font-medium mb-2">加载失败</p>
          <p className="text-sm text-ink-muted mb-4">{error}</p>
          <button onClick={fetchData} className="btn-primary">
            重新加载
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen className="w-16 h-16 text-brand-200 mx-auto mb-4" />
          <p className="text-ink-muted">暂无借阅记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => {
            const StatusIcon = statusConfig[record.status].icon;
            return (
              <div key={record.id} className="card p-4 flex gap-4">
                <div
                  onClick={() => navigate(`/books/${record.bookId}`)}
                  className="w-20 h-28 sm:w-24 sm:h-32 rounded-lg overflow-hidden bg-brand-50 shrink-0 cursor-pointer hover:ring-2 hover:ring-brand-300 transition-all"
                >
                  <img src={record.bookCover} alt={record.bookTitle} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3
                        onClick={() => navigate(`/books/${record.bookId}`)}
                        className="font-serif font-semibold text-ink text-lg hover:text-brand-600 transition-colors cursor-pointer truncate"
                      >
                        {record.bookTitle}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-ink-muted">
                        <span className="flex items-center gap-1">
                          <LogIn className="w-3.5 h-3.5" />
                          借阅日期：{record.borrowDate}
                        </span>
                        <span className="flex items-center gap-1">
                          <ChevronRight className="w-3.5 h-3.5" />
                          到期日期：{record.dueDate}
                        </span>
                      </div>
                      {record.renewCount > 0 && (
                        <p className="text-xs text-sky-600 mt-1">
                          已续借 {record.renewCount} 次 / 最多 {MAX_RENEW_TIMES} 次
                        </p>
                      )}
                    </div>
                    <span className={`tag ${statusConfig[record.status].tagClass} shrink-0 items-center gap-1`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig[record.status].label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-3">
                    <button
                      onClick={() => handleRenew(record)}
                      disabled={!canRenew(record)}
                      className={`btn-secondary text-sm px-4 py-2 flex items-center gap-1.5 ${
                        !canRenew(record) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title={
                        !canRenew(record)
                          ? record.status === 'overdue'
                            ? '逾期图书无法续借'
                            : record.status === 'returned'
                            ? '已归还图书无法续借'
                            : '已达到最大续借次数'
                          : undefined
                      }
                    >
                      <RotateCcw className="w-4 h-4" />
                      续借
                    </button>
                    <button
                      onClick={() => handleReturn(record)}
                      disabled={!canReturn(record)}
                      className={`btn-leaf text-sm px-4 py-2 flex items-center gap-1.5 ${
                        !canReturn(record) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      归还
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    confirmAction.type === 'renew' ? 'bg-sky-100' : 'bg-leaf-100'
                  }`}
                >
                  {confirmAction.type === 'renew' ? (
                    <RotateCcw className={`w-6 h-6 text-sky-600 ${actionLoading ? 'animate-spin' : ''}`} />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-leaf-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-ink">
                    确认{confirmAction.type === 'renew' ? '续借' : '归还'}
                  </h3>
                  <p className="text-sm text-ink-muted">《{confirmAction.record.bookTitle}》</p>
                </div>
              </div>
              <p className="text-ink-light">
                {confirmAction.type === 'renew'
                  ? '续借后借阅期限将延长，确认要续借此书吗？'
                  : '归还后将从您的借阅列表中移除，确认要归还此书吗？'}
              </p>
              {actionError && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{actionError}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-4 bg-paper/50 border-t border-brand-100">
              <button
                onClick={() => {
                  setConfirmAction(null);
                  setActionError(null);
                }}
                disabled={actionLoading}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                onClick={confirmExecute}
                disabled={actionLoading}
                className={`flex-1 ${confirmAction.type === 'renew' ? 'bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-300 active:scale-95' : 'btn-leaf'}`}
              >
                {actionLoading ? '处理中...' : `确认${confirmAction.type === 'renew' ? '续借' : '归还'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
