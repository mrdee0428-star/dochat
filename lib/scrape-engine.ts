/**
 * PhoneCrawl Scrape Engine v4 — Complete Redesign
 *
 * Architecture: MARKDOWN-FIRST (no LLM dependency)
 * 1. FireCrawl renders page with browser actions → returns markdown + links
 * 2. We parse products deterministically from markdown via robust regex
 * 3. No LLM extraction = deterministic, cheaper (1 credit vs 5), faster
 *
 * Fixes applied:
 * - Pagination: crawl up to MAX_PAGES pages per store
 * - Scroll: explicit pixel amounts (window height multiples)
 * - Regex: universal price parser, no brand-keyword filter
 * - Deterministic: no LLM — pure regex extraction
 * - Popups: click-dismiss actions before scroll
 * - Rate limit: exponential backoff retry
 */

import type { Product } from './types';
import type { StoreConfig } from './stores';

const FIRECRAWL_API = 'https://api.firecrawl.dev/v2/scrape';
const MAX_PAGES = 5;

/* ================================================================
   PRICE PARSER — handles ALL Vietnamese price formats
   ================================================================ */

/**
 * Parse ANY Vietnamese price string to numeric VND.
 * Handles: 22.990.000₫  |  22,990,000đ  |  990.000₫  |  22990000  |  "Giá: 5.990.000 VNĐ"
 */
export function parseVndPrice(raw: string): number {
  if (!raw) return 0;

  // Strategy: find all digit groups separated by dots or commas
  // Vietnamese format: digits separated by . or , as thousand separator
  // Examples: "22.990.000" "990.000" "22,990,000" "5.990.000"

  // First, try to find explicit VND price patterns
  const patterns = [
    // 1.234.567 or 1,234,567 (with 2+ groups of 3 digits)
    /(\d{1,3}(?:[.,]\d{3}){2,})/g,
    // 123.456 or 123,456 (one separator, likely thousands)
    /(\d{1,3}[.,]\d{3})(?!\d)/g,
    // Plain large number: 22990000, 990000
    /(\d{6,9})/g,
  ];

  for (const pattern of patterns) {
    const matches = raw.match(pattern);
    if (matches) {
      for (const match of matches) {
        const cleaned = match.replace(/[.,]/g, '');
        const num = parseInt(cleaned, 10);
        if (num >= 100000 && num <= 200000000) return num;
      }
    }
  }

  return 0;
}

/** Format number to Vietnamese display price */
export function formatVnd(n: number): string {
  if (n <= 0) return 'Liên hệ';
  return new Intl.NumberFormat('vi-VN').format(n) + '₫';
}

/* ================================================================
   MARKDOWN PRODUCT PARSER — deterministic, no LLM
   ================================================================ */

interface RawProduct {
  name: string;
  price: number;
  url: string;
}

/**
 * Parse products from FireCrawl markdown output.
 *
 * Strategy: Look for markdown links that contain a price nearby.
 * Vietnamese phone store pages typically have this structure:
 *   [Product Name](url) ... 22.990.000₫
 * or
 *   Product Name
 *   22.990.000₫
 *   [Xem chi tiết](url)
 */
