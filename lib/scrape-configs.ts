/**
 * Per-store FireCrawl scrape configurations.
 *
 * Problems identified:
 * 1. hoangha: Products loaded via AJAX/JS after page load. Needs scroll + wait actions.
 * 2. clickbuy: JS-rendered product grid. Needs wait + scroll.
 * 3. shopdunk: Returns 403 to bots. Needs longer wait, scroll actions.
 * 4. oneway: JS-rendered, needs wait for product grid.
 * 5. techone: WooCommerce lazy-load, needs wait + scroll.
 * 6. taoden: JS-rendered store.
 * 7. mobilecity: JS-rendered, AJAX product loading.
 * 8. 24hstore: JS-rendered product grid.
 * 9. dienthoaivui: JS-rendered content.
 * 10. duchuy: CS-Cart platform, lazy-loaded products.
 *
 * Strategy: Use FireCrawl actions (wait, scroll, wait) to ensure JS content renders,
 * plus waitFor for extra time. Use onlyMainContent: false for stores where
 * product data is outside "main content" detection.
 */

export interface ScrapeConfig {
  /** Override URL if needed (e.g., API endpoint or filtered URL) */
  url?: string;
  /** FireCrawl actions to perform before scraping */
  actions?: Array<Record<string, any>>;
  /** Extra wait time in ms before scraping */
  waitFor?: number;
  /** Whether to include only main content */
  onlyMainContent?: boolean;
  /** Custom extraction prompt tailored to the store */
  prompt?: string;
  /** Timeout in ms */
  timeout?: number;
  /** Include specific CSS selectors */
  includeTags?: string[];
  /** Exclude specific CSS selectors */
  excludeTags?: string[];
}

// Default actions: wait for page JS to render, scroll down to trigger lazy load, wait again
const SCROLL_ACTIONS = [
  { type: 'wait', milliseconds: 3000 },
  { type: 'scroll', direction: 'down' },
  { type: 'wait', milliseconds: 2000 },
  { type: 'scroll', direction: 'down' },
  { type: 'wait', milliseconds: 2000 },
  { type: 'scroll', direction: 'down' },
  { type: 'wait', milliseconds: 2000 },
];

// Heavier scroll for infinite-scroll / very lazy sites
const HEAVY_SCROLL_ACTIONS = [
  { type: 'wait', milliseconds: 4000 },
  { type: 'scroll', direction: 'down' },
  { type: 'wait', milliseconds: 3000 },
  { type: 'scroll', direction: 'down' },
  { type: 'wait', milliseconds: 2000 },
  { type: 'scroll', direction: 'down' },
  { type: 'wait', milliseconds: 2000 },
  { type: 'scroll', direction: 'down' },
  { type: 'wait', milliseconds: 2000 },
];

const BASE_PROMPT = `Extract ALL product listings visible on this Vietnamese phone/electronics store page.
For EACH product found, extract exactly these fields:
- name: the FULL product name including model, storage, condition (e.g. "iPhone 15 Pro Max 256GB Like New 99%")
- price: the current/sale price in VND as shown (e.g. "22.990.000₫"). If there are multiple prices, use the lowest/sale price.
- url: the direct link (href) to the product detail page. Return the full URL if possible.

Return a JSON object: { "products": [ { "name": "...", "price": "...", "url": "..." }, ... ] }
IMPORTANT: Extract ALL products visible on the page. Do NOT skip any. Focus on phones/devices, skip accessories.`;

