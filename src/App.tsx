import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { BookOpen, Home as HomeIcon } from 'lucide-react';
import { useUserStore } from '@/store/user';
import Home from '@/pages/Home';
import BookList from '@/pages/BookList';
import BookDetail from '@/pages/BookDetail';
import MyBorrow from '@/pages/MyBorrow';
import Checkin from '@/pages/Checkin';
import Admin from '@/pages/Admin';
import Login from '@/pages/Login';
import Layout from '@/components/Layout';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center py-16">
      <div className="relative">
        <div className="absolute inset-0 bg-brand-200/30 blur-3xl rounded-full" />
        <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center shadow-lg shadow-brand-100">
          <BookOpen className="w-16 h-16 text-brand-500" />
        </div>
      </div>

      <div className="mt-10 text-center space-y-3">
        <h2 className="text-3xl font-serif font-bold text-ink">页面走丢了</h2>
        <p className="text-ink-muted max-w-sm">
          您访问的页面不存在或已被移除，让我们带您回到书海中继续探索吧。
        </p>
      </div>

      <button
        onClick={() => navigate('/')}
        className="mt-10 btn-primary px-8 py-3 flex items-center gap-2"
      >
        <HomeIcon className="w-5 h-5" />
        返回首页
      </button>
    </div>
  );
}

export default function App() {
  const checkAuth = useUserStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="books" element={<BookList />} />
          <Route path="books/:id" element={<BookDetail />} />
          <Route path="my/borrow" element={<MyBorrow />} />
          <Route path="checkin" element={<Checkin />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}
