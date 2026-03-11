import { NextRequest, NextResponse } from 'next/server';
import { STORES } from '@/lib/stores';
import { scrapeSinglePage } from '@/lib/scrape-engine';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid body', products: [], nextPageUrl: null });

    const { storeId, apiKey, pageUrl, pageNum } = body;

    if (!apiKey) return NextResponse.json({ error: 'Thiếu API key', products: [], nextPageUrl: null });

    const store = STORES.find(s => s.id === storeId);
    if (!store) return NextResponse.json({ error: 'Store không tồn tại', products: [], nextPageUrl: null });

    const url = pageUrl || store.url;
    const page = pageNum || 1;

    const result = await Promise.race([
      scrapeSinglePage(url, apiKey, store.name, store.id, store.color, page),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Timeout 55s')), 55000)),
    ]);

    return NextResponse.json({
      products: result.products,
      nextPageUrl: result.nextPageUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Lỗi server', products: [], nextPageUrl: null });
  }
}
