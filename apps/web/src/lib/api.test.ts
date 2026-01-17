import { describe, it, expect } from 'vitest';
import { UserSchema, StudentSchema } from './api';

describe('API Types', () => {
  it('validates user schema', () => {
    const validUser = {
      id: 'test-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'PARENT' as const,
      createdAt: new Date().toISOString(),
    };

    const result = UserSchema.safeParse(validUser);
    expect(result.success).toBe(true);
  });

  it('validates student schema', () => {
    const validStudent = {
      id: 'test-id',
      name: 'Test Student',
      gradeLevel: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = StudentSchema.safeParse(validStudent);
    expect(result.success).toBe(true);
  });
});
