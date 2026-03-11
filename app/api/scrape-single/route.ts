import { NextRequest, NextResponse } from 'next/server';
import { STORES } from '@/lib/stores';
import { getStoreConfig } from '@/lib/scrape-configs';
import type { Product } from '@/lib/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const FIRECRAWL_API = 'https://api.firecrawl.dev/v2/scrape';

/* ---------- helpers ---------- */

function extractPrice(priceStr: string): number {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[^\d]/g, '');
  const num = parseInt(cleaned, 10) || 0;
  // Vietnamese phone prices: 500k – 100M VND
  if (num >= 100000 && num <= 100000000) return num;
  // Shorthand like "12990" meaning 12,990,000
  if (num >= 1000 && num < 100000) return num * 1000;
  // Shorthand like "13" meaning 13,000,000
  if (num > 0 && num < 1000) return num * 1000000;
  return num;
}

function normalizeProducts(
  raw: any,
  storeId: string,
  storeName: string,
  storeColor: string,
  storeUrl: string,
): Product[] {
  if (!raw || !Array.isArray(raw)) return [];
  const seen = new Set<string>();
  let origin = '';
  try { origin = new URL(storeUrl).origin; } catch { /* noop */ }

  return raw
    .filter((item: any) => {
      if (!item || !item.name) return false;
      const n = String(item.name).trim();
      if (n.length < 5) return false;
      const k = n.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((item: any) => {
      let url = item.url || item.link || '';
      if (url && typeof url === 'string') {
        url = url.trim();
        if (url.startsWith('//')) url = 'https:' + url;
        else if (url.startsWith('/')) url = origin + url;
        else if (!url.startsWith('http')) url = origin + '/' + url;
      } else {
        url = '';
      }

      const priceStr = item.price ? String(item.price).trim() : '';
      const priceNumeric = extractPrice(priceStr);
      let displayPrice = priceStr;
      if (priceNumeric > 0) {
        displayPrice = new Intl.NumberFormat('vi-VN').format(priceNumeric) + '₫';
      }

      return {
        name: String(item.name).trim(),
        price: displayPrice || 'Liên hệ',
        priceNumeric,
        url: url || storeUrl,
        store: storeName,
        storeId,
        storeColor,
      } as Product;
    })
    .filter((p: Product) => p.priceNumeric >= 500000 && p.priceNumeric <= 100000000);
}

/** Fallback: parse products from markdown using regex */
function parseProductsFromMarkdown(
  markdown: string,
  storeId: string,
  storeName: string,
  storeColor: string,
  storeUrl: string,
): Product[] {
  const products: Product[] = [];
  const seen = new Set<string>();
  let origin = '';
  try { origin = new URL(storeUrl).origin; } catch { /* noop */ }

  const priceRe = /(\d{1,3}[.,]\d{3}[.,]\d{3})\s*[₫đ]?/g;
  const lines = markdown.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 10) continue;
    if (!/iphone|samsung|galaxy|xiaomi|oppo|realme|pixel|huawei|macbook|ipad|redmi|poco/i.test(line)) continue;

    let pm = line.match(priceRe);
    if (!pm && i + 1 < lines.length) pm = lines[i + 1].match(priceRe);
    if (!pm && i + 2 < lines.length) pm = lines[i + 2].match(priceRe);
    if (!pm) continue;

    let name = line
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[#*_`]/g, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\d{1,3}[.,]\d{3}[.,]\d{3}\s*[₫đ]?/g, '')
      .trim();
    if (name.length < 8) continue;

    const nk = name.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(nk)) continue;
    seen.add(nk);

    const pn = extractPrice(pm[0]);
    let url = '';
    const um = line.match(/\]\(([^)]+)\)/);
    if (um) {
      url = um[1];
      if (!url.startsWith('http')) url = url.startsWith('/') ? origin + url : origin + '/' + url;
    }

    if (pn >= 500000 && pn <= 100000000) {
      products.push({
        name: name.substring(0, 120),
        price: new Intl.NumberFormat('vi-VN').format(pn) + '₫',
        priceNumeric: pn,
        url: url || storeUrl,
        store: storeName,
        storeId,
        storeColor,
      });
    }
  }
  return products;
}

