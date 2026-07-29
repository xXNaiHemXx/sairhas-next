import { NextRequest, NextResponse } from 'next/server';
import { pb } from '@/lib/pocketbase';

export async function GET(request: NextRequest) {
  try {
    // Query users with role Y2 (mentors) instead of mentors collection
    const result = await pb.collection('users').getFullList({
      filter: 'role = "Y2"',
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