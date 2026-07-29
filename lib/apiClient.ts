// lib/apiClient.ts
interface ApiResponse<T = any> {
  ok: boolean;
  error?: string;
  data?: T;
  messages?: T[];
  message?: T;
  user?: any;
  pair?: any;
  profile?: any;
  mentors?: any[];
  clues?: any[];
  clue?: any;
  juniors?: any[];
  partner?: any;
}
const API_URL = '/api';

async function callApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    console.log(`📤 Calling API: ${endpoint}`, options.body);
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // ✅ อ่านเป็น text ก่อน
    const text = await response.text();
    console.log(`📥 Response from ${endpoint}:`, text.substring(0, 200));
    
    // ✅ ถ้าไม่ใช่ JSON ให้ return error
    if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
      console.error('❌ Invalid JSON response:', text.substring(0, 100));
      return { ok: false, error: 'เซิร์ฟเวอร์ตอบกลับมาในรูปแบบที่ไม่ถูกต้อง' };
    }
    
    const data = JSON.parse(text);
    return data;
  } catch (error: any) {
    console.error(`❌ API call failed: ${endpoint}`, error.message);
    return { ok: false, error: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' };
  }
}

// ============ Auth ============
export async function login(studentId: string) {
  console.log('📤 [login] Calling /auth with:', studentId);
  return callApi('/auth', {
    method: 'POST',
    body: JSON.stringify({ studentId }),
  });
}

// ============ Mentors ============
export async function getMentors() {
  return callApi('/mentors');
}

// ============ Profile ============
export async function getProfile(studentId: string) {
  return callApi(`/profile?studentId=${studentId}`);
}

export async function updateProfile(studentId: string, profile: any) {
  return callApi('/profile', {
    method: 'PUT',
    body: JSON.stringify({ studentId, profile }),
  });
}

// ============ Chat ============
export async function getChatMessages(pairKey: string) {
  return callApi(`/chat?pairKey=${pairKey}`);
}

export async function sendChatMessage(fromId: string, pairKey: string, content: string) {
  return callApi('/chat', {
    method: 'POST',
    body: JSON.stringify({ fromId, pairKey, content }),
  });
}

// ============ Clues ============
export async function getMyClues(studentId: string) {
  return callApi(`/clues?studentId=${studentId}`);
}

export async function addClue(authorId: string, content: string) {
  return callApi('/clues', {
    method: 'POST',
    body: JSON.stringify({ authorId, content }),
  });
}

export async function deleteClue(clueId: string, authorId: string) {
  return callApi('/clues', {
    method: 'DELETE',
    body: JSON.stringify({ clueId, authorId }),
  });
}

// ============ Pair Key ============
export async function getPairByKey(pairKey: string) {
  return callApi(`/pairs?pairKey=${pairKey}`);
}

// ============ Thread ============
export async function getThread(pairKey: string) {
  return callApi(`/chat?pairKey=${pairKey}`);
}

// ============ Pick Junior ============
export async function pickJunior(y2Id: string, y1Id: string) {
  return callApi('/pairs/pick', {
    method: 'POST',
    body: JSON.stringify({ y2Id, y1Id }),
  });
}

// ============ Available Juniors ============
export async function getAvailableJuniors(): Promise<ApiResponse<{ juniors: any[] }>> {
  return callApi('/pairs/available');
}

// ============ Countdown ============
export async function getCountdown(pairKey: string): Promise<{ ok: boolean; error?: string; reveal_at?: string }> {
  return callApi(`/pairs/countdown?pairKey=${pairKey}`);
}

// ============ Send Message ============
export async function sendMessage(pairKey: string, fromId: string, content: string, type: string) {
  return callApi('/chat', {
    method: 'POST',
    body: JSON.stringify({ fromId, pairKey, content, type }),
  });
}