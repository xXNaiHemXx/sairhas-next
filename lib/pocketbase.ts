// lib/pocketbase.ts
import PocketBase from 'pocketbase';

// ✅ ใช้ URL ที่ถูกต้อง
const PB_URL = process.env.NEXT_PUBLIC_PB_URL || 'http://127.0.0.1:8090';

console.log('🔍 [PocketBase] Connecting to:', PB_URL);

export const pb = new PocketBase(PB_URL);

// ✅ Auth Helpers
export async function loginWithStudentId(studentId: string) {
  console.log('🔍 [PB] loginWithStudentId called with:', studentId);
  
  try {
    // หาผู้ใช้ที่มี studentId นี้
    const result = await pb.collection('users').getList(1, 1, {
      filter: `studentId = "${studentId}"`,
    });
    
    console.log('🔍 [PB] User search result:', result.items.length);

    if (result.items.length === 0) {
      // ถ้าไม่มี ให้สร้างใหม่
      const role = studentId.startsWith('68') ? 'Y2' : 'Y1';
      const pairKey = studentId.slice(-3);

      console.log('🔍 [PB] Creating new user:', { studentId, role, pairKey });

      const newUser = await pb.collection('users').create({
        studentId,
        role,
        pairKey,
        nickname: studentId,
      });

      console.log('✅ [PB] User created:', newUser.id);

      // ✅ สร้าง token ให้ user
      const authData = await pb.collection('users').authWithPassword(
        newUser.id,
        studentId
      );

      return { ok: true, user: newUser, token: authData.token };
    }

    const user = result.items[0];
    console.log('✅ [PB] User found:', user.id);

    // ✅ Login
    const authData = await pb.collection('users').authWithPassword(
      user.id,
      studentId
    );

    return { ok: true, user, token: authData.token };
    
  } catch (error: any) {
    console.error('❌ [PB] Login error:', error.message);
    console.error('❌ [PB] Error details:', error);
    return { ok: false, error: error.message };
  }
}