/**
 * Scrape Engine v6
 * - Single page per API call (client orchestrates pagination)
 * - onlyMainContent: true to filter out nav/footer noise
 * - Smarter product-only parsing
 */

import type { Product } from './types';

const FIRECRAWL_API = 'https://api.firecrawl.dev/v2/scrape';

/* ── Price parser ────────────────────────────────────── */

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
        if (n >= 100000 && n <= 200000000) return n;
      }
    }
  }
  return 0;
}

export function formatVnd(n: number): string {
  if (n <= 0) return 'Liên hệ';
  return new Intl.NumberFormat('vi-VN').format(n) + '₫';
}

/* ── Noise filter — skip non-product lines ───────────── */

const NOISE_PATTERNS = [
  /^(trang chủ|danh mục|menu|thương hiệu|bộ lọc|sắp xếp|xem thêm|kho máy)/i,
  /^(đăng nhập|đăng ký|tài khoản|giỏ hàng|hotline|liên hệ|hệ thống|chính sách)/i,
  /^(tin tức|blog|bài viết|hướng dẫn|tra cứu|trả góp|thu cũ|khuyến mãi)/i,
  /^(gọi mua|gọi tư vấn|miễn phí|cam kết|hỗ trợ|chăm sóc)/i,
  /^(về chúng tôi|giới thiệu|điều khoản|quy định|copyright|©)/i,
  /^(tìm cửa hàng|cửa hàng gần|he thong|showroom)/i,
  /^(xem chi tiết|mua ngay|trang \d|tiếp theo|next|prev|previous)/i,
  /^(xu hướng tìm kiếm|từ khóa|trending)/i,
];

function isNoiseName(name: string): boolean {
  const lower = name.toLowerCase().trim();
  if (lower.length < 5 || lower.length > 150) return true;
  return NOISE_PATTERNS.some(p => p.test(lower));
}

/* ── Markdown product parser ─────────────────────────── */

interface RawProduct { name: string; price: number; url: string; }

export function parseProducts(markdown: string, links: string[], origin: string): RawProduct[] {
  const products: RawProduct[] = [];
  const seen = new Set<string>();
  const lines = markdown.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // PASS 1: [name](url) + nearby price
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const re = /\[([^\]]{5,})\]\(([^)]+)\)/g;
    let m: RegExpExecArray | null;

    while ((m = re.exec(line)) !== null) {
      let name = m[1]
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/^!\[?/, '').replace(/^\[/, '')
        .replace(/[#*_`|]/g, '').trim();

      if (isNoiseName(name)) continue;

      let url = m[2].trim();
      if (url.startsWith('/')) url = origin + url;
      else if (!url.startsWith('http')) url = origin + '/' + url;
      if (/\.(jpg|jpeg|png|gif|svg|webp|css|js)(\?|$)/i.test(url)) continue;

      let price = 0;
      for (let j = i; j < Math.min(i + 4, lines.length); j++) {
        price = parseVndPrice(lines[j]);
        if (price > 0) break;
      }
      if (price <= 0) continue;

      const key = name.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);

      products.push({ name: name.replace(/\s+/g, ' ').substring(0, 150), price, url });
    }
  }

  // PASS 2: name line + nearby price (no link required)
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

      let name = line.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/[#*_`|]/g, '').replace(/\s+/g, ' ').trim();

      if (isNoiseName(name)) continue;
      const key = name.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);

      let url = '';
      for (let j = Math.max(0, i - 1); j < Math.min(i + 4, lines.length); j++) {
        const um = lines[j].match(/\]\(([^)]+)\)/);
        if (um) {
          url = um[1].trim();
          if (url.startsWith('/')) url = origin + url;
          else if (!url.startsWith('http')) url = origin + '/' + url;
          break;
        }
      }
      products.push({ name: name.substring(0, 150), price, url });
    }
  }

  return products;
}

/* ── Pagination detection ────────────────────────────── */

export function detectNextPage(markdown: string, links: string[], currentUrl: string, currentPage: number): string | null {
  const next = currentPage + 1;
  try {
    const base = new URL(currentUrl);
    const allLinks = [...links];
    const re = /\]\((https?:\/\/[^)]+)\)/g;
    let lm: RegExpExecArray | null;
    while ((lm = re.exec(markdown)) !== null) allLinks.push(lm[1]);

    for (const link of allLinks) {
      try {
        const u = new URL(link);
        if (u.origin !== base.origin) continue;
        const p = u.searchParams.get('page') || u.searchParams.get('p');
        if (p === String(next)) return link;
        if (u.pathname.match(new RegExp(`/page/${next}(/|$)`))) return link;
      } catch { /* skip */ }
    }

    if (markdown.match(/(?:trang|page)\s*(?:\d|›|»|>|tiếp|next)/i)) {
      const u = new URL(currentUrl);
      u.searchParams.set('page', String(next));
      return u.toString();
    }
  } catch { /* noop */ }
  return null;
}

/* ── Single-page scrape (called by API route) ────────── */

export interface PageResult {
  products: Product[];
  nextPageUrl: string | null;
  markdown_length: number;
}

export async function scrapeSinglePage(
  url: string,
  apiKey: string,
  storeName: string,
  storeId: string,
  storeColor: string,
  pageNum: number,
): Promise<PageResult> {
  const origin = new URL(url).origin;

  const payload: any = {
    url,
    formats: ['markdown', 'links'],
    onlyMainContent: true,
    timeout: 30000,
  };

  // Actions only for page 1 (JS-rendered stores)
  if (pageNum === 1) {
    payload.actions = [
      { type: 'wait', milliseconds: 2000 },
      { type: 'scroll', direction: 'down', amount: 800 },
      { type: 'wait', milliseconds: 1000 },
      { type: 'scroll', direction: 'down', amount: 800 },
      { type: 'wait', milliseconds: 1000 },
      { type: 'scroll', direction: 'down', amount: 800 },
      { type: 'wait', milliseconds: 500 },
    ];
  }

  // Call FireCrawl
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
      let detail = `HTTP ${res.status}`;
      try { const e = JSON.parse(text); detail = e.error || e.message || detail; } catch { detail += `: ${text.substring(0, 100)}`; }
      throw new Error(detail);
    }
    data = JSON.parse(text);
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Timeout 40s');
    throw err;
  }

  const md: string = data?.data?.markdown || '';
  const pageLinks: string[] = data?.data?.links || [];

  if (md.length < 30) throw new Error('Trang trả về rỗng');

  const rawProducts = parseProducts(md, pageLinks, origin);

  const products: Product[] = rawProducts.map(rp => ({
    name: rp.name,
    price: formatVnd(rp.price),
    priceNumeric: rp.price,
    url: rp.url || url,
    store: storeName,
    storeId,
    storeColor,
  }));

  const nextPageUrl = detectNextPage(md, pageLinks, url, pageNum);

  return { products, nextPageUrl, markdown_length: md.length };
}
