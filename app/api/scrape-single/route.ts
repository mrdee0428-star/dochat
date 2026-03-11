import { NextRequest, NextResponse } from 'next/server';
import { STORES } from '@/lib/stores';
import type { Product } from '@/lib/types';
import { getStoreConfig } from '@/lib/scrape-configs';

export const maxDuration = 60;

const FIRECRAWL_API = 'https://api.firecrawl.dev/v2/scrape';

function extractPrice(priceStr: string): number {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[^\d]/g, '');
  const num = parseInt(cleaned, 10) || 0;
  if (num > 0 && num < 1000) return num * 1000000;
  if (num >= 1000 && num < 100000) return num * 1000;
  return num;
}

function normalizeProducts(
  raw: any,
  storeId: string,
  storeName: string,
  storeColor: string,
  storeUrl: string
): Product[] {
  if (!raw || !Array.isArray(raw)) return [];
  const seen = new Set<string>();
  let origin = '';
  try { origin = new URL(storeUrl).origin; } catch {}

  return raw
    .filter((item: any) => {
      if (!item.name) return false;
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
      } else { url = ''; }

      const priceStr = item.price ? String(item.price).trim() : '';
      const priceNumeric = extractPrice(priceStr);
      let displayPrice = priceStr;
      if (priceNumeric > 0 && !/[.,]/.test(priceStr)) {
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
      };
    })
    .filter((p: Product) => p.priceNumeric >= 500000 && p.priceNumeric <= 100000000);
}

function parseProductsFromMarkdown(
  markdown: string,
  storeId: string,
  storeName: string,
  storeColor: string,
  storeUrl: string
): Product[] {
  const products: Product[] = [];
  const seen = new Set<string>();
  let origin = '';
  try { origin = new URL(storeUrl).origin; } catch {}

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

export async function POST(request: NextRequest) {
  try {
    const { storeId, apiKey } = await request.json();
    if (!apiKey) return NextResponse.json({ error: 'API key is required' }, { status: 400 });

    const store = STORES.find(s => s.id === storeId);
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 });

    const startTime = Date.now();
    const config = getStoreConfig(store.id);
    let products: Product[] = [];
    let lastError = '';

    // ===== ATTEMPT 1: JSON extraction with per-store actions =====
    try {
      const payload: any = {
        url: config.url || store.url,
        formats: [{
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
        }],
        onlyMainContent: config.onlyMainContent ?? false,
        timeout: config.timeout || 50000,
      };
      if (config.waitFor) payload.waitFor = config.waitFor;
      if (config.actions && config.actions.length > 0) payload.actions = config.actions;
      if (config.includeTags) payload.includeTags = config.includeTags;
      if (config.excludeTags) payload.excludeTags = config.excludeTags;

      const res = await fetch(FIRECRAWL_API, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.data?.json?.products) {
          products = normalizeProducts(data.data.json.products, store.id, store.name, store.color, store.url);
        } else {
          lastError = 'JSON mode returned no products';
        }
      } else {
        lastError = `HTTP ${res.status}`;
        try { const t = await res.text(); lastError += ': ' + t.substring(0, 150); } catch {}
      }
    } catch (err: any) {
      lastError = err.message || 'Network error';
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

        const res2 = await fetch(FIRECRAWL_API, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload2),
        });

        if (res2.ok) {
          const data2 = await res2.json();
          const md = data2?.data?.markdown || '';
          if (md.length > 100) {
            products = parseProductsFromMarkdown(md, store.id, store.name, store.color, store.url);
            if (products.length > 0) lastError = '';
          }
        }
      } catch {}
    }

    const duration = Date.now() - startTime;
    return NextResponse.json({
      storeId: store.id,
      storeName: store.name,
      products,
      duration,
      ...(products.length === 0 && lastError ? { error: lastError } : {}),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error', products: [], duration: 0, storeId: '', storeName: '' },
      { status: 500 },
    );
  }
}