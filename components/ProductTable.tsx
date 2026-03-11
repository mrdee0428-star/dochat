'use client';

import { useState, useMemo } from 'react';
import type { Product } from '@/lib/types';

interface Props {
  products: Product[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: string;
  onSortChange: (s: 'price-asc' | 'price-desc' | 'name' | 'store') => void;
  onExport: () => void;
}

const PAGE_SIZE = 20;

function formatVND(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n) + '₫';
}

export default function ProductTable({
  products,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onExport,
}: Props) {
  const [page, setPage] = useState(0);
  const [storeFilter, setStoreFilter] = useState<string>('all');

  const filteredByStore = useMemo(() => {
    if (storeFilter === 'all') return products;
    return products.filter(p => p.storeId === storeFilter);
  }, [products, storeFilter]);

  const totalPages = Math.ceil(filteredByStore.length / PAGE_SIZE);
  const paged = filteredByStore.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const stores = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string; count: number }>();
    products.forEach(p => {
      if (!map.has(p.storeId)) {
        map.set(p.storeId, { id: p.storeId, name: p.store, color: p.storeColor, count: 0 });
      }
      map.get(p.storeId)!.count++;
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [products]);

  // Reset page when filters change
  const handleSearch = (q: string) => {
    onSearchChange(q);
    setPage(0);
  };

  const handleStoreFilter = (id: string) => {
    setStoreFilter(id);
    setPage(0);
  };

  return (
    <div className="bg-surface-100 border border-surface-300 rounded-2xl overflow-hidden animate-fade-in">
      {/* Toolbar */}
      <div className="p-4 border-b border-surface-300 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full bg-surface-200 border border-surface-400 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => onSortChange(e.target.value as any)}
            className="bg-surface-200 border border-surface-400 rounded-xl px-4 py-2.5 text-sm text-zinc-300 focus:border-brand-500 transition-colors appearance-none cursor-pointer"
          >
            <option value="price-asc">Giá: Thấp → Cao</option>
            <option value="price-desc">Giá: Cao → Thấp</option>
            <option value="name">Tên A-Z</option>
            <option value="store">Cửa hàng</option>
          </select>

          {/* Export */}
          <button
            onClick={onExport}
            className="flex items-center gap-2 bg-surface-200 border border-surface-400 rounded-xl px-4 py-2.5 text-sm text-zinc-300 hover:bg-surface-300 hover:text-zinc-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Xuất CSV
          </button>
        </div>

        {/* Store filter chips */}
        {stores.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleStoreFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150
                ${storeFilter === 'all'
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-surface-200 text-zinc-500 border border-surface-400 hover:text-zinc-400'
                }`}
            >
              Tất cả ({products.length})
            </button>
            {stores.map(s => (
              <button
                key={s.id}
                onClick={() => handleStoreFilter(s.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5
                  ${storeFilter === s.id
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'bg-surface-200 text-zinc-500 border border-surface-400 hover:text-zinc-400'
                  }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name} ({s.count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-300">
              <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-8">#</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sản phẩm</th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Giá</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cửa hàng</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-20">Link</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-zinc-500">
                  Không tìm thấy sản phẩm nào
                </td>
              </tr>
            ) : (
              paged.map((product, i) => {
                const globalIndex = page * PAGE_SIZE + i + 1;
                return (
                  <tr
                    key={`${product.storeId}-${i}`}
                    className="border-b border-surface-300/50 hover:bg-surface-200/50 transition-colors group"
                  >
                    <td className="py-3 px-4 text-zinc-600 font-mono text-xs">{globalIndex}</td>
                    <td className="py-3 px-4">
                      <p className="text-zinc-200 font-medium group-hover:text-white transition-colors leading-snug">
                        {product.name}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-brand-400 font-bold font-mono whitespace-nowrap">
                        {formatVND(product.priceNumeric)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: product.storeColor }}
                        />
                        <span className="text-zinc-400 whitespace-nowrap">{product.store}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {product.url ? (
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Xem
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-300">
          <span className="text-xs text-zinc-500">
            Hiển thị {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredByStore.length)} / {filteredByStore.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-200 border border-surface-400 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Trước
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors
                    ${page === pageNum
                      ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                      : 'bg-surface-200 text-zinc-500 border border-surface-400 hover:text-zinc-300'
                    }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-200 border border-surface-400 text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
