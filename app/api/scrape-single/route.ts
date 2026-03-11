import { NextRequest, NextResponse } from 'next/server';
import { STORES } from '@/lib/stores';
import { scrapeStore } from '@/lib/scrape-engine';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        error: 'Request body không hợp lệ',
        products: [], duration: 0, storeId: '', storeName: '', pagesScraped: 0,
      });
    }

    const { storeId, apiKey } = body || {};

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({
        error: 'Thiếu API key',
        products: [], duration: 0, storeId: storeId || '', storeName: '', pagesScraped: 0,
      });
    }

    const store = STORES.find(s => s.id === storeId);
    if (!store) {
      return NextResponse.json({
        error: `Store "${storeId}" không tồn tại`,
        products: [], duration: 0, storeId: storeId || '', storeName: '', pagesScraped: 0,
      });
    }

    // 55s safety — if scrapeStore somehow hangs
    const result = await Promise.race([
      scrapeStore(store, apiKey),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Vercel timeout: >55s')), 55000)
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
    // This catches both scrapeStore errors and timeout
    return NextResponse.json({
      error: error?.message || 'Lỗi server',
      products: [], duration: 0, storeId: '', storeName: '', pagesScraped: 0,
    });
  }
}
