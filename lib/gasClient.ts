// lib/gasClient.ts
interface GasResponse<T = any> {
  ok: boolean;
  error?: string;
  pair?: T;
  messages?: T[];
  message?: T;
  juniors?: T[];
  reveal_at?: string;
  parsed?: any;
  mentors?: T[];
  profile?: T;
  clues?: T[];
  clue?: T;
  junior?: T;
}

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

export async function verifyStudentId(studentId: string) {
  return callApi({ action: 'verifyStudentId', student_id: studentId });
}

export async function getPairByKey(pairKey: string) {
  return callApi({ action: 'getPairByKey', pair_key: pairKey });
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
export async function getMentors() {
  return callApi({ action: 'getMentors' });
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
export async function addClue(authorId: string, content: string) {
  return callApi({
    action: 'addClue',
    author_id: authorId,
    content: content,
  });
}

export async function getClues() {
  return callApi({ action: 'getClues' });
}

export async function getMyClues(studentId: string) {
  return callApi({
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

// ============ Chat Functions ============
export async function getChatMessages(studentId: string, pairKey: string) {
  return callApi({
    action: 'getChatMessages',
    student_id: studentId,
    pair_key: pairKey,
  });
}

export async function sendChatMessage(fromId: string, pairKey: string, content: string) {
  return callApi({
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

// ============ Update Session ============
export async function updateSession(studentId: string, session: any) {
  return callApi({
    action: 'updateSession',
    student_id: studentId,
    session: session,
  });
}
export async function getMyPair(studentId: string) {
  return callApi({
    action: 'getMyPair',
    student_id: studentId,
  });
}
