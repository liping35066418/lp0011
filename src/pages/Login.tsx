import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { BookOpen, User, Lock, Eye, EyeOff, ArrowRight, Mail, AlertCircle } from 'lucide-react';
import { apiPost } from '@/api/client';
import { useUserStore } from '@/store/user';

type Mode = 'login' | 'register';

export default function Login() {
  const [mode, setMode] = useState<Mode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useUserStore();

  const validateForm = (): string => {
    if (mode === 'register') {
      if (username.length < 3) return '用户名至少需要3个字符';
      if (password.length < 6) return '密码至少需要6个字符';
      if (password !== confirmPassword) return '两次输入的密码不一致';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const data = await apiPost<{ user: any; token: string }>('/auth/login', { username, password });
        login(data.user, data.token);
        navigate('/');
      } else {
        const data = await apiPost<{ user: any; token: string }>('/auth/register', {
          username,
          password,
          nickname: nickname || undefined,
        });
        login(data.user, data.token);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || (mode === 'login' ? '登录失败，请检查用户名和密码' : '注册失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setNickname('');
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-brand-100 rounded-full -translate-x-1/2 -translate-y-1/2 opacity-50 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-leaf-100 rounded-full translate-x-1/2 translate-y-1/2 opacity-50 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <NavLink to="/" className="inline-flex items-center gap-3 group">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-leaf-600 flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </NavLink>
          <h1 className="font-serif text-3xl font-bold text-ink mt-5">
            {mode === 'login' ? '欢迎回来' : '加入书香阁'}
          </h1>
          <p className="text-ink-muted mt-2">
            {mode === 'login' ? '登录书香阁，开启阅读之旅' : '注册账号，开启您的阅读旅程'}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-book p-8 animate-slide-up">
          <div className="flex mb-6 p-1 bg-paper rounded-2xl">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
                mode === 'login'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-ink-muted hover:text-ink-light'
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
                mode === 'register'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-ink-muted hover:text-ink-light'
              }`}
            >
              注册
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink-light mb-2">用户名</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={mode === 'register' ? '至少3个字符' : '请输入用户名'}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-paper border border-brand-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-ink-light mb-2">昵称 <span className="text-ink-muted font-normal">(可选)</span></label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="给您取个好听的名字"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-paper border border-brand-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink-light mb-2">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? '至少6个字符' : '请输入密码'}
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-paper border border-brand-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-brand-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-ink-light mb-2">确认密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-paper border border-brand-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-brand-500 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-ink-light cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-brand-300 text-brand-600 focus:ring-brand-200" />
                  记住我
                </label>
                <a href="#" className="text-brand-600 hover:text-brand-700 font-medium">忘记密码？</a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 text-base flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  {mode === 'login' ? '登录' : '注册'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-5 p-3 rounded-xl bg-brand-50 border border-brand-100">
              <p className="text-xs text-brand-700 leading-relaxed">
                <span className="font-medium">测试账号：</span>
                admin / admin123 &nbsp;·&nbsp; zhangsan / user123
              </p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-brand-100 text-center">
            <p className="text-sm text-ink-muted">
              {mode === 'login' ? (
                <>
                  还没有账号？
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="text-brand-600 hover:text-brand-700 font-medium ml-1"
                  >
                    立即注册
                  </button>
                </>
              ) : (
                <>
                  已有账号？
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-brand-600 hover:text-brand-700 font-medium ml-1"
                  >
                    去登录
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-ink-muted mt-8">
          © 2026 书香阁图书馆管理系统 · 让阅读成为一种生活方式
        </p>
      </div>
    </div>
  );
}
