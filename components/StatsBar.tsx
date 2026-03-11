'use client';
import type { Product } from '@/lib/types';

function fmt(n: number) { return new Intl.NumberFormat('vi-VN').format(n) + '₫'; }

export default function StatsBar({ products }: { products: Product[] }) {
  const storeCount = new Set(products.map(p => p.storeId)).size;
  const prices = products.map(p => p.priceNumeric).filter(p => p > 0);
  const min = prices.length > 0 ? Math.min(...prices) : 0;
  const avg = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const cheapest = products.find(p => p.priceNumeric === min);

  const stats = [
    { label: 'Tổng SP', value: String(products.length), color: 'text-brand-400' },
    { label: 'Cửa hàng', value: String(storeCount), color: 'text-blue-400' },
    { label: 'Giá thấp nhất', value: min > 0 ? fmt(min) : '—', sub: cheapest?.store, color: 'text-emerald-400' },
    { label: 'Giá TB', value: avg > 0 ? fmt(avg) : '—', color: 'text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
      {stats.map((s, i) => (
        <div key={i} className="bg-surface-100 border border-surface-300 rounded-xl p-4" style={{ animationDelay: `${i * 80}ms` }}>
          <span className={`text-xs uppercase tracking-wider ${s.color}`}>{s.label}</span>
          <p className="text-lg font-bold text-zinc-200 font-mono mt-1">{s.value}</p>
          {s.sub && <p className="text-xs text-zinc-500 mt-0.5">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}
