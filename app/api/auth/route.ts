// app/api/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pb } from '@/lib/pocketbase';

export async function POST(request: NextRequest) {
  console.log('📤 [API] Auth route called');
  
  try {
    const body = await request.json();
    console.log('📦 [API] Request body:', body);
    
    const { studentId } = body;
    
    if (!studentId) {
      return NextResponse.json(
        { ok: false, error: 'Missing studentId' },
        { status: 400 }
      );
    }
    
    // ✅ ตรวจสอบว่าผู้ใช้มีอยู่หรือไม่
    let user = null;
    try {
      const result = await pb.collection('users').getList(1, 1, {
        filter: `studentId = "${studentId}"`,
      });
      
      if (result.items.length > 0) {
        user = result.items[0];
        console.log('✅ [API] User found:', user.id);
      }
    } catch (error) {
      console.warn('⚠️ [API] User search error:', error);
    }
    
    // ✅ ถ้าไม่มีผู้ใช้ ให้สร้างใหม่
    if (!user) {
      const role = studentId.startsWith('68') ? 'Y2' : 'Y1';
      const pairKey = studentId.slice(-3);
      
      console.log('🔍 [API] Creating new user:', { studentId, role, pairKey });
      
      try {
        // ✅ สร้างผู้ใช้แบบมี Auth
        const createData: any = {
          studentId: studentId,
          role: role,
          pairKey: pairKey,
          nickname: studentId,
          username: studentId,
          email: `${studentId}@temp.com`,
          password: studentId,
          passwordConfirm: studentId,
        };
        
        console.log('📦 [API] Create data:', createData);
        
        user = await pb.collection('users').create(createData);
        
        console.log('✅ [API] User created with auth:', user.id);
      } catch (createError: any) {
        console.error('❌ [API] Create user error:', createError.message);
        console.error('❌ [API] Create error details:', JSON.stringify(createError));
        
        // ✅ ถ้าสร้างไม่สำเร็จ ให้ส่ง error กลับ
        return NextResponse.json(
          { ok: false, error: 'ไม่สามารถสร้างผู้ใช้: ' + createError.message },
          { status: 500 }
        );
      }
    }
    
    // ✅ หาคู่รหัส
    let pair = null;
    try {
      const pairResult = await pb.collection('pairs').getList(1, 1, {
        filter: `pairKey = "${user.pairKey}"`,
      });
      pair = pairResult.items[0] || null;
    } catch (error) {
      console.warn('⚠️ [API] No pair found for:', user.pairKey);
    }
    
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        studentId: user.studentId,
        role: user.role,
        pairKey: user.pairKey,
      },
      pair: pair ? {
        pairKey: pair.pairKey,
        y2Id: pair.y2Id,
        y1Id: pair.y1Id,
        status: pair.status,
        revealAt: pair.revealAt,
      } : null,
    });
    
  } catch (error: any) {
    console.error('❌ [API] Auth error:', error.message);
    console.error('❌ [API] Error details:', error);
    return NextResponse.json(
      { ok: false, error: 'Authentication failed: ' + error.message },
      { status: 500 }
    );
  }
}