import { NextRequest, NextResponse } from 'next/server';
import { pb } from '@/lib/pocketbase';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'Y2') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 });
    }
    const result = await pb.collection('users').getFullList({
      filter: `role = "Y1"`,
      sort: 'studentId',
    });
    return NextResponse.json({ ok: true, juniors: result });
  } catch (error) {
    console.error('❌ [API] Available Juniors error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to load juniors' }, { status: 500 });
  }
}