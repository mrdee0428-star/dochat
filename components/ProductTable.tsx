'use client';
import { useState, useMemo } from 'react';
import type { Product } from '@/lib/types';
import { fuzzyMatch } from '@/lib/search';

interface Props {
  products: Product[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: string;
  onSortChange: (s: 'price-asc' | 'price-desc' | 'name' | 'store') => void;
  onExport: () => void;
}

const PAGE_SIZE = 30;

export default function ProductTable({ products, searchQuery, onSearchChange, sortBy, onSortChange, onExport }: Props) {
  const [page, setPage] = useState(0);
  const [storeFilter, setStoreFilter] = useState('all');

  const filtered = useMemo(() => {
    let f = products;
    if (storeFilter !== 'all') f = f.filter(p => p.storeId === storeFilter);
    if (searchQuery.trim()) f = f.filter(p => fuzzyMatch(searchQuery, p.name) || fuzzyMatch(searchQuery, p.store));
    return f;
  }, [products, storeFilter, searchQuery]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const stores = useMemo(() => {
    const m = new Map<string, { id: string; name: string; color: string; count: number }>();
    products.forEach(p => { const e = m.get(p.storeId); if (e) e.count++; else m.set(p.storeId, { id: p.storeId, name: p.store, color: p.storeColor, count: 1 }); });
    return Array.from(m.values()).sort((a, b) => b.count - a.count);
  }, [products]);

  return (
    <div className="bg-surface-100 border border-surface-300 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-surface-300 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={searchQuery} onChange={e => { onSearchChange(e.target.value); setPage(0); }}
              placeholder="Tìm: 16 promax, samsung s24..."
              className="w-full bg-surface-200 border border-surface-400 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-brand-500 transition-colors" />
          </div>
          <select value={sortBy} onChange={e => onSortChange(e.target.value as any)}
            className="bg-surface-200 border border-surface-400 rounded-xl px-3 py-2.5 text-sm text-zinc-300 cursor-pointer">
            <option value="price-asc">Giá ↑</option>
            <option value="price-desc">Giá ↓</option>
            <option value="name">Tên</option>
            <option value="store">Shop</option>
          </select>
          <button onClick={onExport} className="bg-surface-200 border border-surface-400 rounded-xl px-3 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 whitespace-nowrap">CSV</button>
        </div>
        {stores.length > 1 && (
          <div className="flex flex-wrap gap-1">
            <button onClick={() => { setStoreFilter('all'); setPage(0); }}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${storeFilter === 'all' ? 'bg-brand-500/20 text-brand-400 border-brand-500/30' : 'bg-surface-200 text-zinc-500 border-surface-400'}`}>
              Tất cả ({products.length})
            </button>
            {stores.map(s => (
              <button key={s.id} onClick={() => { setStoreFilter(s.id); setPage(0); }}
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border flex items-center gap-1 ${storeFilter === s.id ? 'bg-brand-500/20 text-brand-400 border-brand-500/30' : 'bg-surface-200 text-zinc-500 border-surface-400'}`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.name} ({s.count})
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-surface-300">
            <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-zinc-500 uppercase w-8">#</th>
            <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-zinc-500 uppercase">Sản phẩm</th>
            <th className="text-right py-2.5 px-4 text-[10px] font-semibold text-zinc-500 uppercase">Giá</th>
            <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-zinc-500 uppercase">Shop</th>
            <th className="text-center py-2.5 px-4 text-[10px] font-semibold text-zinc-500 uppercase w-14">Link</th>
          </tr></thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-zinc-500 text-sm">Không tìm thấy</td></tr>
            ) : paged.map((p, i) => (
              <tr key={`${p.storeId}-${i}`} className="border-b border-surface-300/50 hover:bg-surface-200/50 transition-colors">
                <td className="py-2.5 px-4 text-zinc-600 font-mono text-xs">{page * PAGE_SIZE + i + 1}</td>
                <td className="py-2.5 px-4 text-zinc-200 font-medium">{p.name}</td>
                <td className="py-2.5 px-4 text-right text-brand-400 font-bold font-mono whitespace-nowrap">{p.price}</td>
                <td className="py-2.5 px-4">
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.storeColor }} /><span className="text-zinc-400 whitespace-nowrap text-xs">{p.store}</span></span>
                </td>
                <td className="py-2.5 px-4 text-center">
                  {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 text-xs">↗</a> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-surface-300 text-xs">
          <span className="text-zinc-500">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}</span>
          <div className="flex gap-1">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-2.5 py-1 rounded bg-surface-200 border border-surface-400 text-zinc-400 disabled:opacity-30">←</button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-2.5 py-1 rounded bg-surface-200 border border-surface-400 text-zinc-400 disabled:opacity-30">→</button>
          </div>
        </div>
      )}
    </div>
  );
}
