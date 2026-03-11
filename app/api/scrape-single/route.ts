import { NextRequest, NextResponse } from 'next/server';
import { STORES } from '@/lib/stores';
import { scrapeStore } from '@/lib/scrape-engine';

// Vercel serverless: max 60s, but we limit ourselves to ~50s to have margin
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        error: 'Invalid request body',
        products: [],
        duration: 0,
        storeId: '',
        storeName: '',
        pagesScraped: 0,
      });
    }

    const { storeId, apiKey } = body || {};

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({
        error: 'API key is required',
        products: [],
        duration: 0,
        storeId: storeId || '',
        storeName: '',
        pagesScraped: 0,
      });
    }

    const store = STORES.find(s => s.id === storeId);
    if (!store) {
      return NextResponse.json({
        error: `Store "${storeId}" not found`,
        products: [],
        duration: 0,
        storeId: storeId || '',
        storeName: '',
        pagesScraped: 0,
      });
    }

    // Run scrape with a 50s safety timeout
    const result = await Promise.race([
      scrapeStore(store, apiKey),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: vượt quá 50 giây')), 50000)
      ),
    ]);

    return NextResponse.json({
      storeId: store.id,
      storeName: store.name,
      products: result.products,
      pagesScraped: result.pagesScraped,
      duration: result.duration,
      ...(result.error ? { error: result.error } : {}),
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || 'Internal server error',
      products: [],
      duration: 0,
      storeId: '',
      storeName: '',
      pagesScraped: 0,
    });
  }
}
