'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { STORES } from '@/lib/stores';
import type { Product, ScrapeProgress, CachedStoreData } from '@/lib/types';
import { fuzzyMatch } from '@/lib/search';
import { getAllCached, saveStoreCache, clearAllCache } from '@/lib/cache';
import Header from '@/components/Header';
import SettingsModal from '@/components/SettingsModal';
import StoreSelector from '@/components/StoreSelector';
import ProgressPanel from '@/components/ProgressPanel';
import ProductTable from '@/components/ProductTable';
import StatsBar from '@/components/StatsBar';

const MAX_PAGES = 5;

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedStores, setSelectedStores] = useState<string[]>(STORES.map(s => s.id));
  const [progress, setProgress] = useState<Record<string, ScrapeProgress>>({});
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'name' | 'store'>('price-asc');
  const [cachedStores, setCachedStores] = useState<Record<string, CachedStoreData>>({});
  const [usingCache, setUsingCache] = useState(false);
  const abortRef = useRef(false);

  // Load cached data on mount
  useEffect(() => {
    (async () => {
      try {
        const cached = await getAllCached();
        const map: Record<string, CachedStoreData> = {};
        const prods: Product[] = [];
        for (const c of cached) {
          map[c.storeId] = c;
          prods.push(...c.products);
        }
        setCachedStores(map);
        if (prods.length > 0) {
          setAllProducts(prods);
          setUsingCache(true);
        }
      } catch { /* no cache available */ }
    })();

    // Load saved API key
    try {
      const saved = localStorage.getItem('fc_api_key');
      if (saved) setApiKey(saved);
    } catch { /* noop */ }
  }, []);

  // Save API key
  const handleApiKeyChange = useCallback((key: string) => {
    setApiKey(key);
    try { localStorage.setItem('fc_api_key', key); } catch { /* noop */ }
  }, []);

  // Scrape a single page of a single store
  const scrapePage = useCallback(async (storeId: string, key: string, pageUrl: string, pageNum: number) => {
    const res = await fetch('/api/scrape-single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, apiKey: key, pageUrl, pageNum }),
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { throw new Error(`Server error: ${text.substring(0, 100)}`); }
  }, []);

  // Main crawl function
  const handleCrawl = useCallback(async () => {
    if (!apiKey.trim() || selectedStores.length === 0) {
      if (!apiKey.trim()) setSettingsOpen(true);
      return;
    }

    setIsRunning(true);
    setAllProducts([]);
    setUsingCache(false);
    abortRef.current = false;

    const initProgress: Record<string, ScrapeProgress> = {};
    selectedStores.forEach(id => { initProgress[id] = { storeId: id, status: 'pending' }; });
    setProgress(initProgress);

    const newCached = { ...cachedStores };

    for (const storeId of selectedStores) {
      if (abortRef.current) break;

      const store = STORES.find(s => s.id === storeId)!;
      const t0 = Date.now();
      const storeProducts: Product[] = [];
      let totalPages = 0;
      let nextUrl: string | null = store.url;
      let lastError = '';

      for (let pageNum = 1; pageNum <= MAX_PAGES && nextUrl; pageNum++) {
        if (abortRef.current) break;

        setProgress(prev => ({
          ...prev,
          [storeId]: { storeId, status: 'scraping', currentPage: pageNum, message: `Trang ${pageNum}/${MAX_PAGES}...` },
        }));

        try {
          const data = await scrapePage(storeId, apiKey.trim(), nextUrl, pageNum);

          if (data.error && (!data.products || data.products.length === 0)) {
            lastError = data.error;
            break;
          }

          const pageProducts: Product[] = data.products || [];
          storeProducts.push(...pageProducts);
          totalPages = pageNum;
          nextUrl = data.nextPageUrl || null;

          // Update products in real-time
          if (pageProducts.length > 0) {
            setAllProducts(prev => [...prev, ...pageProducts]);
          }

          // If this page returned 0 products, no point continuing
          if (pageProducts.length === 0) break;

          // Small delay between pages
          if (nextUrl && pageNum < MAX_PAGES) {
            await new Promise(r => setTimeout(r, 1500));
          }
        } catch (err: any) {
          lastError = err.message;
          break;
        }
      }

      const duration = Date.now() - t0;

      // Dedupe products within this store
      const seen = new Set<string>();
      const uniqueProducts = storeProducts.filter(p => {
        const k = p.name.toLowerCase().replace(/\s+/g, ' ');
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      if (uniqueProducts.length > 0) {
        // Save to cache
        const cacheData: CachedStoreData = {
          storeId, storeName: store.name,
          products: uniqueProducts,
          crawledAt: Date.now(),
          pagesScraped: totalPages,
        };
        newCached[storeId] = cacheData;
        try { await saveStoreCache(cacheData); } catch { /* noop */ }

        setProgress(prev => ({
          ...prev,
          [storeId]: {
            storeId, status: 'done',
            message: `${uniqueProducts.length} SP · ${totalPages} trang`,
            products: uniqueProducts, duration,
          },
        }));
      } else {
        setProgress(prev => ({
          ...prev,
          [storeId]: {
            storeId, status: lastError ? 'error' : 'done',
            message: lastError || '0 SP',
            duration,
          },
        }));
      }

      // Gap between stores
      if (!abortRef.current) await new Promise(r => setTimeout(r, 2000));
    }

    setCachedStores(newCached);
    setIsRunning(false);
  }, [apiKey, selectedStores, scrapePage, cachedStores]);

  const handleStop = useCallback(() => { abortRef.current = true; setIsRunning(false); }, []);

  const handleClearCache = useCallback(async () => {
    await clearAllCache();
    setCachedStores({});
    setAllProducts([]);
    setUsingCache(false);
  }, []);

  const filteredProducts = useMemo(() => {
    let f = allProducts;
    if (searchQuery.trim()) f = f.filter(p => fuzzyMatch(searchQuery, p.name) || fuzzyMatch(searchQuery, p.store));
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
    const rows = filteredProducts.map(p => [`"${p.name.replace(/"/g, '""')}"`, p.price, p.store, p.url]);
    const csv = ['Tên sản phẩm,Giá,Cửa hàng,Link', ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `phone-prices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }, [filteredProducts]);

  const cachedProductCount = Object.values(cachedStores).reduce((s, c) => s + c.products.length, 0);

  return (
    <main className="min-h-screen pb-20">
      <Header hasApiKey={!!apiKey.trim()} onSettingsClick={() => setSettingsOpen(true)} cachedCount={cachedProductCount} />
      <SettingsModal apiKey={apiKey} onChange={handleApiKeyChange} isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-5">
        {/* Controls row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-4">
            <StoreSelector selected={selectedStores} onChange={setSelectedStores} cachedStores={cachedStores} />

            <div className="flex gap-2">
              <button onClick={isRunning ? handleStop : handleCrawl}
                disabled={!isRunning && selectedStores.length === 0}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200
                  ${isRunning
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none'
                  }`}>
                {isRunning ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Dừng
                  </span>
                ) : (
                  <span>
                    {!apiKey.trim() ? 'Nhập API Key →' : `Crawl mới (${selectedStores.length} shop)`}
                  </span>
                )}
              </button>

              {cachedProductCount > 0 && (
                <button onClick={handleClearCache}
                  className="py-3 px-4 rounded-xl text-sm text-zinc-500 border border-surface-400 hover:text-zinc-300 hover:border-surface-300 transition-colors"
                  title="Xóa cache">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
            </div>

            {usingCache && (
              <div className="text-xs text-zinc-500 bg-surface-100 border border-surface-300 rounded-xl px-3 py-2">
                Đang hiển thị data đã lưu. Nhấn "Crawl mới" để cập nhật.
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <ProgressPanel progress={progress} />
          </div>
        </div>

        {/* Results */}
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
