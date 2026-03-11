export interface Product {
  name: string;
  price: string;
  priceNumeric: number;
  url: string;
  store: string;
  storeId: string;
  storeColor: string;
}

export interface ScrapeProgress {
  storeId: string;
  status: 'pending' | 'scraping' | 'done' | 'error';
  message?: string;
  products?: Product[];
  duration?: number;
  currentPage?: number;
}

export interface CachedStoreData {
  storeId: string;
  storeName: string;
  products: Product[];
  crawledAt: number; // timestamp ms
  pagesScraped: number;
}

export interface CacheStore {
  version: number;
  stores: Record<string, CachedStoreData>;
}
