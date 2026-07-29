import { NextRequest, NextResponse } from 'next/server';
import { pb } from '@/lib/pocketbase';
import { getSessionFromRequest } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    if (!studentId) {
      return NextResponse.json({ ok: false, error: 'Missing studentId' }, { status: 400 });
    }
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }
    const result = await pb.collection('clues').getFullList({
      filter: `authorId = "${studentId}"`,
      sort: '-created',
    });
    return NextResponse.json({ ok: true, clues: result.map(c => ({ ...c, position: { top: c.top, left: c.left } })) });
  } catch (error) {
    console.error('❌ [API] Clues GET error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to load clues' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { authorId, content } = body;
    if (!authorId || !content) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 });
    }
    const clue = await pb.collection('clues').create({
      authorId,
      content,
      createdAt: new Date().toISOString(),
      top: Math.floor(Math.random() * 80) + 10,
      left: Math.floor(Math.random() * 80) + 10,
      color: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E8BAFF'][Math.floor(Math.random() * 6)],
      rotation: Math.floor(Math.random() * 20) - 10,
    });
    return NextResponse.json({ 
      ok: true, 
      clue: {
        ...clue,
        position: { top: clue.top, left: clue.left }
      }
    });
  } catch (error) {
    console.error('❌ [API] Clues POST error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to add clue' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { clueId, authorId } = body;
    if (!clueId || !authorId) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 });
    }
    await pb.collection('clues').delete(clueId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ [API] Clues DELETE error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to delete clue' }, { status: 500 });
  }
}