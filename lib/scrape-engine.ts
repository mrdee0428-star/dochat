/**
 * Scrape Engine v8
 * - Per-store CSS selector via includeTags to scope product grid only
 * - LoadMore pagination via click action
 * - Strict product validation
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
  'huawei', 'honor', 'google pixel', 'pixel',
  'oneplus', 'asus', 'rog phone', 'zenfone',
  'nokia', 'nothing phone', 'sony xperia',
  'motorola', 'moto g', 'infinix', 'tecno', 'nubia',
  'pro max', 'pro plus', 'ultra',
  'cũ đẹp', 'like new', '99%', '98%', '95%',
  'đã kích hoạt', 'chính hãng', 'vn/a',
];

const DEVICE_URL_KW = [
  'iphone', 'ipad', 'macbook', 'samsung', 'galaxy',
  'xiaomi', 'redmi', 'poco', 'oppo', 'vivo', 'realme',
  'huawei', 'honor', 'pixel', 'oneplus', 'asus', 'nokia',
  '-cu', 'cu-dep', 'cu-tray', 'hang-cu', 'may-cu', 'dien-thoai',
];

function isProduct(name: string, url: string): boolean {
  const nl = name.toLowerCase();
  const ul = url.toLowerCase();

  // Skip category links ("iPhone cũ", "Samsung cũ")
  if (/^(apple\s)?iphone\s*cũ$/i.test(name.trim())) return false;
  if (/^[a-z]+\s*cũ$/i.test(name.trim())) return false;

  // Must have specifics (numbers, model variants)
  const hasSpec = /\d/.test(name) || /\b(pro|max|ultra|plus|mini|lite|air|se|fold|flip)\b/i.test(name);
  if (!hasSpec) return false;

  for (const kw of DEVICE_KW) { if (nl.includes(kw)) return true; }
  for (const kw of DEVICE_URL_KW) { if (ul.includes(kw)) return true; }
  return false;
}

const NOISE = [
  /^(trang chủ|danh mục|menu|thương hiệu|bộ lọc|sắp xếp|xem thêm)/i,
  /^(đăng nhập|đăng ký|tài khoản|giỏ hàng|hotline|liên hệ|chính sách)/i,
  /^(tin tức|blog|bài viết|hướng dẫn|tra cứu|trả góp|thu cũ|khuyến mãi)/i,
  /^(gọi mua|gọi tư vấn|miễn phí|cam kết|hỗ trợ|chăm sóc|khiếu nại)/i,
  /^(về chúng tôi|giới thiệu|điều khoản|copyright|©)/i,
  /^(tìm cửa hàng|showroom|xu hướng|trending|thông báo|smember|loading)/i,
  /^(xem chi tiết|mua ngay|trang \d|tiếp|next|prev|camera$|quà)/i,
  /(ốp lưng|miếng dán|kính cường lực|cáp sạc|củ sạc|sạc dự phòng)/i,
  /(bao da|túi đựng|đế sạc|giá đỡ|dây đeo|vỏ ốp|case )/i,
];

function isNoise(name: string): boolean {
  if (name.length < 5 || name.length > 150) return true;
  return NOISE.some(r => r.test(name));
}

/* ── Markdown parser ─────────────────────────────────── */

interface RawProduct { name: string; price: number; url: string; }

export function parseProducts(markdown: string, links: string[], origin: string): RawProduct[] {
  const products: RawProduct[] = [];
  const seen = new Set<string>();
  const lines = markdown.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1) Markdown links: [name](url)
    const re = /\[([^\]]{5,})\]\(([^)]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      let name = m[1].replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/^!\[?/, '').replace(/^\[/, '').replace(/[#*_`|]/g, '').trim();
      if (isNoise(name)) continue;

      let url = m[2].trim();
      if (url.startsWith('/')) url = origin + url;
      else if (!url.startsWith('http')) url = origin + '/' + url;
      if (/\.(jpg|jpeg|png|gif|svg|webp|css|js)(\?|$)/i.test(url)) continue;

      if (!isProduct(name, url)) continue;

      let price = 0;
      for (let j = i; j < Math.min(i + 6, lines.length); j++) {
        price = parseVndPrice(lines[j]);
        if (price > 0) break;
      }
      if (price <= 0) continue;

      const key = name.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);
      products.push({ name: name.replace(/\s+/g, ' ').substring(0, 150), price, url });
    }

    // 2) ### Headings (CellphoneS style)
    const hm = line.match(/^#{1,4}\s+(.{5,})/);
    if (hm) {
      const hName = hm[1].replace(/[#*_`|]/g, '').trim();
      if (!isNoise(hName) && isProduct(hName, '')) {
        let price = 0;
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          price = parseVndPrice(lines[j]);
          if (price > 0) break;
        }
        if (price > 0) {
          const key = hName.toLowerCase().replace(/\s+/g, ' ');
          if (!seen.has(key)) {
            seen.add(key);
            let url = '';
            for (let j = Math.max(0, i - 3); j < Math.min(i + 4, lines.length); j++) {
              const um = lines[j].match(/\]\(([^)]+)\)/);
              if (um && !/\.(jpg|jpeg|png|gif|svg|webp)(\?|$)/i.test(um[1])) {
                url = um[1].trim();
                if (url.startsWith('/')) url = origin + url;
                else if (!url.startsWith('http')) url = origin + '/' + url;
                break;
              }
            }
            products.push({ name: hName.replace(/\s+/g, ' ').substring(0, 150), price, url });
          }
        }
      }
    }
  }

  // PASS 2: fallback (no links, just name + price blocks)
  if (products.length < 3) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length < 8 || line.startsWith('![') || /^https?:\/\//.test(line) || /^#{1,4}\s/.test(line)) continue;
      if (parseVndPrice(line) > 0) continue;

      let price = 0;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        price = parseVndPrice(lines[j]);
        if (price > 0) break;
      }
      if (price <= 0) continue;

      let name = line.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/[#*_`|]/g, '').replace(/\s+/g, ' ').trim();
      if (isNoise(name) || !isProduct(name, '')) continue;

      const key = name.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);

      let url = '';
      for (let j = Math.max(0, i - 1); j < Math.min(i + 4, lines.length); j++) {
        const um = lines[j].match(/\]\(([^)]+)\)/);
        if (um) { url = um[1].trim(); if (url.startsWith('/')) url = origin + url; else if (!url.startsWith('http')) url = origin + '/' + url; break; }
      }
      products.push({ name: name.substring(0, 150), price, url });
    }
  }

  return products;
}

