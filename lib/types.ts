export interface Product {
  name: string;
  price: string;
  priceNumeric: number;
  url: string;
  store: string;
  storeId: string;
  storeColor: string;
}

export interface ScrapeResult {
  storeId: string;
  storeName: string;
  products: Product[];
  error?: string;
  duration: number;
}

export interface ScrapeProgress {
  storeId: string;
  status: 'pending' | 'scraping' | 'done' | 'error';
  message?: string;
  products?: Product[];
  duration?: number;
}
