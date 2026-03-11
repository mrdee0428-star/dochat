import { NextRequest, NextResponse } from 'next/server';
import { STORES } from '@/lib/stores';
import { Product } from '@/lib/types';

export const maxDuration = 60;

const FIRECRAWL_API = 'https://api.firecrawl.dev/v2/scrape';

function extractPrice(priceStr: string): number {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

function normalizeProducts(raw: any, storeId: string, storeName: string, storeColor: string, storeUrl: string): Product[] {
  if (!raw || !Array.isArray(raw)) return [];

  const seen = new Set<string>();

  return raw
    .filter((item: any) => {
      if (!item.name || !item.price) return false;
      const name = String(item.name).trim();
      if (name.length < 3) return false;
      // Dedupe by name
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item: any) => {
      let url = item.url || item.link || '';
      if (url && !url.startsWith('http')) {
        try {
          const base = new URL(storeUrl);
          url = new URL(url, base.origin).href;
        } catch {
          url = '';
        }
      }

      const priceNumeric = extractPrice(String(item.price));

      return {
        name: String(item.name).trim(),
        price: item.price ? String(item.price).trim() : 'Liên hệ',
        priceNumeric,
        url: url || storeUrl,
        store: storeName,
        storeId,
        storeColor,
      };
    })
    .filter((p: Product) => p.priceNumeric > 0);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, apiKey } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const store = STORES.find(s => s.id === storeId);
    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const startTime = Date.now();

    // Use FireCrawl JSON extraction mode
    const response = await fetch(FIRECRAWL_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: store.url,
        formats: [
          {
            type: 'json',
            prompt: `Extract ALL product listings from this Vietnamese phone store page. For each product, extract:
- name: the full product name (e.g. "iPhone 15 Pro Max 256GB")
- price: the selling price in VND (e.g. "22.990.000₫" or "22,990,000đ"). Use the current/discounted price if available.
- url: the direct link/URL to the product detail page (href attribute of the product link)

Return a JSON object with a "products" array containing all products found on the page. Each product should have: name, price, url.
If you cannot find the URL for a product, return an empty string for url.
Focus on phone/device products only, skip accessories and unrelated items.`,
            schema: {
              type: 'object',
              properties: {
                products: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string', description: 'Product name' },
                      price: { type: 'string', description: 'Price in VND' },
                      url: { type: 'string', description: 'Product URL' },
                    },
                    required: ['name', 'price'],
                  },
                },
              },
              required: ['products'],
            },
          },
        ],
        onlyMainContent: true,
        timeout: 45000,
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`FireCrawl error for ${store.name}:`, errorText);
      return NextResponse.json({
        storeId: store.id,
        storeName: store.name,
        products: [],
        error: `FireCrawl API error: ${response.status}`,
        duration,
      });
    }

    const data = await response.json();

    let products: Product[] = [];

    if (data?.data?.json?.products) {
      products = normalizeProducts(
        data.data.json.products,
        store.id,
        store.name,
        store.color,
        store.url
      );
    }

    return NextResponse.json({
      storeId: store.id,
      storeName: store.name,
      products,
      duration,
    });
  } catch (error: any) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error', products: [], duration: 0 },
      { status: 500 }
    );
  }
}
