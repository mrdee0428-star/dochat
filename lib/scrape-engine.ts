/**
 * Scrape Engine v7
 * KEY FIX: Strict product validation — only extract actual phone/device listings.
 * A "product" must pass BOTH:
 *   1. Name contains a device keyword (iPhone, Samsung, Galaxy, Xiaomi, etc.)
 *      OR URL contains a product-page pattern (/iphone, /samsung, -cu, -cu-dep, etc.)
 *   2. Price is in valid phone range (500k - 100M VND)
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
        if (n >= 500000 && n <= 100000000) return n;
      }
    }
  }
  return 0;
}

export function formatVnd(n: number): string {
  if (n <= 0) return 'Liên hệ';
  return new Intl.NumberFormat('vi-VN').format(n) + '₫';
}

/* ── Product validation ──────────────────────────────── */

// Device keywords that MUST appear in product name or URL
const DEVICE_NAME_KEYWORDS = [
  'iphone', 'ipad', 'macbook', 'apple watch', 'airpods',
  'samsung', 'galaxy',
  'xiaomi', 'redmi', 'poco',
  'oppo', 'find', 'reno',
  'vivo',
  'realme',
  'huawei', 'honor',
  'google pixel', 'pixel',
  'oneplus', 'one plus',
  'asus', 'rog phone', 'zenfone',
  'nokia',
  'nothing phone',
  'sony xperia',
  'motorola', 'moto',
  'infinix', 'tecno',
  'nubia', 'zte',
  'lenovo',
  'meizu',
  // Generic device terms
  'pro max', 'pro plus', 'ultra',
  'điện thoại', 'dien thoai',
  'máy tính bảng', 'tablet',
  'laptop',
  'đồng hồ thông minh', 'smartwatch',
  'tai nghe', 'earbuds', 'earphone',
  // Vietnamese condition terms (only appear in product listings)
  'cũ đẹp', 'cu dep', 'like new', '99%', '98%', '97%', '95%',
  'cũ trầy', 'cu tray',
  'đã kích hoạt', 'da kich hoat',
  'chính hãng', 'chinh hang',
  'vn/a', 'vna',
];

const DEVICE_URL_KEYWORDS = [
  'iphone', 'ipad', 'macbook', 'airpods',
  'samsung', 'galaxy',
  'xiaomi', 'redmi', 'poco',
  'oppo', 'vivo', 'realme', 'huawei', 'honor',
  'pixel', 'oneplus', 'asus', 'nokia', 'nothing',
  'sony', 'motorola', 'infinix', 'tecno',
  '-cu', '-cu-', 'cu-dep', 'cu-tray',
  'hang-cu', 'may-cu', 'dien-thoai',
  'like-new',
];

function isLikelyProduct(name: string, url: string): boolean {
  const nameLower = name.toLowerCase();
  const urlLower = url.toLowerCase();

  // Skip pure category links like "Apple iPhone cũ", "Samsung cũ", "Xiaomi cũ"
  // Real products have specifics: model numbers, storage, condition
  // Category names are typically short and generic
  if (/^(apple\s)?iphone\s*cũ$/i.test(name.trim())) return false;
  if (/^(samsung|xiaomi|oppo|vivo|realme|asus|nokia|infinix|tcl|tecno|oneplus|nubia)\s*cũ$/i.test(name.trim())) return false;

  // A real product should contain at least one of: a number, storage size, or specific model
  const hasSpecifics = /\d/.test(name) || /\b(pro|max|ultra|plus|mini|lite|air|se|fold|flip)\b/i.test(name);

  // Check name contains device keyword
  let nameMatch = false;
  for (const kw of DEVICE_NAME_KEYWORDS) {
    if (nameLower.includes(kw)) { nameMatch = true; break; }
  }

  // Check URL contains product pattern
  let urlMatch = false;
  for (const kw of DEVICE_URL_KEYWORDS) {
    if (urlLower.includes(kw)) { urlMatch = true; break; }
  }

  // Must have device keyword AND specifics
  return (nameMatch && hasSpecifics) || (urlMatch && hasSpecifics);
}

