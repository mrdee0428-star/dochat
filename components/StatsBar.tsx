'use client';

import type { Product, ScrapeProgress } from '@/lib/types';

interface Props {
  products: Product[];
  progress: Record<string, ScrapeProgress>;
}

function formatVND(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n) + '₫';
}

export default function StatsBar({ products, progress }: Props) {
  const storeCount = new Set(products.map(p => p.storeId)).size;
  const prices = products.map(p => p.priceNumeric).filter(p => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

  const cheapest = products.find(p => p.priceNumeric === minPrice);

  const entries = Object.values(progress);
  const totalDuration = entries.reduce((sum, e) => sum + (e.duration || 0), 0);

  const stats = [
    {
      label: 'Tổng sản phẩm',
      value: products.length.toString(),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'text-brand-400',
    },
    {
      label: 'Cửa hàng',
      value: storeCount.toString(),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'text-blue-400',
    },
    {
      label: 'Giá thấp nhất',
      value: minPrice > 0 ? formatVND(minPrice) : '—',
      sub: cheapest ? cheapest.store : undefined,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      ),
      color: 'text-emerald-400',
    },
    {
      label: 'Giá trung bình',
      value: avgPrice > 0 ? formatVND(avgPrice) : '—',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-surface-100 border border-surface-300 rounded-xl p-4 animate-slide-up"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={stat.color}>{stat.icon}</span>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">{stat.label}</span>
          </div>
          <p className="text-lg font-bold text-zinc-200 font-mono">{stat.value}</p>
          {stat.sub && <p className="text-xs text-zinc-500 mt-0.5">{stat.sub}</p>}
        </div>
      ))}
    </div>
  );
}
