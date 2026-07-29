import { NextRequest, NextResponse } from 'next/server';
import { pb } from '@/lib/pocketbase';

export async function GET(request: NextRequest) {
  try {
    const result = await pb.collection('mentors').getFullList({
      sort: '-created',
    });
    return NextResponse.json({ ok: true, mentors: result });
  } catch (error) {
    console.error('❌ [API] Mentors error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load mentors' },
      { status: 500 }
    );
  }
}