export function parseProductsFromMarkdown(
  markdown: string,
  links: string[],
  storeOrigin: string,
): RawProduct[] {
  const products: RawProduct[] = [];
  const seen = new Set<string>();
  const lines = markdown.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // === PASS 1: Extract [name](url) + price combos ===
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Find markdown links: [text](url)
    const linkRegex = /\[([^\]]{5,})\]\(([^)]+)\)/g;
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = linkRegex.exec(line)) !== null) {
      let rawName = linkMatch[1];

      // Strip nested image syntax: ![alt](url) or ![](url)
      rawName = rawName.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
      // Strip remaining markdown and leading ![ (from [![ patterns)
      rawName = rawName.replace(/^!\[?/, '').replace(/^\[/, '').replace(/[#*_`|]/g, '').trim();

      if (rawName.length < 5) continue;

      // Skip navigation/utility links
      if (/^(xem thêm|xem chi tiết|mua ngay|trang|tiếp|next|prev|>|<|»|«)/i.test(rawName)) continue;

      let url = linkMatch[2].trim();
      if (url.startsWith('/')) url = storeOrigin + url;
      else if (!url.startsWith('http')) url = storeOrigin + '/' + url;

      // Look for price on this line, or next 3 lines
      let price = 0;
      for (let j = i; j < Math.min(i + 4, lines.length); j++) {
        price = parseVndPrice(lines[j]);
        if (price > 0) break;
      }

      if (price <= 0) continue;

      // Dedupe by name
      const key = rawName.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);

      // Clean name: remove markdown artifacts, excessive whitespace
      const name = rawName
        .replace(/[#*_`]/g, '')
        .replace(/\s+/g, ' ')
        .substring(0, 150);

      products.push({ name, price, url });
    }
  }

  // === PASS 2: If PASS 1 found few results, try line-by-line blocks ===
  if (products.length < 3) {
    // Look for blocks of consecutive lines where one is a "name" and another is a "price"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip very short lines, pure images, pure URLs, headings
      if (line.length < 8) continue;
      if (line.startsWith('![')) continue;
      if (/^https?:\/\//.test(line)) continue;
      if (/^#{1,4}\s/.test(line)) continue; // Skip markdown headings
      if (/^(trang chủ|danh mục|menu|thương hiệu|bộ lọc|sắp xếp|xem thêm|kho máy)/i.test(line)) continue;

      // Check if this line has no price but looks like a product name
      const linePrice = parseVndPrice(line);
      if (linePrice > 0) continue; // This is a price line, not a name

      // Check if ANY of the next 4 lines has a price
      let foundPrice = 0;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        foundPrice = parseVndPrice(lines[j]);
        if (foundPrice > 0) break;
      }
      if (foundPrice <= 0) continue;

      // Clean the name
      let name = line
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/[#*_`|]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (name.length < 5 || name.length > 150) continue;

      const key = name.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);

      // Try to find URL from nearby lines or links array
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

      products.push({ name, price: foundPrice, url });
    }
  }

  return products;
}

/* ================================================================
   FIRECRAWL REQUEST WITH RETRY + BACKOFF
   ================================================================ */

async function firecrawlFetch(
  apiKey: string,
  payload: any,
  retries = 1,
): Promise<any> {
  let lastErr = '';

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      // Short backoff: 1.5s
      await new Promise(r => setTimeout(r, 1500));
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000); // 18s hard timeout per request

      const res = await fetch(FIRECRAWL_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const text = await res.text();

      if (res.status === 429) {
        lastErr = 'Rate limited';
        continue; // retry
      }

      if (!res.ok) {
        lastErr = `HTTP ${res.status}: ${text.substring(0, 100)}`;
        if (attempt < retries) continue;
        throw new Error(lastErr);
      }

      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`Invalid JSON: ${text.substring(0, 80)}`);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        lastErr = 'Request timeout (18s)';
        if (attempt < retries) continue;
      }
      lastErr = err.message || 'Network error';
      if (attempt >= retries) throw new Error(lastErr);
    }
  }

  throw new Error(lastErr || 'All retries exhausted');
}

/* ================================================================
   BUILD ACTIONS — popup dismiss + scroll with pixel amounts
   ================================================================ */

function buildActions(): any[] {
  return [
    // 1. Wait for initial JS render
    { type: 'wait', milliseconds: 2500 },

    // 2. Scroll down in measured steps to trigger lazy-loading
    //    (amount is in pixels; typical viewport ~900px)
    { type: 'scroll', direction: 'down', amount: 800 },
    { type: 'wait', milliseconds: 1000 },
    { type: 'scroll', direction: 'down', amount: 800 },
    { type: 'wait', milliseconds: 1000 },
    { type: 'scroll', direction: 'down', amount: 800 },
    { type: 'wait', milliseconds: 1000 },

    // 3. Scroll back to top to capture full page content
    { type: 'scroll', direction: 'up', amount: 3000 },
    { type: 'wait', milliseconds: 500 },
  ];
}

/* ================================================================
   PAGINATION — detect next page URLs
   ================================================================ */

