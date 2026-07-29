interface GasResponse<T = any> {
  ok: boolean;
  error?: string;
  pair?: Pair;  // GAS returns Pair object directly
  messages?: T;  // T is already array type when callApi<Type[]>
  message?: T;
  juniors?: T;  // T is already array type when callApi<Type[]>
  reveal_at?: string;
  parsed?: any;
  mentors?: T;  // T is already array type when callApi<Type[]>
  profile?: T;
  clues?: T;
  clue?: T;
  junior?: T;
}

// 🔥 เปลี่ยนไปใช้ API Route ใหม่ (/api/gas)
const API_URL = '/api/gas';

async function callApi<T>(payload: Record<string, any>): Promise<GasResponse<T>> {
  try {
    console.log('📤 callApi:', payload);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('📥 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API error:', errorText);
      return { 
        ok: false, 
        error: `เกิดข้อผิดพลาด (${response.status})` 
      };
    }

    const data = await response.json();
    console.log('📄 Response data:', data);
    return data;
  } catch (error: any) {
    console.error('❌ callApi failed:', error.message);
    return { 
      ok: false, 
      error: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' 
    };
  }
}

// ============ API Functions ============

export interface VerifyStudentIdResponse {
  ok: boolean;
  error?: string;
  pair?: Pair;
  parsed?: {
    role: 'Y1' | 'Y2';
    pairKey: string;
  };
}

export async function verifyStudentId(studentId: string) {
  return callApi<VerifyStudentIdResponse>({ action: 'verifyStudentId', student_id: studentId });
}

// ============ Pair Types ============
export interface Pair {
  y1_id: string;
  y2_id: string;
  pair_key: string;
  reveal_at: string;
}

export async function getPairByKey(pairKey: string) {
  return callApi<Pair>({ action: 'getPairByKey', pair_key: pairKey });
}

export async function getAvailableJuniors() {
  return callApi({ action: 'getAvailableJuniors' });
}

export async function pickJunior(y2Id: string, y1Id: string) {
  return callApi({
    action: 'pickJunior',
    y2_id: y2Id,
    y1_id: y1Id,
  });
}

export async function sendMessage(
  pairKey: string,
  fromId: string,
  content: string,
  type: string = 'custom'
) {
  console.log('📤 sendMessage:', { pairKey, fromId, content, type });
  return callApi({
    action: 'sendMessage',
    pair_key: pairKey,
    from_id: fromId,
    content,
    type,
  });
}

export async function getThread(pairKey: string) {
  return callApi({ action: 'getThread', pair_key: pairKey });
}

export async function getCountdown(pairKey: string) {
  return callApi({ action: 'getCountdown', pair_key: pairKey });
}

export async function checkNetwork() {
  return callApi({ action: 'checkNetwork' });
}

// ============ Mentor Functions ============
export interface Mentor {
  id: string;
  name: string;
  ig: string;
  line: string;
  faculty: string;
  year: string;
  imageUrl?: string;
  pairKey?: string;
}

export async function getMentors() {
  return callApi<Mentor[]>({ action: 'getMentors' });
}

// ============ Profile Functions ============
export async function getProfile(studentId: string) {
  return callApi({ 
    action: 'getProfile', 
    student_id: studentId 
  });
}

export async function updateProfile(studentId: string, profile: any) {
  return callApi({
    action: 'updateProfile',
    student_id: studentId,
    profile: profile,
  });
}

// ============ Board (Clues) Functions ============
// ✅ มีแค่ครั้งเดียว!
export async function addClue(authorId: string, content: string) {
  return callApi<Clue>({
    action: 'addClue',
    author_id: authorId,
    content: content,
  });
}

export async function getMyClues(studentId: string) {
  return callApi<Clue[]>({
    action: 'getMyClues',
    student_id: studentId,
  });
}

export async function deleteClue(clueId: string, authorId: string) {
  return callApi({
    action: 'deleteClue',
    clue_id: clueId,
    author_id: authorId,
  });
}

// Clue type for TypeScript
export interface Clue {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  position: {
    top: number;
    left: number;
  };
  color: string;
  rotation: number;
}



// ============ Chat Functions ============
export interface Message {
  id: string;
  from_id: string;
  content: string;
  sent_at: string;
}

export async function getChatMessages(studentId: string, pairKey: string) {
  return callApi<Message[]>({
    action: 'getChatMessages',
    student_id: studentId,
    pair_key: pairKey,
  });
}

export async function sendChatMessage(fromId: string, pairKey: string, content: string) {
  return callApi<Message>({
    action: 'sendChatMessage',
    from_id: fromId,
    pair_key: pairKey,
    content: content,
  });
}




// ============ Get My Junior ============
export async function getMyJunior(y2Id: string) {
  return callApi({
    action: 'getMyJunior',
    y2_id: y2Id,
  });
}