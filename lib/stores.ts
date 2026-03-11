export interface StoreConfig {
  id: string;
  name: string;
  url: string;
  color: string;
  /** Custom FireCrawl options per store */
  scrapeConfig: {
    /** Extra wait time in ms for JS-heavy pages */
    waitFor?: number;
    /** FireCrawl actions to perform before scraping */
    actions?: any[];
    /** Whether to disable onlyMainContent */
    onlyMainContent?: boolean;
    /** Custom timeout */
    timeout?: number;
    /** Custom extraction prompt hint for this store */
    extractionHint?: string;
    /** Include specific CSS selectors */
    includeTags?: string[];
    /** Exclude specific CSS selectors */
    excludeTags?: string[];
  };
}

export const STORES: StoreConfig[] = [
  {
    id: 'hoangha',
    name: 'Hoàng Hà Mobile',
    url: 'https://hoanghamobile.com/kho-san-pham-cu',
    color: '#e31837',
    scrapeConfig: {
      waitFor: 5000,
      onlyMainContent: false,
      timeout: 50000,
      actions: [
        { type: 'wait', milliseconds: 3000 },
        { type: 'scroll', direction: 'down', amount: 3 },
        { type: 'wait', milliseconds: 2000 },
      ],
      extractionHint: 'This is hoanghamobile.com. Products are loaded dynamically via JavaScript. Look for product cards with names like "iPhone...", "Samsung..." and prices in VND format like "1.990.000₫". Each product card has a link to its detail page.',
    },
  },
  {
    id: 'cellphones',
    name: 'CellphoneS',
    url: 'https://cellphones.com.vn/hang-cu/dien-thoai.html',
    color: '#d70018',
    scrapeConfig: {
      waitFor: 3000,
      onlyMainContent: false,
      timeout: 45000,
      actions: [
        { type: 'wait', milliseconds: 2000 },
        { type: 'scroll', direction: 'down', amount: 3 },
        { type: 'wait', milliseconds: 1500 },
      ],
      extractionHint: 'This is cellphones.com.vn used phone section. Product cards contain phone name, price in VND (e.g. "12.990.000₫"), and link to product page.',
    },
  },
  {
    id: 'didongviet',
    name: 'Di Động Việt',
    url: 'https://didongviet.vn/iphone-cu.html',
    color: '#e22718',
    scrapeConfig: {
      waitFor: 3000,
      onlyMainContent: false,
      timeout: 45000,
      actions: [
        { type: 'wait', milliseconds: 2000 },
        { type: 'scroll', direction: 'down', amount: 2 },
        { type: 'wait', milliseconds: 1500 },
      ],
      extractionHint: 'This is didongviet.vn used iPhone section. Products have names, prices in VND, and links.',
    },
  },
  {
    id: 'oneway',
    name: 'OneWay Mobile',
    url: 'https://onewaymobile.vn/iphone-99/',
    color: '#ff6600',
    scrapeConfig: {
      waitFor: 4000,
      onlyMainContent: false,
      timeout: 50000,
      actions: [
        { type: 'wait', milliseconds: 3000 },
        { type: 'scroll', direction: 'down', amount: 3 },
        { type: 'wait', milliseconds: 2000 },
      ],
      extractionHint: 'This is onewaymobile.vn used iPhone 99% section. Products are displayed as cards with name, price in VND, and product URLs. Look for all phone product listings on the page.',
    },
  },
  {
    id: 'clickbuy',
    name: 'ClickBuy',
    url: 'https://clickbuy.com.vn/dien-thoai-iphone-cu/',
    color: '#0066cc',
    scrapeConfig: {
      waitFor: 5000,
      onlyMainContent: false,
      timeout: 50000,
      actions: [
        { type: 'wait', milliseconds: 3000 },
        { type: 'scroll', direction: 'down', amount: 4 },
        { type: 'wait', milliseconds: 2000 },
      ],
      extractionHint: 'This is clickbuy.com.vn used iPhone page. Products are loaded dynamically. Each product card has: name (e.g. "iPhone 15 Pro Max 256GB Cũ"), price in VND, and a link. Scroll reveals more products.',
      excludeTags: ['header', 'footer', 'nav', '.menu'],
    },
  },
  {
    id: 'techone',
    name: 'TechOne',
    url: 'https://www.techone.vn/iphone/',
    color: '#1a73e8',
    scrapeConfig: {
      waitFor: 4000,
      onlyMainContent: false,
      timeout: 50000,
      actions: [
        { type: 'wait', milliseconds: 3000 },
        { type: 'scroll', direction: 'down', amount: 3 },
        { type: 'wait', milliseconds: 2000 },
      ],
      extractionHint: 'This is techone.vn iPhone category page (WordPress/WooCommerce). Products are listed with name, price in VND (e.g. "23.990.000 ₫"), and product detail links.',
    },
  },
  {
    id: 'viettablet',
    name: 'VietTablet',
    url: 'https://www.viettablet.com/kho-may-cu/dien-thoai-iphone-cu/',
    color: '#0088cc',
    scrapeConfig: {
      waitFor: 3000,
      onlyMainContent: false,
      timeout: 45000,
      actions: [
        { type: 'wait', milliseconds: 2000 },
        { type: 'scroll', direction: 'down', amount: 2 },
        { type: 'wait', milliseconds: 1500 },
      ],
      extractionHint: 'This is viettablet.com used iPhone section. Product listings with name, price, and URLs.',
    },
  },
  {
    id: 'shopdunk',
    name: 'ShopDunk',
    url: 'https://shopdunk.com/may-cu',
    color: '#515154',
    scrapeConfig: {
      waitFor: 5000,
      onlyMainContent: false,
      timeout: 55000,
      actions: [
        { type: 'wait', milliseconds: 4000 },
        { type: 'scroll', direction: 'down', amount: 3 },
        { type: 'wait', milliseconds: 2000 },
      ],
      extractionHint: 'This is shopdunk.com used products section. Products displayed in grid with name (iPhone models), price in VND, and product links. The site may use Cloudflare protection.',
    },
  },
  {
    id: 'taoden',
    name: 'Táo Đen Shop',
    url: 'https://www.taodenshop.com/iphonecu/',
    color: '#333333',
    scrapeConfig: {
      waitFor: 4000,
      onlyMainContent: false,
      timeout: 50000,
      actions: [
        { type: 'wait', milliseconds: 3000 },
        { type: 'scroll', direction: 'down', amount: 3 },
        { type: 'wait', milliseconds: 2000 },
      ],
      extractionHint: 'This is taodenshop.com (Sapo/Bizweb platform) used iPhone page. Products are displayed as cards with product name, price in VND (format like "12.990.000₫"), and links to product detail pages on taodenshop.com domain.',
    },
  },
  {
    id: 'mobilecity',
    name: 'MobileCity',
    url: 'https://mobilecity.vn/dien-thoai-apple/',
    color: '#ff0000',
    scrapeConfig: {
      waitFor: 4000,
      onlyMainContent: false,
      timeout: 50000,
      actions: [
        { type: 'wait', milliseconds: 3000 },
        { type: 'scroll', direction: 'down', amount: 4 },
        { type: 'wait', milliseconds: 2000 },
      ],
      extractionHint: 'This is mobilecity.vn Apple phones section. Products list iPhone models with name, price in VND (e.g. "4.990.000 ₫"), and product detail links on mobilecity.vn.',
    },
  },
  {
    id: '24hstore',
    name: '24hStore',
    url: 'https://24hstore.vn/dien-thoai-iphone-cu/',
    color: '#f5a623',
    scrapeConfig: {
      waitFor: 5000,
      onlyMainContent: false,
      timeout: 50000,
      actions: [
        { type: 'wait', milliseconds: 3000 },
        { type: 'scroll', direction: 'down', amount: 4 },
        { type: 'wait', milliseconds: 2000 },
      ],
      extractionHint: 'This is 24hstore.vn used iPhone page. Products are displayed in a grid. Each product has: name (e.g. "iPhone 15 Pro Max 256GB Cũ 99%"), price in VND, and a URL to the product page on 24hstore.vn.',
    },
  },
  {
    id: 'dienthoaivui',
    name: 'Điện Thoại Vui',
    url: 'https://dienthoaivui.com.vn/may-cu/dien-thoai-cu',
    color: '#e74c3c',
    scrapeConfig: {
      waitFor: 4000,
      onlyMainContent: false,
      timeout: 50000,
      actions: [
        { type: 'wait', milliseconds: 3000 },
        { type: 'scroll', direction: 'down', amount: 3 },
        { type: 'wait', milliseconds: 2000 },
      ],
      extractionHint: 'This is dienthoaivui.com.vn used phones section. Products shown with name, price in VND, and links. This is a repair shop that also sells used phones.',
    },
  },
  {
    id: 'duchuy',
    name: 'Đức Huy Mobile',
    url: 'https://www.duchuymobile.com/kho-may-cu',
    color: '#ff4444',
    scrapeConfig: {
      waitFor: 4000,
      onlyMainContent: false,
      timeout: 50000,
      actions: [
        { type: 'wait', milliseconds: 3000 },
        { type: 'scroll', direction: 'down', amount: 3 },
        { type: 'wait', milliseconds: 2000 },
      ],
      extractionHint: 'This is duchuymobile.com used devices section (CS-Cart platform). Products displayed with name, price in VND (e.g. "8.990.000 đ"), and product URLs. Product cards include both current and old prices.',
    },
  },
];
