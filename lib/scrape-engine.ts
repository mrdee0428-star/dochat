/**
 * Scrape Engine v9
 * DUAL MODE:
 *   - Stores WITH productSelector → request 'html' format, parse HTML directly
 *   - Stores WITHOUT productSelector → request 'markdown' format, parse markdown
 *
 * HTML parsing is deterministic and reliable — we can extract exact elements.
 */

import type { Product } from './types';
import type { StoreConfig } from './stores';
import { STORES } from './stores';

const FIRECRAWL_API = 'https://api.firecrawl.dev/v2/scrape';

/* ── Price ────────────────────────────────────────────── */

export function parseVndPrice(raw: string): number {
  if (!raw) return 0;
  const patterns = [
    /(\d{1,3}(?:[.,]\d{3}){2,})/g,
    /(\d{1,3}[.,]\d{3})(?!\d)/g,
    /(\d{6,9})/g,
  ];
  for (const p of patterns) {
    const ms = raw.match(p);
    if (ms) {
      for (const m of ms) {
        const n = parseInt(m.replace(/[.,]/g, ''), 10);
        if (n >= 500000 && n <= 100000000) return n;
      }
    }
  }
  return 0;
}

export function formatVnd(n: number): string {
  return n > 0 ? new Intl.NumberFormat('vi-VN').format(n) + '₫' : 'Liên hệ';
}

/* ── Product validation ──────────────────────────────── */

const DEVICE_KW = [
  'iphone', 'ipad', 'macbook', 'apple watch', 'airpods',
  'samsung', 'galaxy', 'xiaomi', 'redmi', 'poco',
  'oppo', 'find n', 'reno', 'vivo', 'realme',
  'huawei', 'honor', 'pixel', 'oneplus', 'asus',
  'rog phone', 'zenfone', 'nokia', 'nothing phone',
  'sony xperia', 'motorola', 'infinix', 'tecno', 'nubia',
  'pro max', 'ultra', 'cũ đẹp', 'like new',
  '99%', '98%', '95%', 'đã kích hoạt', 'vn/a',
];

const NOISE = [
  /(ốp lưng|miếng dán|kính cường lực|cáp sạc|củ sạc|sạc dự phòng|bao da|đế sạc|dây đeo)/i,
  /^(trang chủ|danh mục|menu|đăng nhập|hotline|liên hệ|tin tức|khiếu nại|camera$|quà )/i,
  /^(xem thêm|xem chi tiết|mua ngay|trang \d|next|prev)/i,
];

function isValidProduct(name: string, url: string): boolean {
  if (name.length < 5 || name.length > 200) return false;
  if (NOISE.some(r => r.test(name))) return false;
  // Must be specific (has numbers or model words)
  if (!/\d/.test(name) && !/\b(pro|max|ultra|plus|mini|lite|air|se|fold|flip)\b/i.test(name)) return false;
  // Must contain device keyword
  const nl = name.toLowerCase();
  const ul = (url || '').toLowerCase();
  for (const kw of DEVICE_KW) { if (nl.includes(kw)) return true; }
  // URL check
  if (/iphone|samsung|galaxy|xiaomi|redmi|oppo|vivo|realme|-cu|cu-dep|dien-thoai/.test(ul)) return true;
  return false;
}

/* ── HTML PARSER — for stores with known CSS structure ── */

interface RawProduct { name: string; price: number; url: string; }

/**
 * Parse products from FireCrawl's cleaned HTML.
 * Strategy: find all <a> tags with product links, extract name + price nearby.
 */
