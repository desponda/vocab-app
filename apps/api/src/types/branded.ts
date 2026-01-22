/**
 * Branded Types for ID Disambiguation
 *
 * Problem: Student.id and User.id are both strings, making it easy to
 * accidentally compare them or use the wrong one.
 *
 * Solution: Branded types create compile-time distinctions between IDs.
 *
 * Usage:
 *   const userId: UserId = 'user_123' as UserId;
 *   const studentId: StudentId = 'student_456' as StudentId;
 *
 *   // This will cause a TypeScript error:
 *   if (userId === studentId) { ... }  // ❌ Type error!
 */

declare const __brand: unique symbol;

type Brand<T, TBrand extends string> = T & { [__brand]: TBrand };

/**
 * User.id - Primary key in User table (authentication record)
 */
export type UserId = Brand<string, 'UserId'>;

/**
 * Student.id - Primary key in Student table (student profile)
 */
export type StudentId = Brand<string, 'StudentId'>;

/**
 * Classroom.id - Primary key in Classroom table
 */
export type ClassroomId = Brand<string, 'ClassroomId'>;

/**
 * Test.id - Primary key in Test table
 */
export type TestId = Brand<string, 'TestId'>;

/**
 * VocabularySheet.id - Primary key in VocabularySheet table
 */
export type VocabularySheetId = Brand<string, 'VocabularySheetId'>;

// Type guards for runtime validation
export function isUserId(id: string): id is UserId {
  return typeof id === 'string' && id.length > 0;
}

export function isStudentId(id: string): id is StudentId {
  return typeof id === 'string' && id.length > 0;
}

// Helper to convert regular strings to branded types
// Use this when you know the string is the correct type
export function asUserId(id: string): UserId {
  return id as UserId;
}

export function asStudentId(id: string): StudentId {
  return id as StudentId;
}
