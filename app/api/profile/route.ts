import { NextRequest, NextResponse } from 'next/server';
import { pb } from '@/lib/pocketbase';
import { getSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    if (!studentId) {
      return NextResponse.json({ ok: false, error: 'Missing studentId' }, { status: 400 });
    }
    const result = await pb.collection('users').getList(1, 1, {
      filter: `studentId = "${studentId}"`,
    });
    const user = result.items[0];
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      profile: {
        nickname: user.nickname || '',
        faculty: user.faculty || 'APE/TME',
        ig: user.ig || '',
        line: user.line || '',
        imageUrl: user.imageUrl || '',
      },
    });
  } catch (error) {
    console.error('❌ [API] Profile GET error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to load profile' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { studentId, profile } = body;
    if (!studentId || !profile) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 });
    }
    const result = await pb.collection('users').getList(1, 1, {
      filter: `studentId = "${studentId}"`,
    });
    const user = result.items[0];
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }
    const updated = await pb.collection('users').update(user.id, {
      nickname: profile.nickname || '',
      faculty: profile.faculty || 'APE/TME',
      ig: profile.ig || '',
      line: profile.line || '',
      imageUrl: profile.imageUrl || '',
    });
    return NextResponse.json({
      ok: true,
      profile: {
        nickname: updated.nickname || '',
        faculty: updated.faculty || 'APE/TME',
        ig: updated.ig || '',
        line: updated.line || '',
        imageUrl: updated.imageUrl || '',
      },
    });
  } catch (error: any) {
    console.error('❌ [API] Profile PUT error:', error?.message || error);
    return NextResponse.json({ ok: false, error: 'Failed to update profile' }, { status: 500 });
  }
}