function parseProductsFromHtml(html: string, origin: string): RawProduct[] {
  const products: RawProduct[] = [];
  const seen = new Set<string>();

  // Strategy 1: Find product links with names
  // Pattern: <a href="...product-url...">...<h3>Product Name</h3>...</a> + price nearby
  // Or: <a href="...">...<div class="product__name">Product Name</div>...</a>
  
  // Extract all anchor blocks that contain product info
  // Using regex on HTML (simpler than DOM parsing in serverless)
  
  // Find name + URL pairs
  const namePatterns = [
    // <h3>Name</h3> or <h2>Name</h2> inside links
    /<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([^<]+)<\/h[23]>/gi,
    // class="product__name" or similar
    /<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?class="[^"]*(?:product[_-]?name|product-title|product__name)[^"]*"[^>]*>([^<]+)</gi,
    // alt text from images as product name (many VN stores use this)
    /<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?<img[^>]*alt="([^"]{8,})"[^>]*>/gi,
  ];

  for (const pattern of namePatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) !== null) {
      let url = match[1].trim();
      let name = match[2].trim();

      // Clean name
      name = name.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
      
      if (!isValidProduct(name, url)) continue;

      // Normalize URL
      if (url.startsWith('/')) url = origin + url;
      else if (!url.startsWith('http')) continue;
      if (/\.(jpg|jpeg|png|gif|svg|webp|css|js)(\?|$)/i.test(url)) continue;

      // Find price near this product in HTML (within ~500 chars after the name)
      const namePos = html.indexOf(name, match.index);
      const searchArea = html.substring(namePos, namePos + 800);
      const price = parseVndPrice(searchArea);
      if (price <= 0) continue;

      const key = name.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);

      products.push({ name, price, url });
    }
  }

  // Strategy 2: price-show class pattern (CellphoneS specific)
  if (products.length === 0) {
    // Find all product containers
    const containerRe = /class="[^"]*product-info-container[^"]*"[\s\S]*?(?=class="[^"]*product-info-container|$)/gi;
    let cm: RegExpExecArray | null;
    while ((cm = containerRe.exec(html)) !== null) {
      const block = cm[0];
      
      // Extract link
      const linkM = block.match(/href="([^"]+)"/);
      if (!linkM) continue;
      let url = linkM[1].trim();
      if (url.startsWith('/')) url = origin + url;
      if (/\.(jpg|jpeg|png|gif|svg|webp)(\?|$)/i.test(url)) continue;

      // Extract name from h3 or alt
      const nameM = block.match(/<h[23][^>]*>([^<]+)<\/h[23]>/) || block.match(/alt="([^"]{8,})"/);
      if (!nameM) continue;
      const name = nameM[1].trim();

      if (!isValidProduct(name, url)) continue;

      const price = parseVndPrice(block);
      if (price <= 0) continue;

      const key = name.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);

      products.push({ name, price, url });
    }
  }

  return products;
}

/* ── Markdown parser (fallback for stores without selector) ── */

function parseProductsFromMarkdown(md: string, links: string[], origin: string): RawProduct[] {
  const products: RawProduct[] = [];
  const seen = new Set<string>();
  const lines = md.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Links
    const re = /\[([^\]]{5,})\]\(([^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      let name = m[1].replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/^!\[?/, '').replace(/^\[/, '').replace(/[#*_`|]/g, '').trim();
      let url = m[2].trim();
      if (url.startsWith('/')) url = origin + url;
      else if (!url.startsWith('http')) url = origin + '/' + url;
      if (/\.(jpg|jpeg|png|gif|svg|webp|css|js)(\?|$)/i.test(url)) continue;
      if (!isValidProduct(name, url)) continue;

      let price = 0;
      for (let j = i; j < Math.min(i + 6, lines.length); j++) { price = parseVndPrice(lines[j]); if (price > 0) break; }
      if (price <= 0) continue;

      const key = name.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);
      products.push({ name: name.replace(/\s+/g, ' ').substring(0, 150), price, url });
    }

    // ### Headings
    const hm = line.match(/^#{1,4}\s+(.{5,})/);
    if (hm) {
      const hName = hm[1].replace(/[#*_`|]/g, '').trim();
      if (isValidProduct(hName, '')) {
        let price = 0;
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) { price = parseVndPrice(lines[j]); if (price > 0) break; }
        if (price > 0) {
          const key = hName.toLowerCase().replace(/\s+/g, ' ');
          if (!seen.has(key)) {
            seen.add(key);
            let url = '';
            for (let j = Math.max(0, i - 3); j < Math.min(i + 4, lines.length); j++) {
              const um = lines[j].match(/\]\(([^)]+)\)/);
              if (um && !/\.(jpg|jpeg|png|gif|svg|webp)(\?|$)/i.test(um[1])) { url = um[1].trim(); if (url.startsWith('/')) url = origin + url; break; }
            }
            products.push({ name: hName.substring(0, 150), price, url });
          }
        }
      }
    }
  }

  // Fallback pass
  if (products.length < 3) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length < 8 || line.startsWith('![') || /^https?:\/\//.test(line) || /^#{1,4}\s/.test(line)) continue;
      if (parseVndPrice(line) > 0) continue;
      let price = 0;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) { price = parseVndPrice(lines[j]); if (price > 0) break; }
      if (price <= 0) continue;
      let name = line.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/[#*_`|]/g, '').replace(/\s+/g, ' ').trim();
      if (!isValidProduct(name, '')) continue;
      const key = name.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);
      products.push({ name: name.substring(0, 150), price, url: '' });
    }
  }

  return products;
}

