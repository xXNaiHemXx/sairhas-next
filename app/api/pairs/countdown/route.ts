import { NextRequest, NextResponse } from 'next/server';
import { pb } from '@/lib/pocketbase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pairKey = searchParams.get('pairKey');
    if (!pairKey) {
      return NextResponse.json({ ok: false, error: 'Missing pairKey' }, { status: 400 });
    }
    const result = await pb.collection('pairs').getList(1, 1, {
      filter: `pairKey = "${pairKey}"`,
    });
    const pair = result.items[0];
    if (!pair) {
      return NextResponse.json({ ok: false, error: 'Pair not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, reveal_at: pair.revealAt });
  } catch (error) {
    console.error('❌ [API] Countdown error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to load countdown' }, { status: 500 });
  }
}