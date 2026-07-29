// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pb } from '@/lib/pocketbase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const user = await pb.collection('users').getOne(id);
    
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        studentId: user.studentId,
        nickname: user.nickname,
        role: user.role,
        pairKey: user.pairKey,
        faculty: user.faculty,
        ig: user.ig,
        line: user.line,
        imageUrl: user.imageUrl,
      }
    });
  } catch (error) {
    console.error('❌ [API] User error:', error);
    return NextResponse.json(
      { ok: false, error: 'User not found' },
      { status: 404 }
    );
  }
}