export interface StoreConfig {
  id: string;
  name: string;
  url: string;
  color: string;
  /** CSS class/selector to scope FireCrawl's includeTags — only scrape the product listing container */
  productSelector?: string;
  /** Pagination type: 'page' (query param), 'loadmore' (click button), 'none' */
  pagination?: 'page' | 'loadmore' | 'none';
  /** CSS selector for "Load More" button (for loadmore pagination) */
  loadMoreSelector?: string;
}

export const STORES: StoreConfig[] = [
  {
    id: 'hoangha',
    name: 'Hoàng Hà Mobile',
    url: 'https://hoanghamobile.com/kho-san-pham-cu',
    color: '#e31837',
    pagination: 'none', // AJAX loaded, no classic pagination
  },
  {
    id: 'cellphones',
    name: 'CellphoneS',
    url: 'https://cellphones.com.vn/hang-cu/dien-thoai.html',
    color: '#d70018',
    productSelector: '.filter-sort__list-product',
    pagination: 'page',
  },
  {
    id: 'didongviet',
    name: 'Di Động Việt',
    url: 'https://didongviet.vn/dien-thoai-cu.html',  // Fixed URL
    color: '#e22718',
    productSelector: '.p-2',
    pagination: 'page',
  },
  {
    id: 'oneway',
    name: 'OneWay Mobile',
    url: 'https://onewaymobile.vn/iphone-99/',
    color: '#ff6600',
    productSelector: '.product-list-wrap',
    pagination: 'loadmore',
    loadMoreSelector: '.btn-view-more, .load-more, [class*="load-more"], [class*="xem-them"]',
  },
  {
    id: 'clickbuy',
    name: 'ClickBuy',
    url: 'https://clickbuy.com.vn/dien-thoai-iphone-cu/',
    color: '#0066cc',
    pagination: 'page',
  },
  {
    id: 'techone',
    name: 'TechOne',
    url: 'https://www.techone.vn/iphone/',
    color: '#1a73e8',
    pagination: 'page',
  },
  {
    id: 'viettablet',
    name: 'VietTablet',
    url: 'https://www.viettablet.com/kho-may-cu/dien-thoai-iphone-cu/',
    color: '#0088cc',
    pagination: 'page',
  },
  {
    id: 'shopdunk',
    name: 'ShopDunk',
    url: 'https://shopdunk.com/iphone-cu-dep',  // Fixed URL
    color: '#515154',
    productSelector: '.product-grid',
    pagination: 'page',
  },
  {
    id: 'taoden',
    name: 'Táo Đen Shop',
    url: 'https://www.taodenshop.com/iphonecu/',
    color: '#333333',
    pagination: 'page',
  },
  {
    id: 'mobilecity',
    name: 'MobileCity',
    url: 'https://mobilecity.vn/dien-thoai-apple/',
    color: '#ff0000',
    productSelector: '.product-list',
    pagination: 'page',
  },
  {
    id: '24hstore',
    name: '24hStore',
    url: 'https://24hstore.vn/dien-thoai-iphone-cu/',
    color: '#f5a623',
    productSelector: '.list-products',
    pagination: 'page',
  },
  {
    id: 'dienthoaivui',
    name: 'Điện Thoại Vui',
    url: 'https://dienthoaivui.com.vn/may-cu/dien-thoai-cu',
    color: '#e74c3c',
    pagination: 'page',
  },
  {
    id: 'duchuy',
    name: 'Đức Huy Mobile',
    url: 'https://www.duchuymobile.com/dien-thoai-cu',  // Fixed URL
    color: '#ff4444',
    productSelector: '.mainbox-body',
    pagination: 'page',
  },
];
