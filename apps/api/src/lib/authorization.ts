import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * CRITICAL AUTHORIZATION HELPER
 *
 * Checks if a user can access student data.
 *
 * IMPORTANT: Never compare Student.id with User.id directly!
 * - Student.id = Primary key in Student table
 * - User.id = Primary key in User table
 * - These are DIFFERENT values from DIFFERENT tables
 *
 * Correct Access Patterns:
 * 1. Student viewing own data: Student.userId === request.userId
 * 2. Teacher viewing student in their classroom: Check enrollments
 *
 * @param studentId - The Student.id (NOT User.id!)
 * @param requestUserId - The authenticated User.id
 * @returns true if user can access this student's data, false otherwise
 *
 * @example
 * // In a route handler:
 * const canAccess = await canAccessStudentData(studentId, request.userId);
 * if (!canAccess) {
 *   return reply.code(403).send({ error: 'Unauthorized' });
 * }
 */
export async function canAccessStudentData(
  studentId: string,
  requestUserId: string
): Promise<boolean> {
  // Check if user owns this student record (student viewing own data)
  const studentOwnership = await prisma.student.findFirst({
    where: {
      id: studentId,
      userId: requestUserId,
    },
  });

  if (studentOwnership) {
    return true;
  }

  // Check if user is a teacher with this student in their classroom
  const teacherAccess = await prisma.student.findFirst({
    where: {
      id: studentId,
      enrollments: {
        some: {
          classroom: {
            teacherId: requestUserId,
          },
        },
      },
    },
  });

  return !!teacherAccess;
}

/**
 * Verifies a student owns their own data
 *
 * @param studentId - The Student.id
 * @param requestUserId - The authenticated User.id
 * @returns true if Student.userId === requestUserId
 */
export async function isStudentOwner(
  studentId: string,
  requestUserId: string
): Promise<boolean> {
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      userId: requestUserId,
    },
  });

  return !!student;
}

/**
 * Verifies a teacher has access to a student via classroom enrollment
 *
 * @param studentId - The Student.id
 * @param teacherUserId - The teacher's User.id
 * @returns true if student is in teacher's classroom
 */
export async function isTeacherOfStudent(
  studentId: string,
  teacherUserId: string
): Promise<boolean> {
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      enrollments: {
        some: {
          classroom: {
            teacherId: teacherUserId,
          },
        },
      },
    },
  });

  return !!student;
}
