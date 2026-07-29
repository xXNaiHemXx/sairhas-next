// app/api/pairs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pb } from '@/lib/pocketbase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pairKey = searchParams.get('pairKey');
    
    if (!pairKey) {
      return NextResponse.json(
        { ok: false, error: 'Missing pairKey' },
        { status: 400 }
      );
    }
    
    const result = await pb.collection('pairs').getList(1, 1, {
      filter: `pairKey = "${pairKey}"`,
    });
    
    const pair = result.items[0] || null;
    
    return NextResponse.json({ ok: true, pair });
  } catch (error) {
    console.error('❌ [API] Pairs error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load pair' },
      { status: 500 }
    );
  }
}