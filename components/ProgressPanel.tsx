'use client';
import { STORES } from '@/lib/stores';
import type { ScrapeProgress } from '@/lib/types';

export default function ProgressPanel({ progress }: { progress: Record<string, ScrapeProgress> }) {
  const entries = Object.values(progress);
  if (entries.length === 0) return null;

  const done = entries.filter(e => e.status === 'done').length;
  const errors = entries.filter(e => e.status === 'error').length;
  const pct = entries.length > 0 ? Math.round(((done + errors) / entries.length) * 100) : 0;

  return (
    <div className="bg-surface-100 border border-surface-300 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-300">Tiến trình crawl</h3>
        <span className="text-xs text-zinc-500 font-mono">{done + errors}/{entries.length} · {pct}%</span>
      </div>
      <div className="h-1 bg-surface-300 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
        {entries.map(entry => {
          const store = STORES.find(s => s.id === entry.storeId);
          if (!store) return null;
          const cls = { done: 'border-emerald-500/20 bg-emerald-500/5', error: 'border-red-500/20 bg-red-500/5', scraping: 'border-brand-500/20 bg-brand-500/5', pending: 'border-surface-300 bg-surface-200/50' }[entry.status];
          return (
            <div key={entry.storeId} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs border ${cls}`}>
              {entry.status === 'scraping' && <svg className="w-4 h-4 text-brand-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {entry.status === 'done' && <span className="text-emerald-400 flex-shrink-0">✓</span>}
              {entry.status === 'error' && <span className="text-red-400 flex-shrink-0">✗</span>}
              {entry.status === 'pending' && <span className="text-zinc-600 flex-shrink-0">○</span>}
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: store.color }} />
              <span className="truncate flex-1 text-zinc-300">{store.name}</span>
              <span className={`flex-shrink-0 ${entry.status === 'error' ? 'text-red-400' : entry.status === 'done' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                {entry.status === 'scraping' && (entry.currentPage ? `Trang ${entry.currentPage}...` : 'Đang crawl...')}
                {entry.status === 'done' && entry.message}
                {entry.status === 'error' && (entry.message || 'Lỗi')}
                {entry.status === 'pending' && 'Chờ'}
              </span>
              {entry.duration && entry.duration > 0 && <span className="text-zinc-600 font-mono flex-shrink-0">{(entry.duration / 1000).toFixed(0)}s</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
