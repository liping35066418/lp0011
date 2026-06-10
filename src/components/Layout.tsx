import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Home,
  Library,
  BookMarked,
  CalendarCheck2,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Bell,
  ChevronRight,
  Wallet,
} from 'lucide-react';
import { useUserStore } from '@/store/user';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, refreshUser } = useUserStore();

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const menuItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/books', label: '图书', icon: Library },
    { path: '/my/borrow', label: '我的借阅', icon: BookMarked },
    { path: '/checkin', label: '读书打卡', icon: CalendarCheck2 },
    { path: '/admin', label: '后台管理', icon: Settings },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/books?keyword=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-brand-100 shadow-sm">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-brand-50 transition-colors"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="w-5 h-5 text-brand-600" /> : <Menu className="w-5 h-5 text-brand-600" />}
              </button>
              <NavLink to="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-leaf-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="font-serif text-xl font-bold text-ink tracking-wide">书香阁</h1>
                  <p className="text-xs text-ink-muted -mt-0.5">沉浸式阅读空间</p>
                </div>
              </NavLink>
            </div>

            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="搜索书名、作者、ISBN..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-brand-50/60 border border-brand-100 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 outline-none transition-all text-sm"
                />
              </div>
            </form>

            <div className="flex items-center gap-2 sm:gap-4">
              <NavLink to="/login" className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-brand-50 text-ink-light transition-colors">
                <Bell className="w-5 h-5" />
              </NavLink>

              {user ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200">
                    <Wallet className="w-4 h-4 text-amber-600" />
                    <div className="text-left leading-tight">
                      <p className="text-[10px] text-amber-600 font-medium">账户余额</p>
                      <p className="text-sm font-bold text-amber-700">¥ {user.balance?.toFixed(2) ?? '100.00'}</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-brand-50">
                    <img
                      src={user.avatar}
                      alt={user.nickname}
                      className="w-8 h-8 rounded-full ring-2 ring-white shadow-sm"
                    />
                    <div className="text-left">
                      <p className="text-sm font-medium text-ink leading-tight">{user.nickname}</p>
                      <p className="text-xs text-ink-muted leading-tight">{user.role === 'admin' ? '管理员' : '读者'}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-lg hover:bg-brand-50 text-ink-light transition-colors"
                    title="退出登录"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <NavLink to="/login" className="btn-primary text-sm py-2 px-4">
                  登录
                </NavLink>
              )}
            </div>
          </div>

          <nav className="md:hidden py-3 -mx-4 px-4 overflow-x-auto border-t border-brand-50">
            <div className="flex gap-6 min-w-max">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 text-sm font-medium pb-2 border-b-2 transition-all ${
                      active
                        ? 'border-brand-600 text-brand-600'
                        : 'border-transparent text-ink-light hover:text-brand-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </nav>
        </div>
      </header>

      <div className="flex-1 flex container mx-auto px-4 lg:px-6 py-6 gap-6">
        <aside
          className={`hidden lg:block w-60 shrink-0 ${
            sidebarOpen ? 'block' : 'hidden'
          } lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]`}
        >
          <div className="bg-white rounded-2xl shadow-book p-4 h-full overflow-y-auto">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider px-3 mb-3">导航菜单</p>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-200'
                        : 'text-ink-light hover:bg-brand-50 hover:text-brand-700'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-ink-muted group-hover:text-brand-500'}`} />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="w-4 h-4 opacity-80" />}
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-8 p-4 rounded-xl bg-gradient-to-br from-leaf-50 to-brand-50 border border-brand-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-leaf-100 flex items-center justify-center">
                  <CalendarCheck2 className="w-4 h-4 text-leaf-600" />
                </div>
                <p className="font-semibold text-ink text-sm">每日打卡</p>
              </div>
              <p className="text-xs text-ink-muted mb-3 leading-relaxed">坚持阅读，记录每一次进步，赢取成就徽章</p>
              <NavLink
                to="/checkin"
                className="btn-leaf w-full justify-center text-sm py-2 flex items-center gap-1.5"
              >
                去打卡
                <ChevronRight className="w-4 h-4" />
              </NavLink>
            </div>

            {user && (
              <div className="mt-4 p-4 rounded-xl bg-brand-50 border border-brand-100">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={user.avatar}
                    alt={user.nickname}
                    className="w-10 h-10 rounded-full ring-2 ring-white shadow-sm"
                  />
                  <div>
                    <p className="font-medium text-ink text-sm">{user.nickname}</p>
                    <p className="text-xs text-ink-muted">ID: {user.id}</p>
                  </div>
                </div>
                <div className="mb-3 p-2.5 rounded-lg bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-xs font-medium text-amber-700">账户余额</span>
                    </div>
                    <span className="text-sm font-bold text-amber-700">¥ {user.balance?.toFixed(2) ?? '100.00'}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-white rounded-lg py-2">
                    <p className="text-lg font-bold text-brand-600">12</p>
                    <p className="text-xs text-ink-muted">已借</p>
                  </div>
                  <div className="bg-white rounded-lg py-2">
                    <p className="text-lg font-bold text-leaf-600">28</p>
                    <p className="text-xs text-ink-muted">打卡</p>
                  </div>
                  <div className="bg-white rounded-lg py-2">
                    <p className="text-lg font-bold text-amber-600">5</p>
                    <p className="text-xs text-ink-muted">徽章</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 min-w-0 animate-fade-in">
          <Outlet />
        </main>
      </div>

      <footer className="mt-auto border-t border-brand-100 bg-white/50">
        <div className="container mx-auto px-4 lg:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand-500" />
              <p className="text-sm text-ink-muted font-serif">书香阁 · 让阅读成为一种生活方式</p>
            </div>
            <p className="text-xs text-ink-muted">© 2026 书香阁图书馆管理系统</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
