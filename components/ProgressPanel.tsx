'use client';
import { STORES } from '@/lib/stores';
import type { ScrapeProgress } from '@/lib/types';

interface Props { progress: Record<string, ScrapeProgress>; }

export default function ProgressPanel({ progress }: Props) {
  const entries = Object.values(progress);
  if (entries.length === 0) {
    return (
      <div className="bg-surface-100 border border-surface-300 rounded-2xl p-8 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-200 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <p className="text-zinc-500 text-sm">Nhập API key và nhấn "Bắt đầu crawl"</p>
        </div>
      </div>
    );
  }

  const done = entries.filter(e => e.status === 'done').length;
  const errors = entries.filter(e => e.status === 'error').length;
  const total = entries.length;
  const pct = total > 0 ? Math.round(((done + errors) / total) * 100) : 0;

  return (
    <div className="bg-surface-100 border border-surface-300 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300">Tiến trình</h3>
        <span className="text-xs text-zinc-500 font-mono">{done + errors}/{total} · {pct}%</span>
      </div>
      <div className="h-1.5 bg-surface-300 rounded-full overflow-hidden mb-4">
        <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {entries.map(entry => {
          const store = STORES.find(s => s.id === entry.storeId);
          if (!store) return null;
          const statusClass = {
            done: 'bg-emerald-500/5 border-emerald-500/20',
            error: 'bg-red-500/5 border-red-500/20',
            scraping: 'bg-brand-500/5 border-brand-500/20',
            pending: 'bg-surface-200/50 border-surface-300',
          }[entry.status];
          return (
            <div key={entry.storeId} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm border transition-all duration-300 ${statusClass}`}>
              <div className="flex-shrink-0">
                {entry.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-zinc-600" />}
                {entry.status === 'scraping' && (
                  <svg className="w-5 h-5 text-brand-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {entry.status === 'done' && <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                {entry.status === 'error' && <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: store.color }} />
                  <span className={`truncate font-medium ${entry.status === 'pending' ? 'text-zinc-500' : 'text-zinc-300'}`}>{store.name}</span>
                </div>
              </div>
              <div className="flex-shrink-0 text-right">
                {entry.status === 'scraping' && <span className="text-xs text-brand-400">{entry.page ? `Trang ${entry.page}...` : 'Đang crawl...'}</span>}
                {entry.status === 'done' && <span className="text-xs text-emerald-400 font-medium">{entry.message}</span>}
                {entry.status === 'error' && <span className="text-xs text-red-400 truncate max-w-40 block" title={entry.message}>Lỗi</span>}
                {entry.status === 'pending' && <span className="text-xs text-zinc-600">Chờ...</span>}
              </div>
              {entry.duration && entry.duration > 0 && <span className="text-xs text-zinc-600 font-mono flex-shrink-0">{(entry.duration / 1000).toFixed(1)}s</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
