'use client';
import { STORES } from '@/lib/stores';

interface Props { selected: string[]; onChange: (ids: string[]) => void; }

export default function StoreSelector({ selected, onChange }: Props) {
  const allSelected = selected.length === STORES.length;
  const toggleAll = () => onChange(allSelected ? [] : STORES.map(s => s.id));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);

  return (
    <div className="bg-surface-100 border border-surface-300 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-zinc-300">Cửa hàng ({selected.length}/{STORES.length})</label>
        <button type="button" onClick={toggleAll} className="text-xs text-brand-400 hover:text-brand-300 font-medium transition-colors">
          {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </button>
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {STORES.map(store => {
          const on = selected.includes(store.id);
          return (
            <button key={store.id} type="button" onClick={() => toggle(store.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-all duration-150
                ${on ? 'bg-surface-200 border border-surface-400 text-zinc-200' : 'bg-transparent border border-transparent text-zinc-500 hover:bg-surface-200/50 hover:text-zinc-400'}`}>
              <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all duration-150
                ${on ? 'border-brand-500 bg-brand-500' : 'border-zinc-600'}`}>
                {on && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: store.color }} />
              <span className="truncate">{store.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
