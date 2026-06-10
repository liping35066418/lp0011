import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Grid3X3, List, ChevronLeft, ChevronRight, BookOpen, X } from 'lucide-react';
import { apiGet } from '@/api/client';
import type { Book, Category, PagedResponse } from '../../shared/types';

interface CategoryTree {
  id: number;
  name: string;
  parentId: number;
  level: number;
  children: CategoryTree[];
}

function buildCategoryTree(categories: Category[]): CategoryTree[] {
  const map = new Map<number, CategoryTree>();
  const roots: CategoryTree[] = [];

  categories.forEach((cat) => {
    map.set(cat.id, {
      id: cat.id,
      name: cat.name,
      parentId: cat.parentId,
      level: cat.level,
      children: [],
    });
  });

  categories.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parentId === 0 || !map.has(cat.parentId)) {
      roots.push(node);
    } else {
      map.get(cat.parentId)!.children.push(node);
    }
  });

  return roots;
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="aspect-[3/4] bg-gradient-to-br from-brand-50 to-paper animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-5 bg-brand-50 rounded animate-pulse w-1/2" />
            <div className="h-5 bg-paper rounded animate-pulse w-3/4" />
            <div className="h-4 bg-paper rounded animate-pulse w-2/3" />
            <div className="flex items-center justify-between pt-2 border-t border-brand-50">
              <div className="h-3 bg-paper rounded animate-pulse w-1/4" />
              <div className="h-3 bg-leaf-50 rounded animate-pulse w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="card p-4 flex gap-4">
          <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-lg bg-gradient-to-br from-brand-50 to-paper animate-pulse shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-paper rounded animate-pulse w-3/4" />
                <div className="h-4 bg-paper rounded animate-pulse w-1/2" />
              </div>
              <div className="h-5 bg-leaf-50 rounded animate-pulse w-16" />
            </div>
            <div className="h-4 bg-paper rounded animate-pulse w-full" />
            <div className="h-4 bg-paper rounded animate-pulse w-5/6" />
            <div className="flex items-center gap-4 pt-1">
              <div className="h-4 bg-paper rounded animate-pulse w-1/4" />
              <div className="h-4 bg-leaf-50 rounded animate-pulse w-1/6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BookList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [booksLoading, setBooksLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');

  const keyword = searchParams.get('keyword') || '';
  const pageSize = 12;

  useEffect(() => {
    apiGet<Category[]>('/categories')
      .then((data) => {
        setCategories(buildCategoryTree(data));
      })
      .catch(() => {
        setCategories([]);
      })
      .finally(() => {
        setCategoriesLoading(false);
      });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [keyword, selectedCategory]);

  useEffect(() => {
    setBooksLoading(true);
    const params: Record<string, string | number | undefined> = {
      page,
      pageSize,
    };
    if (keyword) params.keyword = keyword;
    if (selectedCategory !== null) params.categoryId = selectedCategory;

    apiGet<PagedResponse<Book>>('/books', params)
      .then((data) => {
        setBooks(data.list);
        setTotal(data.total);
      })
      .catch(() => {
        setBooks([]);
        setTotal(0);
      })
      .finally(() => {
        setBooksLoading(false);
      });
  }, [page, selectedCategory, keyword]);

  useEffect(() => {
    setSearchInput(keyword);
  }, [keyword]);

  const totalPages = Math.ceil(total / pageSize);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) {
      searchParams.set('keyword', trimmed);
    } else {
      searchParams.delete('keyword');
    }
    setSearchParams(searchParams);
  };

  const clearKeyword = () => {
    setSearchInput('');
    searchParams.delete('keyword');
    setSearchParams(searchParams);
  };

  const handleCategoryClick = (catId: number | null) => {
    setSelectedCategory((prev) => (prev === catId ? null : catId));
  };

  const getCategoryName = (id: number): string => {
    const findInTree = (nodes: CategoryTree[]): string | undefined => {
      for (const node of nodes) {
        if (node.id === id) return node.name;
        if (node.children.length) {
          const found = findInTree(node.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    return findInTree(categories) || '未分类';
  };

  const getSelectedCategoryLabel = (): string => {
    if (selectedCategory === null) return '全部';
    return getCategoryName(selectedCategory);
  };

  const flatAllCategories = (): Category[] => {
    const result: Category[] = [];
    const traverse = (nodes: CategoryTree[]) => {
      nodes.forEach((node) => {
        result.push(node);
        if (node.children.length) traverse(node.children);
      });
    };
    traverse(categories);
    return result;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink">图书列表</h1>
          <p className="text-sm text-ink-muted mt-1">
            {booksLoading ? '加载中...' : `共找到 ${total} 本图书`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索书名、作者、ISBN..."
              className="pl-9 pr-9 py-2.5 rounded-xl bg-white border border-brand-100 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all w-56 sm:w-64 text-sm text-ink placeholder:text-ink-muted"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearKeyword}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-brand-50 text-ink-muted hover:text-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
          <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-brand-50">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-brand-600' : 'text-ink-muted'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-brand-600' : 'text-ink-muted'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {keyword && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink-muted">搜索关键词：</span>
          <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-700 font-medium inline-flex items-center gap-1.5">
            "{keyword}"
            <button onClick={clearKeyword} className="hover:text-brand-900 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
          {selectedCategory !== null && (
            <>
              <span className="text-ink-muted">+</span>
              <span className="px-3 py-1 rounded-full bg-leaf-50 text-leaf-700 font-medium inline-flex items-center gap-1.5">
                {getSelectedCategoryLabel()}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="hover:text-leaf-900 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            </>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-book p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-brand-500" />
          <span className="text-sm font-medium text-ink">分类筛选</span>
          {categoriesLoading && (
            <div className="ml-2 h-4 w-16 bg-paper rounded animate-pulse" />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCategoryClick(null)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedCategory === null
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-paper text-ink-light hover:bg-brand-50'
              }`}
            >
              全部
            </button>
            {categories.map((parent) => (
              <button
                key={parent.id}
                onClick={() => handleCategoryClick(parent.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === parent.id
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'bg-paper text-ink-light hover:bg-brand-50'
                }`}
              >
                {parent.name}
              </button>
            ))}
          </div>

          {categories.length > 0 &&
            categories.some((p) => p.children.length > 0) && (
              <div className="border-t border-brand-50 pt-3 flex flex-wrap gap-2">
                {categories.flatMap((parent) =>
                  parent.children.map((child) => {
                    const parentSelected = selectedCategory === parent.id;
                    const childSelected = selectedCategory === child.id;
                    const isActive = parentSelected || childSelected;
                    return (
                      <button
                        key={child.id}
                        onClick={() => handleCategoryClick(child.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          childSelected
                            ? 'bg-leaf-600 text-white shadow-sm'
                            : isActive
                            ? 'bg-leaf-50 text-leaf-700'
                            : 'bg-brand-50 text-ink-light hover:bg-brand-100'
                        }`}
                      >
                        {parent.name} · {child.name}
                      </button>
                    );
                  })
                )}
              </div>
            )}
        </div>
      </div>

      {booksLoading ? (
        viewMode === 'grid' ? <SkeletonGrid /> : <SkeletonList />
      ) : books.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen className="w-16 h-16 text-brand-200 mx-auto mb-4" />
          <p className="text-ink-muted font-medium">暂无符合条件的图书</p>
          <p className="text-sm text-ink-muted mt-2">
            试试更换关键词或选择其他分类
          </p>
          {(keyword || selectedCategory !== null) && (
            <button
              onClick={() => {
                clearKeyword();
                setSelectedCategory(null);
              }}
              className="mt-4 btn-secondary text-sm"
            >
              清除筛选条件
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {books.map((book) => (
            <div
              key={book.id}
              onClick={() => navigate(`/books/${book.id}`)}
              className="card card-hover cursor-pointer overflow-hidden group"
            >
              <div className="aspect-[3/4] overflow-hidden bg-brand-50">
                <img
                  src={book.cover}
                  alt={book.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-4">
                <span className="tag bg-leaf-50 text-leaf-700 mb-2">
                  {book.categoryName || getCategoryName(book.categoryId)}
                </span>
                <h3 className="font-serif font-semibold text-ink line-clamp-1 mt-2 group-hover:text-brand-600 transition-colors">
                  {book.title}
                </h3>
                <p className="text-sm text-ink-muted mt-1 line-clamp-1">{book.author}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-50">
                  <span className="text-xs text-ink-muted">馆藏 {book.totalStock}</span>
                  <span
                    className={`text-xs font-medium ${book.availableStock > 0 ? 'text-leaf-600' : 'text-red-500'}`}
                  >
                    {book.availableStock > 0 ? `可借 ${book.availableStock}` : '已借完'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {books.map((book) => (
            <div
              key={book.id}
              onClick={() => navigate(`/books/${book.id}`)}
              className="card card-hover cursor-pointer p-4 flex gap-4"
            >
              <div className="w-20 h-28 sm:w-24 sm:h-32 rounded-lg overflow-hidden bg-brand-50 shrink-0">
                <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-serif font-semibold text-ink text-lg hover:text-brand-600 transition-colors truncate">
                      {book.title}
                    </h3>
                    <p className="text-sm text-ink-muted mt-1 truncate">
                      {book.author} · {book.publisher}
                    </p>
                  </div>
                  <span className="tag bg-leaf-50 text-leaf-700 shrink-0">
                    {book.categoryName || getCategoryName(book.categoryId)}
                  </span>
                </div>
                <p className="text-sm text-ink-light mt-2 line-clamp-2 hidden sm:block">
                  {book.summary}
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="text-ink-muted">ISBN: {book.isbn}</span>
                  <span
                    className={book.availableStock > 0 ? 'text-leaf-600 font-medium' : 'text-red-500 font-medium'}
                  >
                    {book.availableStock > 0
                      ? `可借 ${book.availableStock}/${book.totalStock}`
                      : '已借完'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!booksLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5) {
              if (page > 3) pageNum = page - 2 + i;
              if (page > totalPages - 2) pageNum = totalPages - 4 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${
                  page === pageNum
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'hover:bg-brand-50 text-ink-light'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-brand-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
