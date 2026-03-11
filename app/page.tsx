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

  const scrapeStore = useCallback(async (storeId: string, key: string): Promise<Product[]> => {
    try {
      const res = await fetch('/api/scrape-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, apiKey: key }),
      });
      const data = await res.json();
      if (data.error && (!data.products || data.products.length === 0)) {
        throw new Error(data.error);
      }
      return data.products || [];
    } catch (err: any) {
      throw err;
    }
  }, []);

  const handleScrape = useCallback(async () => {
    if (!apiKey.trim()) return;
    if (selectedStores.length === 0) return;

    setIsRunning(true);
    setAllProducts([]);
    abortRef.current = false;

    // Init progress
    const initProgress: Record<string, ScrapeProgress> = {};
    selectedStores.forEach(id => {
      initProgress[id] = { storeId: id, status: 'pending' };
    });
    setProgress(initProgress);

    // Scrape with concurrency limit of 2 (actions + wait make each request slower)
    const concurrency = 2;
    const queue = [...selectedStores];
    const results: Product[] = [];

    const worker = async () => {
      while (queue.length > 0) {
        if (abortRef.current) return;
        const storeId = queue.shift()!;
        const store = STORES.find(s => s.id === storeId)!;

        setProgress(prev => ({
          ...prev,
          [storeId]: { storeId, status: 'scraping', message: `Đang crawl ${store.name}...` },
        }));

        const startTime = Date.now();
        try {
          const products = await scrapeStore(storeId, apiKey.trim());
          const duration = Date.now() - startTime;

          results.push(...products);
          setAllProducts(prev => [...prev, ...products]);
          setProgress(prev => ({
            ...prev,
            [storeId]: {
              storeId,
              status: 'done',
              message: `${products.length} sản phẩm`,
              products,
              duration,
            },
          }));
        } catch (err: any) {
          const duration = Date.now() - startTime;
          setProgress(prev => ({
            ...prev,
            [storeId]: {
              storeId,
              status: 'error',
              message: err.message || 'Lỗi không xác định',
              duration,
            },
          }));
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, selectedStores.length) }, () => worker());
    await Promise.all(workers);
    setIsRunning(false);
  }, [apiKey, selectedStores, scrapeStore]);

  const handleStop = useCallback(() => {
    abortRef.current = true;
    setIsRunning(false);
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p => p.name.toLowerCase().includes(q) || p.store.toLowerCase().includes(q)
      );
    }

    const sorted = [...filtered];
    switch (sortBy) {
      case 'price-asc':
        sorted.sort((a, b) => a.priceNumeric - b.priceNumeric);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.priceNumeric - a.priceNumeric);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
        break;
      case 'store':
        sorted.sort((a, b) => a.store.localeCompare(b.store, 'vi'));
        break;
    }
    return sorted;
  }, [allProducts, searchQuery, sortBy]);

  const handleExportCSV = useCallback(() => {
    if (filteredProducts.length === 0) return;
    const headers = ['Tên sản phẩm', 'Giá', 'Cửa hàng', 'Link'];
    const rows = filteredProducts.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.price,
      p.store,
      p.url,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phone-prices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredProducts]);

  return (
    <main className="min-h-screen pb-20">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 mt-8">
        {/* Config Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <ApiKeyInput apiKey={apiKey} onChange={setApiKey} />
            <StoreSelector
              selected={selectedStores}
              onChange={setSelectedStores}
            />
            <button
              onClick={isRunning ? handleStop : handleScrape}
              disabled={!apiKey.trim() || selectedStores.length === 0}
              className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 
                ${isRunning
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                  : 'bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:from-brand-400 hover:to-brand-500 shadow-lg shadow-brand-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none'
                }`}
            >
              {isRunning ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Dừng crawl
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Bắt đầu crawl ({selectedStores.length} cửa hàng)
                </span>
              )}
            </button>
          </div>

          <div className="lg:col-span-2">
            <ProgressPanel progress={progress} stores={STORES} />
          </div>
        </div>

        {/* Results */}
        {allProducts.length > 0 && (
          <>
            <StatsBar products={allProducts} progress={progress} />
            <ProductTable
              products={filteredProducts}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onExport={handleExportCSV}
            />
          </>
        )}
      </div>
    </main>
  );
}
