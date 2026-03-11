/**
 * PhoneCrawl Scrape Engine v5
 *
 * Key design constraints:
 * - Vercel serverless max: 60s per invocation
 * - FireCrawl free tier: 10 req/min, 2 concurrent browsers
 * - FireCrawl actions wait time + waitFor MUST NOT exceed 60s total
 * - NO retries (waste of time budget) — fail fast, return error
 *
 * Timing budget per store:
 *   FireCrawl timeout: 30s (server-side, includes actions)
 *   Client fetch timeout: 35s (margin over server)
 *   Max 1 page per store (pagination only if time remains)
 *   Safety: scrapeStore checks elapsed < 45s before page 2
 */

import type { Product } from './types';
import type { StoreConfig } from './stores';

const FIRECRAWL_API = 'https://api.firecrawl.dev/v2/scrape';
const MAX_PAGES = 3;

/* ================================================================
   PRICE PARSER
   ================================================================ */

export function parseVndPrice(raw: string): number {
  if (!raw) return 0;
  const patterns = [
    /(\d{1,3}(?:[.,]\d{3}){2,})/g,   // 1.234.567 or 22,990,000
    /(\d{1,3}[.,]\d{3})(?!\d)/g,      // 990.000 or 990,000
    /(\d{6,9})/g,                      // 22990000
  ];
  for (const pattern of patterns) {
    const matches = raw.match(pattern);
    if (matches) {
      for (const m of matches) {
        const num = parseInt(m.replace(/[.,]/g, ''), 10);
        if (num >= 100000 && num <= 200000000) return num;
      }
    }
  }
  return 0;
}

export function formatVnd(n: number): string {
  if (n <= 0) return 'Liên hệ';
  return new Intl.NumberFormat('vi-VN').format(n) + '₫';
}

/* ================================================================
   MARKDOWN PRODUCT PARSER
   ================================================================ */

interface RawProduct { name: string; price: number; url: string; }

export function parseProductsFromMarkdown(
  markdown: string,
  links: string[],
  storeOrigin: string,
): RawProduct[] {
  const products: RawProduct[] = [];
  const seen = new Set<string>();
  const lines = markdown.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // PASS 1: [name](url) + nearby price
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const linkRegex = /\[([^\]]{5,})\]\(([^)]+)\)/g;
    let lm: RegExpExecArray | null;

    while ((lm = linkRegex.exec(line)) !== null) {
      let rawName = lm[1]
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/^!\[?/, '').replace(/^\[/, '')
        .replace(/[#*_`|]/g, '').trim();

      if (rawName.length < 5) continue;
      if (/^(xem thêm|xem chi tiết|mua ngay|trang |tiếp|next|prev|đăng nhập|tìm|hotline)/i.test(rawName)) continue;

      let url = lm[2].trim();
      if (url.startsWith('/')) url = storeOrigin + url;
      else if (!url.startsWith('http')) url = storeOrigin + '/' + url;

      // Skip image/asset URLs being used as product links
      if (/\.(jpg|jpeg|png|gif|svg|webp|css|js)(\?|$)/i.test(url)) continue;

      let price = 0;
      for (let j = i; j < Math.min(i + 4, lines.length); j++) {
        price = parseVndPrice(lines[j]);
        if (price > 0) break;
      }
      if (price <= 0) continue;

      const key = rawName.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);

      products.push({
        name: rawName.replace(/\s+/g, ' ').substring(0, 150),
        price,
        url,
      });
    }
  }

  // PASS 2: fallback — name line + price on next lines
  if (products.length < 3) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length < 8 || line.startsWith('![') || /^https?:\/\//.test(line)) continue;
      if (/^#{1,4}\s/.test(line)) continue;
      if (/^(trang chủ|danh mục|menu|thương hiệu|bộ lọc|sắp xếp|xem thêm|kho máy|đăng nhập|hotline)/i.test(line)) continue;

      if (parseVndPrice(line) > 0) continue; // price line, not name

      let foundPrice = 0;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        foundPrice = parseVndPrice(lines[j]);
        if (foundPrice > 0) break;
      }
      if (foundPrice <= 0) continue;

      let name = line
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/[#*_`|]/g, '')
        .replace(/\s+/g, ' ').trim();

      if (name.length < 5 || name.length > 150) continue;

      const key = name.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);

      let url = '';
      for (let j = Math.max(0, i - 1); j < Math.min(i + 4, lines.length); j++) {
        const um = lines[j].match(/\]\(([^)]+)\)/);
        if (um) {
          url = um[1].trim();
          if (url.startsWith('/')) url = storeOrigin + url;
          else if (!url.startsWith('http')) url = storeOrigin + '/' + url;
          break;
        }
      }

      products.push({ name: name.substring(0, 150), price: foundPrice, url });
    }
  }

  return products;
}

/* ================================================================
   FIRECRAWL REQUEST — NO retries, fail fast
   ================================================================ */

