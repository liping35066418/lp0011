import { create } from 'zustand';
import type { User } from '../../shared/types';
import { apiGet } from '@/api/client';

interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  checkAuth: () => void;
  refreshUser: () => Promise<void>;
  updateBalance: (balance: number) => void;
}

const defaultUser: User = {
  id: 1,
  username: 'reader',
  nickname: '书虫读者',
  avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=%E4%B9%A6%E8%99%AB&backgroundColor=8B4513,2E8B57',
  role: 'user',
  balance: 100.0,
};

export const useUserStore = create<UserStore>((set, get) => ({
  user: defaultUser,
  isAuthenticated: true,
  token: localStorage.getItem('token'),

  setUser: (user) => set({ user }),

  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token });
  },

  login: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: () => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser) as User;
        set({ user, token, isAuthenticated: true });
      } catch {
        set({ user: defaultUser, token: null, isAuthenticated: true });
      }
    } else {
      set({ user: defaultUser, isAuthenticated: true });
    }
  },

  refreshUser: async () => {
    const token = get().token;
    if (!token) return;
    try {
      const user = await apiGet<User>('/auth/me');
      set({ user });
      localStorage.setItem('user', JSON.stringify(user));
    } catch {
      // ignore
    }
  },

  updateBalance: (balance: number) => {
    const user = get().user;
    if (user) {
      const updatedUser = { ...user, balance };
      set({ user: updatedUser });
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  },
}));
