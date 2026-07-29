// lib/studentId.ts
// Single source of truth for student ID parsing logic

export interface ParsedStudentId {
  year: string;
  core: string;
  suffix: string;
  pairKey: string;
  role: 'Y1' | 'Y2' | null;
  full: string;
  variable?: string; // for 13-digit IDs
}

/**
 * Parse APE/TME student ID (11 or 13 digits)
 * 11-digit: YY + 6 core + 3 suffix (pairKey)
 * 13-digit: YY + 6 core + 2 variable + 3 suffix (pairKey)
 * 
 * Year 68 = Y2 (Senior/พี่), Year 69 = Y1 (Junior/น้อง)
 */
export function parseStudentId(id: string): ParsedStudentId | null {
  const s = String(id ?? '').trim().replace(/\D/g, '');
  
  if (s.length === 11) {
    const year = s.slice(0, 2);
    const core = s.slice(2, 8);
    const suffix = s.slice(8, 11);
    
    return {
      year,
      core,
      suffix,
      pairKey: suffix,
      role: year === '68' ? 'Y2' : year === '69' ? 'Y1' : null,
      full: s,
    };
  }
  
  if (s.length === 13) {
    const year = s.slice(0, 2);
    const core = s.slice(2, 8);
    const variable = s.slice(8, 10);
    const suffix = s.slice(10, 13);
    
    return {
      year,
      core,
      suffix,
      pairKey: suffix,
      variable,
      role: year === '68' ? 'Y2' : year === '69' ? 'Y1' : null,
      full: s,
    };
  }
  
  return null;
}

/**
 * Check if a student ID is valid (11 or 13 digits, starts with 68 or 69)
 */
export function isValidStudentId(id: string): boolean {
  const parsed = parseStudentId(id);
  return parsed !== null && parsed.role !== null;
}

/**
 * Get pair key from student ID (last 3 digits = suffix)
 */
export function getPairKey(id: string): string | null {
  const parsed = parseStudentId(id);
  return parsed?.pairKey ?? null;
}

/**
 * Get role from student ID (Y1 or Y2)
 */
export function getRole(id: string): 'Y1' | 'Y2' | null {
  const parsed = parseStudentId(id);
  return parsed?.role ?? null;
}

/**
 * Check if two student IDs belong to the same pair
 */
export function isSamePair(id1: string, id2: string): boolean {
  const p1 = parseStudentId(id1);
  const p2 = parseStudentId(id2);
  return p1 !== null && p2 !== null && p1.pairKey === p2.pairKey;
}