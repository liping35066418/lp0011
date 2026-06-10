import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked, Clock, AlertTriangle, CheckCircle2, RefreshCw, ChevronRight, BookOpen, RotateCcw, LogIn, Wallet, Info, X } from 'lucide-react';
import { apiGet, apiPut } from '@/api/client';
import { useUserStore } from '@/store/user';
import type { BorrowRecord, BorrowStatusSummary, BorrowRules, ReturnResult } from '../../shared/types';

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

function calcOverdueDays(dueDateStr: string): number {
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - due.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export default function MyBorrow() {
  const navigate = useNavigate();
  const { user, updateBalance, refreshUser } = useUserStore();
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [summary, setSummary] = useState<BorrowStatusSummary | null>(null);
  const [rules, setRules] = useState<BorrowRules | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'renew' | 'return'; record: BorrowRecord } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [returnResult, setReturnResult] = useState<ReturnResult | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recordsData, summaryData, rulesData] = await Promise.all([
        apiGet<BorrowRecord[]>('/borrow/my', filter !== 'all' ? { status: filter } : undefined),
        apiGet<BorrowStatusSummary>('/borrow/status'),
        apiGet<BorrowRules>('/borrow/rules'),
      ]);
      setRecords(recordsData);
      setSummary(summaryData);
      setRules(rulesData);
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

  const totalFine = useMemo(() => {
    if (!rules) return 0;
    return records.reduce((sum, r) => {
      if (r.status === 'overdue') {
        const days = calcOverdueDays(r.dueDate);
        return sum + days * rules.overdueFinePerDay;
      }
      return sum;
    }, 0);
  }, [records, rules]);

  const handleRenew = (record: BorrowRecord) => {
    setConfirmAction({ type: 'renew', record });
    setActionError(null);
  };

  const handleReturn = (record: BorrowRecord) => {
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
        setConfirmAction(null);
        fetchData();
      } else {
        const result = await apiPut<ReturnResult>(`/borrow/${confirmAction.record.id}/return`);
        updateBalance(result.newBalance);
        setReturnResult(result);
        setConfirmAction(null);
        fetchData();
        refreshUser();
      }
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

  const getRecordFineInfo = (record: BorrowRecord) => {
    if (record.status !== 'overdue' || !rules) return null;
    const days = calcOverdueDays(record.dueDate);
    const fine = Number((days * rules.overdueFinePerDay).toFixed(2));
    return { days, fine };
  };

  const getReturnPreviewFine = (record: BorrowRecord) => {
    if (!rules) return null;
    const days = calcOverdueDays(record.dueDate);
    const fine = days > 0 ? Number((days * rules.overdueFinePerDay).toFixed(2)) : 0;
    return { days, fine };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink">我的借阅</h1>
          <p className="text-sm text-ink-muted mt-1">管理您的图书借阅记录</p>
        </div>
        {user && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200">
            <Wallet className="w-5 h-5 text-amber-600" />
            <div className="text-left">
              <p className="text-[11px] text-amber-600 font-medium">账户余额</p>
              <p className="text-base font-bold text-amber-700">¥ {user.balance?.toFixed(2) ?? '100.00'}</p>
            </div>
            {totalFine > 0 && (
              <div className="ml-3 pl-3 border-l border-amber-300 text-right">
                <p className="text-[11px] text-red-500 font-medium">待付罚金</p>
                <p className="text-base font-bold text-red-600">¥ {totalFine.toFixed(2)}</p>
              </div>
            )}
          </div>
        )}
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

      {rules && summary && summary.overdue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 font-medium">
              您有 <span className="font-bold">{summary.overdue}</span> 本图书已逾期，当前逾期罚金费率：
              <span className="font-bold">¥ {rules.overdueFinePerDay.toFixed(2)}</span> / 天，
              累计待付罚金 <span className="font-bold">¥ {totalFine.toFixed(2)}</span>
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === opt.key
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-white text-ink-light hover:bg-brand-50 border border-brand-100'
            }`}
          >
            {opt.label}
            {opt.key === 'overdue' && summary && summary.overdue > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full">
                {summary.overdue}
              </span>
            )}
            {opt.key === 'borrowing' && summary && summary.borrowing > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-brand-500 text-white text-[10px] rounded-full">
                {summary.borrowing}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-12 text-center">
          <RefreshCw className="w-12 h-12 text-brand-300 mx-auto mb-4 animate-spin" />
          <p className="text-ink-muted">加载中...</p>
        </div>
      ) : error ? (
        <div className="card p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={fetchData} className="btn-secondary text-sm">
            重新加载
          </button>
        </div>
      ) : records.length === 0 ? (
        <div className="card p-12 text-center">
          <BookMarked className="w-16 h-16 text-brand-200 mx-auto mb-4" />
          <h3 className="text-lg font-serif font-semibold text-ink mb-2">暂无借阅记录</h3>
          <p className="text-sm text-ink-muted mb-6">去书架看看，找本喜欢的书借阅吧</p>
          <button onClick={() => navigate('/books')} className="btn-primary flex items-center gap-2 mx-auto">
            <BookOpen className="w-4 h-4" />
            浏览图书
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => {
            const cfg = statusConfig[record.status];
            const StatusIcon = cfg.icon;
            const fineInfo = getRecordFineInfo(record);

            return (
              <div key={record.id} className="card p-5 card-hover">
                <div className="flex gap-4">
                  <div
                    className="w-16 h-22 rounded-lg bg-brand-50 overflow-hidden shrink-0 cursor-pointer"
                    onClick={() => navigate(`/books/${record.bookId}`)}
                  >
                    {record.bookCover ? (
                      <img src={record.bookCover} alt={record.bookTitle} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-brand-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3
                          className="font-medium text-ink truncate cursor-pointer hover:text-brand-600 transition-colors"
                          onClick={() => navigate(`/books/${record.bookId}`)}
                        >
                          {record.bookTitle}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`tag ${cfg.tagClass} flex items-center gap-1`}>
                            <StatusIcon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                          {record.renewCount > 0 && (
                            <span className="tag bg-sky-50 text-sky-600">
                              已续借{record.renewCount}次
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {canRenew(record) && (
                          <button
                            onClick={() => handleRenew(record)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            续借
                          </button>
                        )}
                        {canReturn(record) && (
                          <button
                            onClick={() => handleReturn(record)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                              record.status === 'overdue'
                                ? 'border border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                                : 'border border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100'
                            }`}
                          >
                            <RotateCcw className="w-3 h-3" />
                            归还
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-ink-muted text-xs">借阅日期</p>
                        <p className="text-ink font-medium">{record.borrowDate}</p>
                      </div>
                      <div>
                        <p className="text-ink-muted text-xs">应还日期</p>
                        <p className={record.status === 'overdue' ? 'text-red-600 font-medium' : 'text-ink font-medium'}>
                          {record.dueDate}
                        </p>
                      </div>
                      {record.returnDate && (
                        <div>
                          <p className="text-ink-muted text-xs">归还日期</p>
                          <p className="text-ink font-medium">{record.returnDate}</p>
                        </div>
                      )}
                    </div>

                    {fineInfo && (
                      <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-red-700 font-medium">
                              已逾期 <span className="font-bold">{fineInfo.days}</span> 天
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-red-500">累计罚金</p>
                            <p className="text-lg font-bold text-red-600">¥ {fineInfo.fine.toFixed(2)}</p>
                          </div>
                        </div>
                        <p className="text-xs text-red-400 mt-1">
                          逾期天数 × ¥{rules!.overdueFinePerDay.toFixed(2)}/天 = ¥{fineInfo.fine.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => !actionLoading && setConfirmAction(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-brand-100">
              <h3 className="font-serif text-lg font-bold text-ink">
                {confirmAction.type === 'renew' ? '确认续借' : '确认归还'}
              </h3>
              <button
                onClick={() => !actionLoading && setConfirmAction(null)}
                className="p-1.5 rounded-lg hover:bg-brand-50 text-ink-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-ink-light mb-2">
                {confirmAction.type === 'renew' ? '确定要续借这本图书吗？' : '确定要归还这本图书吗？'}
              </p>
              <p className="font-medium text-ink mb-4">《{confirmAction.record.bookTitle}》</p>

              {confirmAction.type === 'renew' && (
                <div className="p-3 rounded-lg bg-sky-50 border border-sky-200">
                  <p className="text-sm text-sky-700">
                    续借后将延长 <span className="font-bold">{rules?.maxBorrowDays ?? 30}</span> 天借阅期限
                  </p>
                </div>
              )}

              {confirmAction.type === 'return' && (() => {
                const preview = getReturnPreviewFine(confirmAction.record);
                if (preview && preview.fine > 0) {
                  return (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-700 font-medium">逾期归还将产生罚金</span>
                      </div>
                      <p className="text-sm text-red-600">
                        逾期天数：<span className="font-bold">{preview.days}</span> 天 × ¥{rules!.overdueFinePerDay.toFixed(2)}/天 = 
                        <span className="font-bold text-lg"> ¥{preview.fine.toFixed(2)}</span>
                      </p>
                      <p className="text-sm text-red-600 mt-1">
                        当前余额：¥{user?.balance?.toFixed(2) ?? '100.00'}，归还后余额：
                        <span className="font-bold">¥{((user?.balance ?? 100) - preview.fine).toFixed(2)}</span>
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="p-3 rounded-lg bg-leaf-50 border border-leaf-200">
                    <p className="text-sm text-leaf-700">
                      <CheckCircle2 className="w-4 h-4 inline mr-1" />
                      此书未逾期，归还不产生罚金
                    </p>
                  </div>
                );
              })()}

              {actionError && (
                <p className="mt-3 text-sm text-red-500">{actionError}</p>
              )}

              <div className="flex gap-3 justify-end mt-5">
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={actionLoading}
                  className="btn-secondary"
                >
                  取消
                </button>
                <button
                  onClick={confirmExecute}
                  disabled={actionLoading}
                  className={confirmAction.type === 'return' && getReturnPreviewFine(confirmAction.record)?.fine
                    ? 'bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all duration-300 active:scale-95 disabled:opacity-70 flex items-center gap-2'
                    : 'btn-primary flex items-center gap-2'
                  }
                >
                  {actionLoading ? '处理中...' : confirmAction.type === 'renew' ? '确认续借' : '确认归还'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {returnResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setReturnResult(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-brand-100">
              <h3 className="font-serif text-lg font-bold text-ink">归还结果</h3>
              <button
                onClick={() => setReturnResult(null)}
                className="p-1.5 rounded-lg hover:bg-brand-50 text-ink-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <div className="text-center mb-5">
                <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${
                  returnResult.fineAmount > 0 ? 'bg-amber-100' : 'bg-leaf-100'
                }`}>
                  {returnResult.fineAmount > 0 ? (
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 text-leaf-600" />
                  )}
                </div>
                <p className="font-medium text-ink">《{returnResult.record.bookTitle}》已归还</p>
              </div>

              {returnResult.fineAmount > 0 ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600 mb-2">逾期归还，已扣除罚金</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-500">逾期天数</span>
                      <span className="font-bold text-red-700">{returnResult.overdueDays} 天</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-red-500">扣除罚金</span>
                      <span className="font-bold text-red-700 text-lg">¥ {returnResult.fineAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-amber-600">原余额</span>
                      <span className="text-ink font-medium">¥ {returnResult.previousBalance.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-amber-600">扣除</span>
                      <span className="text-red-600 font-medium">- ¥ {returnResult.fineAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-amber-200 mt-2 pt-2 flex items-center justify-between">
                      <span className="text-sm text-amber-700 font-medium">当前余额</span>
                      <span className="font-bold text-amber-700 text-lg">¥ {returnResult.newBalance.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-leaf-50 border border-leaf-200">
                  <p className="text-sm text-leaf-700">
                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                    按时归还，无罚金产生
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-leaf-600">账户余额</span>
                    <span className="font-bold text-leaf-700">¥ {returnResult.newBalance.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setReturnResult(null)}
                className="btn-primary w-full mt-5 justify-center"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
