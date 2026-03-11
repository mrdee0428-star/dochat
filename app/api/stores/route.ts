import { NextResponse } from 'next/server';
import { STORES } from '@/lib/stores';

export async function GET() {
  return NextResponse.json({ stores: STORES });
}
