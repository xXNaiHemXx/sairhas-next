import { NextRequest, NextResponse } from 'next/server';
import { pb } from '@/lib/pocketbase';
import { getSession } from '@/lib/session';

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
    const pair = result.items[0] || null;
    return NextResponse.json({ ok: true, pair });
  } catch (error) {
    console.error('❌ [API] Pairs GET error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to load pair' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { y2Id, y1Id } = body;
    if (!y2Id || !y1Id) {
      return NextResponse.json({ ok: false, error: 'Missing y2Id or y1Id' }, { status: 400 });
    }
    const session = await getSession();
    if (!session || session.role !== 'Y2') {
      return NextResponse.json({ ok: false, error: 'Only Y2 can pick' }, { status: 403 });
    }
    const pairKey = y2Id.slice(-3);
    const existing = await pb.collection('pairs').getFullList({
      filter: `pairKey = "${pairKey}"`,
    });
    if (existing.length > 0) {
      await pb.collection('pairs').update(existing[0].id, {
        y2Id,
        y1Id,
        status: 'matched',
        pickedAt: new Date().toISOString(),
      });
    } else {
      await pb.collection('pairs').create({
        pairKey,
        y2Id,
        y1Id,
        status: 'matched',
        pickedAt: new Date().toISOString(),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('❌ [API] Pick error:', error?.message || error);
    return NextResponse.json({ ok: false, error: 'Failed to pick junior' }, { status: 500 });
  }
}