async function firecrawlFetch(apiKey: string, payload: any): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000); // 35s client timeout

  try {
    const res = await fetch(FIRECRAWL_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const text = await res.text();

    if (!res.ok) {
      // Extract meaningful error from FireCrawl response
      let errorDetail = `HTTP ${res.status}`;
      try {
        const errJson = JSON.parse(text);
        errorDetail = errJson.error || errJson.message || errorDetail;
      } catch {
        errorDetail += `: ${text.substring(0, 150)}`;
      }
      throw new Error(errorDetail);
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Response không phải JSON: ${text.substring(0, 80)}`);
    }
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('FireCrawl không phản hồi sau 35s');
    }
    throw err;
  }
}

/* ================================================================
   PAGINATION DETECTION
   ================================================================ */

function detectNextPage(
  markdown: string,
  links: string[],
  currentUrl: string,
  currentPage: number,
): string | null {
  const nextPage = currentPage + 1;

  try {
    const base = new URL(currentUrl);

    // Check all links for ?page=N pattern
    const allLinks = [...links];
    const mdLinkRegex = /\]\((https?:\/\/[^)]+)\)/g;
    let mlm: RegExpExecArray | null;
    while ((mlm = mdLinkRegex.exec(markdown)) !== null) {
      allLinks.push(mlm[1]);
    }

    for (const link of allLinks) {
      try {
        const u = new URL(link);
        if (u.origin !== base.origin) continue;
        const p = u.searchParams.get('page') || u.searchParams.get('p');
        if (p === String(nextPage)) return link;
        if (u.pathname.match(new RegExp(`/page/${nextPage}(/|$)`))) return link;
      } catch { /* skip */ }
    }

    // Try constructing ?page=N if pagination indicators exist
    if (markdown.match(/(?:trang|page)\s*(?:\d|›|»|>|tiếp|next)/i)) {
      const u = new URL(currentUrl);
      u.searchParams.set('page', String(nextPage));
      return u.toString();
    }
  } catch { /* noop */ }

  return null;
}

/* ================================================================
   MAIN: scrapeStore
   ================================================================ */

export interface ScrapeResult {
  products: Product[];
  pagesScraped: number;
  error?: string;
  duration: number;
}

export async function scrapeStore(
  store: StoreConfig,
  apiKey: string,
): Promise<ScrapeResult> {
  const startTime = Date.now();
  const allProducts: Product[] = [];
  const seenNames = new Set<string>();
  let currentUrl = store.url;
  let pagesScraped = 0;
  let lastError = '';

  let origin = '';
  try { origin = new URL(store.url).origin; } catch { /* noop */ }

  for (let page = 1; page <= MAX_PAGES; page++) {
    // Time check: need at least 15s remaining
    if (Date.now() - startTime > 40000) break;

    try {
      const payload: any = {
        url: currentUrl,
        formats: ['markdown', 'links'],
        onlyMainContent: false,
        timeout: 30000,  // FireCrawl server-side timeout
      };

      // Only add actions for page 1 (need JS render + scroll)
      // Page 2+ are usually server-rendered pagination
      if (page === 1) {
        payload.actions = [
          { type: 'wait', milliseconds: 2000 },
          { type: 'scroll', direction: 'down', amount: 800 },
          { type: 'wait', milliseconds: 1000 },
          { type: 'scroll', direction: 'down', amount: 800 },
          { type: 'wait', milliseconds: 1000 },
          { type: 'scroll', direction: 'down', amount: 800 },
          { type: 'wait', milliseconds: 500 },
        ];
        // Total action wait: 4500ms — well under 60s limit
      }

      const data = await firecrawlFetch(apiKey, payload);

      const md: string = data?.data?.markdown || '';
      const pageLinks: string[] = data?.data?.links || [];

      if (md.length < 50) {
        if (page === 1) lastError = 'Trang trả về rỗng (bị block hoặc chưa render JS)';
        break;
      }

      const rawProducts = parseProductsFromMarkdown(md, pageLinks, origin);

      for (const rp of rawProducts) {
        const key = rp.name.toLowerCase().replace(/\s+/g, ' ');
        if (seenNames.has(key)) continue;
        seenNames.add(key);

        allProducts.push({
          name: rp.name,
          price: formatVnd(rp.price),
          priceNumeric: rp.price,
          url: rp.url || currentUrl,
          store: store.name,
          storeId: store.id,
          storeColor: store.color,
        });
      }

      pagesScraped = page;

      // Try next page
      if (page < MAX_PAGES) {
        const nextUrl = detectNextPage(md, pageLinks, currentUrl, page);
        if (nextUrl && nextUrl !== currentUrl) {
          currentUrl = nextUrl;
        } else {
          break;
        }
      }
    } catch (err: any) {
      lastError = err.message || 'Lỗi không xác định';
      break;
    }
  }

  return {
    products: allProducts,
    pagesScraped,
    duration: Date.now() - startTime,
    ...(allProducts.length === 0 && lastError ? { error: lastError } : {}),
  };
}
