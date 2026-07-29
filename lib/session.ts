// lib/session.ts
// Session management with validation and expiry

import { pb } from './pocketbase';

export interface Session {
  studentId: string;
  role: 'Y1' | 'Y2';
  pairKey: string;
  createdAt: number;
  expiresAt: number;
}

const SESSION_KEY = 'sairhas_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export { SESSION_KEY, SESSION_DURATION_MS };

/**
 * Create a new session with expiry
 */
export function createSession(
  studentId: string,
  role: 'Y1' | 'Y2',
  pairKey: string
): Session {
  const now = Date.now();
  return {
    studentId,
    role,
    pairKey,
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  };
}

/**
 * Save session to localStorage
 */
export function saveSession(session: Session): void {
  // ✅ เก็บใน localStorage
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  // ✅ เก็บใน PocketBase ด้วย (ใช้ collection 'sessions')
  const sessionData = {
    studentId: session.studentId,
    role: session.role,
    pairKey: session.pairKey,
    createdAt: new Date(session.createdAt).toISOString(),
    expiresAt: new Date(session.expiresAt).toISOString(),
  };

  // ✅ บันทึกหรืออัปเดต session ใน PocketBase
  pb.collection('sessions')
    .getList(1, 1, {
      filter: `studentId = "${session.studentId}"`,
    })
    .then((result) => {
      if (result.items.length > 0) {
        // อัปเดต
        pb.collection('sessions').update(result.items[0].id, sessionData);
      } else {
        // สร้างใหม่
        pb.collection('sessions').create(sessionData);
      }
    })
    .catch((err) => {
      console.error('❌ Failed to save session to PocketBase:', err);
    });
}

/**
 * Get session from localStorage with validation (client-side only)
 */
export function getSession(): Session | null {
  // This function is client-side only (uses localStorage)
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored) as Session;

    // Validate session structure
    if (!session.studentId || !session.role || !session.pairKey) {
      clearSession();
      return null;
    }

    // Check expiry
    if (Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }

    return session;
  } catch {
    clearSession();
    return null;
  }
}

/**
 * Get session from request cookies (server-side)
 */
export async function getSessionFromRequest(request: Request): Promise<Session | null> {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`${SESSION_KEY}=([^;]+)`));
    if (!match) return null;

    const session = JSON.parse(decodeURIComponent(match[1])) as Session;

    // Validate session structure
    if (!session.studentId || !session.role || !session.pairKey) {
      return null;
    }

    // Check expiry
    if (Date.now() > session.expiresAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Clear session from localStorage
 */
export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}

/**
 * Check if session is valid (not expired)
 */
export function isSessionValid(session: Session | null): boolean {
  if (!session) return false;
  return Date.now() <= session.expiresAt;
}

/**
 * Get remaining session time in milliseconds
 */
export function getSessionTimeRemaining(session: Session | null): number {
  if (!session) return 0;
  const remaining = session.expiresAt - Date.now();
  return Math.max(0, remaining);
}

/**
 * Format session expiry for display
 */
export function formatSessionExpiry(session: Session | null): string {
  if (!session) return 'หมดอายุ';
  const remaining = getSessionTimeRemaining(session);
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}ชม ${minutes}นาที`;
  return `${minutes}นาที`;
}

/**
 * Extend session expiry (e.g., on user activity)
 */
export function extendSession(session: Session): Session {
  const now = Date.now();
  return {
    ...session,
    expiresAt: now + SESSION_DURATION_MS,
  };
}

/**
 * Save extended session
 */
export function saveExtendedSession(session: Session): void {
  const extended = extendSession(session);
  saveSession(extended);
}