/* ── Pagination ──────────────────────────────────────── */

export function detectNextPage(content: string, links: string[], curUrl: string, curPage: number): string | null {
  const next = curPage + 1;
  try {
    const base = new URL(curUrl);
    const all = [...links];
    // Extract links from content (works for both HTML and markdown)
    const hrefRe = /href="(https?:\/\/[^"]+)"/g;
    let hm: RegExpExecArray | null;
    while ((hm = hrefRe.exec(content)) !== null) all.push(hm[1]);
    const mdRe = /\]\((https?:\/\/[^)]+)\)/g;
    let mm: RegExpExecArray | null;
    while ((mm = mdRe.exec(content)) !== null) all.push(mm[1]);

    for (const link of all) {
      try {
        const u = new URL(link);
        if (u.origin !== base.origin) continue;
        const p = u.searchParams.get('page') || u.searchParams.get('p');
        if (p === String(next)) return link;
        if (u.pathname.match(new RegExp(`/page/${next}(/|$)`))) return link;
      } catch {}
    }
    if (/(?:trang|page)\s*(?:\d|›|»|>|tiếp|next)/i.test(content)) {
      const u = new URL(curUrl);
      u.searchParams.set('page', String(next));
      return u.toString();
    }
  } catch {}
  return null;
}

/* ── Single-page scrape ──────────────────────────────── */

export interface PageResult {
  products: Product[];
  nextPageUrl: string | null;
}

export async function scrapeSinglePage(
  url: string, apiKey: string, storeId: string, pageNum: number,
): Promise<PageResult> {
  const store = STORES.find(s => s.id === storeId);
  if (!store) throw new Error(`Store ${storeId} not found`);

  const origin = new URL(url).origin;
  const useHtml = !!store.productSelector;

  // Build payload
  const payload: any = {
    url,
    formats: useHtml ? ['html', 'links'] : ['markdown', 'links'],
    timeout: 30000,
  };

  if (store.productSelector) {
    payload.includeTags = [store.productSelector];
    payload.onlyMainContent = false;
  } else {
    payload.onlyMainContent = true;
  }

  // Actions for page 1
  if (pageNum === 1) {
    const actions: any[] = [{ type: 'wait', milliseconds: 2000 }];
    if (store.pagination === 'loadmore') {
      // Extra scrolls to trigger load-more
      for (let i = 0; i < 3; i++) {
        actions.push({ type: 'scroll', direction: 'down', amount: 1500 });
        actions.push({ type: 'wait', milliseconds: 1500 });
      }
    }
    actions.push({ type: 'scroll', direction: 'down', amount: 800 });
    actions.push({ type: 'wait', milliseconds: 1000 });
    actions.push({ type: 'scroll', direction: 'down', amount: 800 });
    actions.push({ type: 'wait', milliseconds: 500 });
    payload.actions = actions;
  }

  // Fetch
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);

  let data: any;
  try {
    const res = await fetch(FIRECRAWL_API, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text();
    if (!res.ok) {
      let d = `HTTP ${res.status}`;
      try { const e = JSON.parse(text); d = e.error || e.message || d; } catch { d += `: ${text.substring(0, 100)}`; }
      throw new Error(d);
    }
    data = JSON.parse(text);
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Timeout 40s');
    throw err;
  }

  // Parse based on mode
  let rawProducts: RawProduct[];
  let contentForPagination: string;

  if (useHtml) {
    const html: string = data?.data?.html || '';
    if (html.length < 20) throw new Error('HTML rỗng');
    rawProducts = parseProductsFromHtml(html, origin);
    contentForPagination = html;
  } else {
    const md: string = data?.data?.markdown || '';
    if (md.length < 20) throw new Error('Markdown rỗng');
    const links: string[] = data?.data?.links || [];
    rawProducts = parseProductsFromMarkdown(md, links, origin);
    contentForPagination = md;
  }

  const products: Product[] = rawProducts.map(rp => ({
    name: rp.name,
    price: formatVnd(rp.price),
    priceNumeric: rp.price,
    url: rp.url || url,
    store: store.name,
    storeId: store.id,
    storeColor: store.color,
  }));

  // Pagination
  let nextPageUrl: string | null = null;
  if (store.pagination === 'page') {
    const links: string[] = data?.data?.links || [];
    nextPageUrl = detectNextPage(contentForPagination, links, url, pageNum);
  }

  return { products, nextPageUrl };
}
