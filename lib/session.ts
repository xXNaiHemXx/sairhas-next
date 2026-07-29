// lib/session.ts
// Session management with validation and expiry

import { ParsedStudentId } from './studentId';

export interface Session {
  studentId: string;
  role: 'Y1' | 'Y2';
  pairKey: string;
  createdAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
}

const SESSION_KEY = 'sairhas_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

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
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Get session from localStorage with validation
 */
export function getSession(): Session | null {
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
 * Clear session from localStorage
 */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
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