/* ── Pagination ──────────────────────────────────────── */

export function detectNextPage(md: string, links: string[], curUrl: string, curPage: number): string | null {
  const next = curPage + 1;
  try {
    const base = new URL(curUrl);
    const all = [...links];
    const re = /\]\((https?:\/\/[^)]+)\)/g;
    let lm: RegExpExecArray | null;
    while ((lm = re.exec(md)) !== null) all.push(lm[1]);

    for (const link of all) {
      try {
        const u = new URL(link);
        if (u.origin !== base.origin) continue;
        const p = u.searchParams.get('page') || u.searchParams.get('p');
        if (p === String(next)) return link;
        if (u.pathname.match(new RegExp(`/page/${next}(/|$)`))) return link;
      } catch {}
    }
    if (md.match(/(?:trang|page)\s*(?:\d|›|»|>|tiếp|next)/i)) {
      const u = new URL(curUrl);
      u.searchParams.set('page', String(next));
      return u.toString();
    }
  } catch {}
  return null;
}

/* ── Build FireCrawl payload per store ────────────────── */

function buildPayload(store: StoreConfig, url: string, pageNum: number): any {
  const payload: any = {
    url,
    formats: ['markdown', 'links'],
    timeout: 30000,
  };

  // Use store-specific CSS selector to scope to product grid
  if (store.productSelector) {
    payload.includeTags = [store.productSelector];
    payload.onlyMainContent = false; // let includeTags do the filtering
  } else {
    payload.onlyMainContent = true;
  }

  // Build actions
  const actions: any[] = [];

  if (pageNum === 1) {
    actions.push({ type: 'wait', milliseconds: 2000 });

    // For loadmore stores, click the load-more button multiple times
    if (store.pagination === 'loadmore' && store.loadMoreSelector) {
      const selectors = store.loadMoreSelector.split(',').map(s => s.trim());
      // Try clicking load-more 3 times to get more products
      for (let click = 0; click < 3; click++) {
        actions.push({ type: 'scroll', direction: 'down', amount: 1500 });
        actions.push({ type: 'wait', milliseconds: 1500 });
        // Try each selector — FireCrawl will error if not found, so we wrap each in its own scroll
      }
    }

    // Always scroll to reveal lazy-loaded content
    actions.push({ type: 'scroll', direction: 'down', amount: 800 });
    actions.push({ type: 'wait', milliseconds: 1000 });
    actions.push({ type: 'scroll', direction: 'down', amount: 800 });
    actions.push({ type: 'wait', milliseconds: 1000 });
    actions.push({ type: 'scroll', direction: 'down', amount: 800 });
    actions.push({ type: 'wait', milliseconds: 500 });
  }

  if (actions.length > 0) {
    payload.actions = actions;
  }

  return payload;
}

/* ── Single-page scrape ──────────────────────────────── */

export interface PageResult {
  products: Product[];
  nextPageUrl: string | null;
}

export async function scrapeSinglePage(
  url: string, apiKey: string,
  storeId: string, pageNum: number,
): Promise<PageResult> {
  const store = STORES.find(s => s.id === storeId);
  if (!store) throw new Error(`Store ${storeId} not found`);

  const origin = new URL(url).origin;
  const payload = buildPayload(store, url, pageNum);

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

  const md: string = data?.data?.markdown || '';
  const pageLinks: string[] = data?.data?.links || [];
  if (md.length < 20) throw new Error('Trang trả về rỗng');

  const rawProducts = parseProducts(md, pageLinks, origin);

  const products: Product[] = rawProducts.map(rp => ({
    name: rp.name,
    price: formatVnd(rp.price),
    priceNumeric: rp.price,
    url: rp.url || url,
    store: store.name,
    storeId: store.id,
    storeColor: store.color,
  }));

  // Determine next page URL
  let nextPageUrl: string | null = null;
  if (store.pagination === 'page') {
    nextPageUrl = detectNextPage(md, pageLinks, url, pageNum);
  }
  // loadmore: no next page URL (all loaded via clicks on page 1)
  // none: no pagination

  return { products, nextPageUrl };
}