// Definite noise — never a product
const NOISE_RE = [
  /^(trang chủ|danh mục|menu|thương hiệu|bộ lọc|sắp xếp|xem thêm|kho máy)/i,
  /^(đăng nhập|đăng ký|tài khoản|giỏ hàng|hotline|liên hệ|hệ thống|chính sách)/i,
  /^(tin tức|blog|bài viết|hướng dẫn|tra cứu|trả góp|thu cũ|khuyến mãi)/i,
  /^(gọi mua|gọi tư vấn|miễn phí|cam kết|hỗ trợ|chăm sóc|khiếu nại)/i,
  /^(về chúng tôi|giới thiệu|điều khoản|quy định|copyright|©)/i,
  /^(tìm cửa hàng|cửa hàng gần|showroom|he thong)/i,
  /^(xem chi tiết|mua ngay|trang \d|tiếp theo|next|prev)/i,
  /^(xu hướng|từ khóa|trending|sản phẩm gợi ý|thông báo)/i,
  /^(camera|quà|gift|voucher|coupon|mã giảm)/i,
  /^(smember|đăng nhập|vui lòng|loading)/i,
  /^(cellphones?|hoàng hà|di động việt|shopdunk|techone)/i,
  /(ốp lưng|ốp điện thoại|miếng dán|kính cường lực|cường lực)/i,
  /(cáp sạc|củ sạc|sạc nhanh|sạc dự phòng|pin dự phòng)/i,
  /(bao da|túi đựng|đế sạc|dock sạc|giá đỡ)/i,
  /(dây đeo|strap|band|vỏ ốp|case )/i,
];

function isNoise(name: string): boolean {
  const s = name.trim();
  if (s.length < 5 || s.length > 150) return true;
  const lower = s.toLowerCase();
  return NOISE_RE.some(r => r.test(lower));
}

/* ── Markdown product parser ─────────────────────────── */

interface RawProduct { name: string; price: number; url: string; }

export function parseProducts(markdown: string, links: string[], origin: string): RawProduct[] {
  const products: RawProduct[] = [];
  const seen = new Set<string>();
  const lines = markdown.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // PASS 1: [name](url) or ### name  + nearby price
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract markdown links
    const re = /\[([^\]]{5,})\]\(([^)]+)\)/g;
    let m: RegExpExecArray | null;

    while ((m = re.exec(line)) !== null) {
      let name = m[1]
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/^!\[?/, '').replace(/^\[/, '')
        .replace(/[#*_`|]/g, '').trim();

      if (isNoise(name)) continue;

      let url = m[2].trim();
      if (url.startsWith('/')) url = origin + url;
      else if (!url.startsWith('http')) url = origin + '/' + url;
      if (/\.(jpg|jpeg|png|gif|svg|webp|css|js)(\?|$)/i.test(url)) continue;

      // ★ KEY CHECK: must look like an actual product
      if (!isLikelyProduct(name, url)) continue;

      let price = 0;
      for (let j = i; j < Math.min(i + 5, lines.length); j++) {
        price = parseVndPrice(lines[j]);
        if (price > 0) break;
      }
      if (price <= 0) continue;

      const key = name.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(key)) continue;
      seen.add(key);

      products.push({ name: name.replace(/\s+/g, ' ').substring(0, 150), price, url });
    }

    // Also check ### headings (CellphoneS uses ### for product names)
    const headingMatch = line.match(/^#{1,4}\s+(.{5,})/);
    if (headingMatch) {
      const hName = headingMatch[1].replace(/[#*_`|]/g, '').trim();
      if (!isNoise(hName) && isLikelyProduct(hName, '')) {
        let price = 0;
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          price = parseVndPrice(lines[j]);
          if (price > 0) break;
        }
        if (price > 0) {
          const key = hName.toLowerCase().replace(/\s+/g, ' ');
          if (!seen.has(key)) {
            seen.add(key);
            // Find URL from nearby lines
            let url = '';
            for (let j = Math.max(0, i - 2); j < Math.min(i + 4, lines.length); j++) {
              const um = lines[j].match(/\]\(([^)]+)\)/);
              if (um && !um[1].match(/\.(jpg|jpeg|png|gif|svg|webp)(\?|$)/i)) {
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

  // PASS 2: fallback for stores without links — name line + price
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

      if (isNoise(name)) continue;
      if (!isLikelyProduct(name, '')) continue; // ★ Must be a device

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

/* ── Single-page scrape ──────────────────────────────── */

export interface PageResult {
  products: Product[];
  nextPageUrl: string | null;
}

export async function scrapeSinglePage(
  url: string, apiKey: string,
  storeName: string, storeId: string, storeColor: string,
  pageNum: number,
): Promise<PageResult> {
  const origin = new URL(url).origin;

  const payload: any = {
    url,
    formats: ['markdown', 'links'],
    onlyMainContent: true,
    timeout: 30000,
  };

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

  return { products, nextPageUrl };
}
