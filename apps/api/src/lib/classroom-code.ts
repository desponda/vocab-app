import { prisma } from './prisma';

/**
 * Generates a unique 6-character classroom code
 * Format: ABC123 (3 uppercase letters + 3 digits)
 *
 * Note: Excludes I, O (letters) and 0, 1 (digits) to avoid confusion
 */
export async function generateClassroomCode(): Promise<string> {
  const maxAttempts = 10;

  for (let i = 0; i < maxAttempts; i++) {
    const code = generateRandomCode();

    // Check if code already exists
    const existing = await prisma.classroom.findUnique({
      where: { code },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error('Failed to generate unique classroom code after 10 attempts');
}

/**
 * Generates a random 6-character code
 * Format: 3 letters + 3 digits
 */
export function generateRandomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude I, O
  const digits = '23456789'; // Exclude 0, 1

  let code = '';

  // 3 random letters
  for (let i = 0; i < 3; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  // 3 random digits
  for (let i = 0; i < 3; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }

  return code;
}
