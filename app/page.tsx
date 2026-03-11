'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { STORES } from '@/lib/stores';
import type { Product, ScrapeProgress } from '@/lib/types';
import Header from '@/components/Header';
import ApiKeyInput from '@/components/ApiKeyInput';
import StoreSelector from '@/components/StoreSelector';
import ProgressPanel from '@/components/ProgressPanel';
import ProductTable from '@/components/ProductTable';
import StatsBar from '@/components/StatsBar';

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [selectedStores, setSelectedStores] = useState<string[]>(STORES.map(s => s.id));
  const [progress, setProgress] = useState<Record<string, ScrapeProgress>>({});
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'name' | 'store'>('price-asc');
  const abortRef = useRef(false);

  const handleScrape = useCallback(async () => {
    if (!apiKey.trim() || selectedStores.length === 0) return;

    setIsRunning(true);
    setAllProducts([]);
    abortRef.current = false;

    const initProgress: Record<string, ScrapeProgress> = {};
    selectedStores.forEach(id => { initProgress[id] = { storeId: id, status: 'pending' }; });
    setProgress(initProgress);

    // Sequential execution (concurrency = 1) to respect free-tier rate limits
    // Free tier: 10 req/min, 2 concurrent browsers
    // Each store can use 1-5 requests (pagination)
    for (const storeId of selectedStores) {
      if (abortRef.current) break;

      const store = STORES.find(s => s.id === storeId)!;
      setProgress(prev => ({ ...prev, [storeId]: { storeId, status: 'scraping', message: `Đang crawl ${store.name}...` } }));

      const startTime = Date.now();
      try {
        const res = await fetch('/api/scrape-single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeId, apiKey: apiKey.trim() }),
        });

        const text = await res.text();
        let data: any;
        try { data = JSON.parse(text); } catch {
          throw new Error(`Server error: ${text.substring(0, 100)}`);
        }

        const duration = Date.now() - startTime;
        const products: Product[] = data.products || [];

        if (products.length > 0) {
          setAllProducts(prev => [...prev, ...products]);
          setProgress(prev => ({
            ...prev,
            [storeId]: {
              storeId, status: 'done',
              message: `${products.length} SP · ${data.pagesScraped || 1} trang`,
              products, duration,
            },
          }));
        } else {
          setProgress(prev => ({
            ...prev,
            [storeId]: {
              storeId, status: 'error',
              message: data.error || '0 sản phẩm',
              duration,
            },
          }));
        }
      } catch (err: any) {
        const duration = Date.now() - startTime;
        setProgress(prev => ({
          ...prev,
          [storeId]: { storeId, status: 'error', message: err.message || 'Lỗi', duration },
        }));
      }

      // Small delay between stores to avoid rate limiting
      if (!abortRef.current) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    setIsRunning(false);
  }, [apiKey, selectedStores]);

  const handleStop = useCallback(() => { abortRef.current = true; setIsRunning(false); }, []);

  const filteredProducts = useMemo(() => {
    let f = allProducts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      f = f.filter(p => p.name.toLowerCase().includes(q) || p.store.toLowerCase().includes(q));
    }
    const s = [...f];
    switch (sortBy) {
      case 'price-asc': s.sort((a, b) => a.priceNumeric - b.priceNumeric); break;
      case 'price-desc': s.sort((a, b) => b.priceNumeric - a.priceNumeric); break;
      case 'name': s.sort((a, b) => a.name.localeCompare(b.name, 'vi')); break;
      case 'store': s.sort((a, b) => a.store.localeCompare(b.store, 'vi')); break;
    }
    return s;
  }, [allProducts, searchQuery, sortBy]);

  const handleExportCSV = useCallback(() => {
    if (filteredProducts.length === 0) return;
    const rows = filteredProducts.map(p => [
      `"${p.name.replace(/"/g, '""')}"`, p.price, p.store, p.url,
    ]);
    const csv = ['Tên sản phẩm,Giá,Cửa hàng,Link', ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `phone-prices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }, [filteredProducts]);

  return (
    <main className="min-h-screen pb-20">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <ApiKeyInput apiKey={apiKey} onChange={setApiKey} />
            <StoreSelector selected={selectedStores} onChange={setSelectedStores} />
            <button onClick={isRunning ? handleStop : handleScrape}
              disabled={!apiKey.trim() || selectedStores.length === 0}
              className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200
                ${isRunning
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                  : 'bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:from-brand-400 hover:to-brand-500 shadow-lg shadow-brand-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none'
                }`}>
              {isRunning ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Dừng crawl
                </span>
              ) : `Bắt đầu crawl (${selectedStores.length} shop)`}
            </button>
          </div>
          <div className="lg:col-span-2">
            <ProgressPanel progress={progress} />
          </div>
        </div>

        {allProducts.length > 0 && (
          <>
            <StatsBar products={allProducts} />
            <ProductTable products={filteredProducts} searchQuery={searchQuery} onSearchChange={setSearchQuery}
              sortBy={sortBy} onSortChange={setSortBy} onExport={handleExportCSV} />
          </>
        )}
      </div>
    </main>
  );
}
