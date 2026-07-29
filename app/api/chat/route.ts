// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pb } from '@/lib/pocketbase';

// GET messages
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
    
    const result = await pb.collection('messages').getList(1, 100, {
      filter: `pairKey = "${pairKey}"`,
      sort: 'sentAt',
    });
    
    return NextResponse.json({
      ok: true,
      messages: result.items.map((m: any) => ({
        id: m.id,
        from_id: m.fromId,
        content: m.content,
        sent_at: m.sentAt,
      })),
    });
    
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load messages' },
      { status: 500 }
    );
  }
}

// POST message
export async function POST(request: NextRequest) {
  try {
    const { fromId, pairKey, content } = await request.json();
    
    if (!fromId || !pairKey || !content) {
      return NextResponse.json(
        { ok: false, error: 'Missing fields' },
        { status: 400 }
      );
    }
    
    const message = await pb.collection('messages').create({
      pairKey,
      fromId,
      content,
      type: 'chat',
      sentAt: new Date().toISOString(),
    });
    
    return NextResponse.json({
      ok: true,
      message: {
        id: message.id,
        from_id: message.fromId,
        content: message.content,
        sent_at: message.sentAt,
      },
    });
    
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}