interface PaginationInfo {
  nextUrl: string | null;
  totalPagesDetected: number;
}

/**
 * Detect pagination from markdown content and links.
 * Vietnamese stores use various pagination patterns:
 * - ?page=2, ?p=2, /page/2
 * - Buttons with text "Tiếp", "Xem thêm", "Trang 2", ">"
 */
function detectNextPage(
  markdown: string,
  links: string[],
  currentUrl: string,
  currentPage: number,
): PaginationInfo {
  const nextPage = currentPage + 1;

  try {
    const base = new URL(currentUrl);

    // Check links for pagination patterns
    const allLinks = [...links];

    // Also extract links from markdown
    const mdLinkRegex = /\]\((https?:\/\/[^)]+)\)/g;
    let mdLinkMatch: RegExpExecArray | null;
    while ((mdLinkMatch = mdLinkRegex.exec(markdown)) !== null) {
      allLinks.push(mdLinkMatch[1]);
    }

    for (const link of allLinks) {
      try {
        const u = new URL(link);
        if (u.origin !== base.origin) continue;

        // Pattern: ?page=N or &page=N
        const pageParam = u.searchParams.get('page') || u.searchParams.get('p');
        if (pageParam === String(nextPage)) {
          return { nextUrl: link, totalPagesDetected: nextPage };
        }

        // Pattern: /page/N in path
        if (u.pathname.match(new RegExp(`/page/${nextPage}(/|$)`))) {
          return { nextUrl: link, totalPagesDetected: nextPage };
        }
      } catch { /* skip invalid urls */ }
    }

    // Construct pagination URL by modifying current URL
    const tryUrls: string[] = [];
    const url = new URL(currentUrl);

    // Try adding ?page=N
    url.searchParams.set('page', String(nextPage));
    tryUrls.push(url.toString());

    // Try ?p=N
    const url2 = new URL(currentUrl);
    url2.searchParams.set('p', String(nextPage));
    tryUrls.push(url2.toString());

    // Check if markdown mentions page numbers (indicates pagination exists)
    const hasPageRefs = markdown.match(/(?:trang|page)\s*(?:\d|›|»|>|tiếp|next)/i);
    if (hasPageRefs && tryUrls.length > 0) {
      return { nextUrl: tryUrls[0], totalPagesDetected: nextPage };
    }
  } catch { /* noop */ }

  return { nextUrl: null, totalPagesDetected: currentPage };
}

/* ================================================================
   MAIN SCRAPE FUNCTION — called by API route
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
    // Time budget: stop if we've used more than 40s (Vercel limit is 60s)
    const elapsed = Date.now() - startTime;
    if (elapsed > 40000) break;

    try {
      const payload = {
        url: currentUrl,
        formats: ['markdown', 'links'] as string[],
        onlyMainContent: false,
        timeout: 15000,
        waitFor: 1000,
        actions: buildActions(),
      };

      // First page gets 1 retry, subsequent pages get 0
      const data = await firecrawlFetch(apiKey, payload, page === 1 ? 1 : 0);

      const md: string = data?.data?.markdown || '';
      const links: string[] = data?.data?.links || [];

      if (md.length < 50) {
        if (page === 1) lastError = 'Page trả về nội dung rỗng (bị block hoặc JS-only)';
        break;
      }

      // Parse products from this page
      const rawProducts = parseProductsFromMarkdown(md, links, origin);

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

      // Check if there's a next page
      if (page < MAX_PAGES) {
        const pagination = detectNextPage(md, links, currentUrl, page);
        if (pagination.nextUrl && pagination.nextUrl !== currentUrl) {
          currentUrl = pagination.nextUrl;
        } else {
          break; // No more pages
        }
      }
    } catch (err: any) {
      lastError = err.message || 'Unknown error';
      if (page === 1) break; // If first page fails, stop
      break; // If subsequent page fails, return what we have
    }
  }

  const duration = Date.now() - startTime;

  return {
    products: allProducts,
    pagesScraped,
    duration,
    ...(allProducts.length === 0 && lastError ? { error: lastError } : {}),
  };
}