export const STORE_CONFIGS: Record<string, ScrapeConfig> = {
  // === GROUP 1: JS-heavy / AJAX-loaded product grids ===

  hoangha: {
    // Hoàng Hà loads products via AJAX after page load. The product grid is empty in initial HTML.
    actions: HEAVY_SCROLL_ACTIONS,
    waitFor: 5000,
    onlyMainContent: false,
    timeout: 55000,
    prompt: `${BASE_PROMPT}
This is hoanghamobile.com. Products are loaded dynamically. Look for product cards with names and prices in the product listing area. Each product card typically has product name, price (in VND format like "X.XXX.000₫"), and a link to the product page.`,
  },

  clickbuy: {
    // ClickBuy uses JS rendering for product grid
    actions: SCROLL_ACTIONS,
    waitFor: 4000,
    onlyMainContent: false,
    timeout: 55000,
    prompt: `${BASE_PROMPT}
This is clickbuy.com.vn. Look for iPhone product listings with names like "iPhone XX Pro Max XXXgb" and prices in Vietnamese dong format. Products are in a grid/list layout.`,
  },

  shopdunk: {
    // ShopDunk returns 403 to regular requests. Need actions to appear more browser-like.
    actions: [
      { type: 'wait', milliseconds: 5000 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 3000 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 3000 },
      { type: 'scroll', direction: 'down' },
      { type: 'wait', milliseconds: 2000 },
    ],
    waitFor: 5000,
    onlyMainContent: false,
    timeout: 55000,
    prompt: `${BASE_PROMPT}
This is shopdunk.com (Apple authorized reseller). Look for used/refurbished device listings with model names and prices. Products may include iPhone, iPad, MacBook, Apple Watch.`,
  },

  oneway: {
    // OneWay Mobile - JS rendered
    actions: SCROLL_ACTIONS,
    waitFor: 4000,
    onlyMainContent: false,
    timeout: 55000,
    prompt: `${BASE_PROMPT}
This is onewaymobile.vn iPhone used/99% section. Look for iPhone product cards with model name, storage capacity, and prices in VND.`,
  },

  techone: {
    // TechOne - WooCommerce with lazy loading
    actions: SCROLL_ACTIONS,
    waitFor: 4000,
    onlyMainContent: false,
    timeout: 55000,
    prompt: `${BASE_PROMPT}
This is techone.vn iPhone category page. Look for all iPhone product listings. Products show model name, storage, price. May include both new and used items.`,
  },

  taoden: {
    // Táo Đen Shop - JS rendered store
    actions: SCROLL_ACTIONS,
    waitFor: 4000,
    onlyMainContent: false,
    timeout: 55000,
    prompt: `${BASE_PROMPT}
This is taodenshop.com used iPhone section. Look for iPhone product listings with model, condition (like "99%", "Like New"), storage, and prices in VND.`,
  },

  mobilecity: {
    // MobileCity - AJAX product loading
    actions: HEAVY_SCROLL_ACTIONS,
    waitFor: 5000,
    onlyMainContent: false,
    timeout: 55000,
    prompt: `${BASE_PROMPT}
This is mobilecity.vn Apple phones section. Products are iPhone models (used 99% condition). Look for product names, current prices in VND, and product links.`,
  },

  '24hstore': {
    // 24hStore - JS rendered product grid
    actions: SCROLL_ACTIONS,
    waitFor: 4000,
    onlyMainContent: false,
    timeout: 55000,
    prompt: `${BASE_PROMPT}
This is 24hstore.vn used iPhone section. Look for iPhone product listings with full model names and prices in Vietnamese dong. Products may show original and discounted prices - use the discounted/current price.`,
  },

  dienthoaivui: {
    // Điện Thoại Vui - JS rendered
    actions: SCROLL_ACTIONS,
    waitFor: 4000,
    onlyMainContent: false,
    timeout: 55000,
    prompt: `${BASE_PROMPT}
This is dienthoaivui.com.vn used phone section. Look for used phone product listings with names, prices in VND, and links.`,
  },

  duchuy: {
    // Đức Huy Mobile - CS-Cart platform, lazy loaded
    actions: SCROLL_ACTIONS,
    waitFor: 4000,
    onlyMainContent: false,
    timeout: 55000,
    prompt: `${BASE_PROMPT}
This is duchuymobile.com used devices section. Look for phone/device product cards showing names (like "iPhone XX Pro Max XXXgb Cũ") and prices in VND (format: "XX.XXX.000 đ"). Extract the sale/current price, not the original price.`,
  },

  // === GROUP 2: These stores already worked but let's optimize them ===

  cellphones: {
    actions: SCROLL_ACTIONS,
    waitFor: 3000,
    onlyMainContent: true,
    timeout: 50000,
    prompt: `${BASE_PROMPT}
This is cellphones.com.vn used phone section. Products show phone model names and prices. Extract all phone listings visible.`,
  },

  didongviet: {
    actions: SCROLL_ACTIONS,
    waitFor: 3000,
    onlyMainContent: true,
    timeout: 50000,
    prompt: `${BASE_PROMPT}
This is didongviet.vn used iPhone section. Products show iPhone model names, conditions (like "99%"), and prices in VND.`,
  },

  viettablet: {
    actions: SCROLL_ACTIONS,
    waitFor: 3000,
    onlyMainContent: true,
    timeout: 50000,
    prompt: `${BASE_PROMPT}
This is viettablet.com used iPhone section. Products show model names, storage, condition, and prices in VND.`,
  },
};

/**
 * Get the scrape config for a store, falling back to defaults
 */
export function getStoreConfig(storeId: string): ScrapeConfig {
  return STORE_CONFIGS[storeId] || {
    actions: SCROLL_ACTIONS,
    waitFor: 3000,
    onlyMainContent: false,
    timeout: 50000,
    prompt: BASE_PROMPT,
  };
}