/** Safely call FireCrawl and return parsed JSON or throw */
async function firecrawlRequest(apiKey: string, payload: any): Promise<any> {
  const res = await fetch(FIRECRAWL_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  // Read response body as text first for safe parsing
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.substring(0, 200)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
  }
}

/* ---------- main handler ---------- */

export async function POST(request: NextRequest) {
  // Wrap EVERYTHING in try/catch to always return valid JSON
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body', products: [], duration: 0, storeId: '', storeName: '' },
        { status: 400 },
      );
    }

    const { storeId, apiKey } = body || {};

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'API key is required', products: [], duration: 0, storeId: storeId || '', storeName: '' },
        { status: 400 },
      );
    }

    const store = STORES.find((s) => s.id === storeId);
    if (!store) {
      return NextResponse.json(
        { error: `Store "${storeId}" not found`, products: [], duration: 0, storeId: storeId || '', storeName: '' },
        { status: 404 },
      );
    }

    const startTime = Date.now();
    const config = getStoreConfig(store.id);
    let products: Product[] = [];
    let lastError = '';
    let strategy = 'none';

    // ===== ATTEMPT 1: JSON extraction with per-store actions =====
    try {
      const payload: any = {
        url: config.url || store.url,
        formats: [
          {
            type: 'json',
            prompt: config.prompt || 'Extract all products with name, price, url.',
            schema: {
              type: 'object',
              properties: {
                products: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      price: { type: 'string' },
                      url: { type: 'string' },
                    },
                    required: ['name', 'price'],
                  },
                },
              },
              required: ['products'],
            },
          },
        ],
        onlyMainContent: config.onlyMainContent ?? false,
        timeout: config.timeout || 50000,
      };

      if (config.waitFor) payload.waitFor = config.waitFor;
      if (config.actions && config.actions.length > 0) payload.actions = config.actions;
      if (config.includeTags) payload.includeTags = config.includeTags;
      if (config.excludeTags) payload.excludeTags = config.excludeTags;

      const data = await firecrawlRequest(apiKey, payload);

      if (data?.data?.json?.products && Array.isArray(data.data.json.products)) {
        products = normalizeProducts(data.data.json.products, store.id, store.name, store.color, store.url);
        if (products.length > 0) strategy = 'json';
      }

      if (products.length === 0) {
        lastError = 'JSON extraction returned 0 valid products';
      }
    } catch (err: any) {
      lastError = `JSON attempt: ${err.message || 'Unknown error'}`;
    }

    // ===== ATTEMPT 2: Markdown fallback =====
    if (products.length === 0) {
      try {
        const payload2: any = {
          url: config.url || store.url,
          formats: ['markdown', 'links'],
          onlyMainContent: false,
          timeout: config.timeout || 50000,
          waitFor: config.waitFor || 3000,
        };
        if (config.actions && config.actions.length > 0) payload2.actions = config.actions;

        const data2 = await firecrawlRequest(apiKey, payload2);
        const md = data2?.data?.markdown || '';

        if (md.length > 100) {
          products = parseProductsFromMarkdown(md, store.id, store.name, store.color, store.url);
          if (products.length > 0) {
            strategy = 'markdown';
            lastError = '';
          }
        } else {
          lastError = 'Markdown fallback: page content too short (likely JS-only or blocked)';
        }
      } catch (err: any) {
        lastError = `Both attempts failed. Last: ${err.message || 'Unknown error'}`;
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      storeId: store.id,
      storeName: store.name,
      products,
      duration,
      strategy,
      ...(products.length === 0 && lastError ? { error: lastError } : {}),
    });
  } catch (error: any) {
    // Ultimate catch - should never reach here but guarantees JSON response
    return NextResponse.json(
      {
        error: `Server error: ${error?.message || 'Unknown'}`,
        products: [],
        duration: 0,
        storeId: '',
        storeName: '',
      },
      { status: 500 },
    );
  }
}
