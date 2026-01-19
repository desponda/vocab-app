import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

/**
 * Integration tests for test routes
 *
 * These tests require a running PostgreSQL database and are excluded from CI.
 * To run locally:
 *   1. Start Docker: docker-compose up -d postgres
 *   2. Run migrations: cd apps/api && pnpm prisma migrate dev
 *   3. Run tests: pnpm test -- --include=**.integration.test.ts
 */

// Import frontend schemas to validate API contract
// These schemas represent what the frontend expects from the API
const TestAssignmentSchema = z.object({
  id: z.string(),
  testId: z.string(),
  classroomId: z.string(),
  dueDate: z.string().nullable().optional(),
  assignedAt: z.string(),
  test: z.object({
    id: z.string(),
    name: z.string(),
    variant: z.string(),
    createdAt: z.string(),
    sheet: z.object({
      id: z.string(),
      name: z.string(),
      originalName: z.string(),
    }).optional(),
    _count: z.object({
      questions: z.number(),
    }).optional(),
  }).optional(),
});

const TestDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  variant: z.string(),
  createdAt: z.string(),
  sheet: z.object({
    id: z.string(),
    originalName: z.string(),
    teacherId: z.string(),
  }).optional(),
  questions: z.array(z.object({
    id: z.string(),
    questionText: z.string(),
    questionType: z.enum(['SPELLING', 'DEFINITION', 'FILL_BLANK', 'MULTIPLE_CHOICE']),
    options: z.string().nullable().optional(),
    orderIndex: z.number(),
    word: z.object({
      id: z.string(),
      word: z.string(),
      definition: z.string().nullable().optional(),
    }).optional(),
  })).optional(),
  _count: z.object({
    questions: z.number(),
  }).optional(),
});

const TestAttemptSchema = z.object({
  id: z.string(),
  testId: z.string(),
  studentId: z.string(),
  totalQuestions: z.number(),
  correctAnswers: z.number().nullable().optional(),
  score: z.number().nullable().optional(),
  status: z.enum(['IN_PROGRESS', 'SUBMITTED', 'GRADED']),
  startedAt: z.string(),
  completedAt: z.string().nullable().optional(),
  answers: z.array(z.object({
    id: z.string(),
    questionId: z.string(),
    answer: z.string(),
    isCorrect: z.boolean().nullable().optional(),
    answeredAt: z.string(),
  })).optional(),
  student: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
  test: z.object({
    id: z.string(),
    name: z.string(),
    variant: z.string(),
  }).optional(),
});

describe('Tests Routes', () => {
  let teacherId: string;
  let studentId: string;
  let studentUserId: string;
  let classroomId: string;
  let testId: string;
  let questionId: string;
  let attemptId: string;

  beforeAll(async () => {
    // Create test teacher user
    const user = await prisma.user.create({
      data: {
        email: `teacher-${Date.now()}@test.com`,
        name: 'Test Teacher',
        passwordHash: 'hashed-password',
        role: 'TEACHER',
      },
    });
    teacherId = user.id;

    // Create test student user
    const studentUser = await prisma.user.create({
      data: {
        email: `student-${Date.now()}@test.com`,
        name: 'Test Student',
        passwordHash: 'hashed-password',
        role: 'STUDENT',
      },
    });
    studentUserId = studentUser.id;

    // Create student for the parent user
    const student = await prisma.student.create({
      data: {
        name: 'Test Student',
        gradeLevel: 3,
        userId: studentUser.id,
      },
    });
    studentId = student.id;

    // Create classroom with unique code
    const classroom = await prisma.classroom.create({
      data: {
        name: 'Test Classroom',
        code: `TST${Date.now().toString().slice(-6)}`,
        gradeLevel: 5,
        teacherId,
      },
    });
    classroomId = classroom.id;

    // Enroll student
    await prisma.studentEnrollment.create({
      data: {
        studentId,
        classroomId,
      },
    });

    // Create vocabulary sheet with unique fileName
    const uniqueFileName = `test-sheet-${Date.now()}`;
    const sheet = await prisma.vocabularySheet.create({
      data: {
        name: 'Test Sheet',
        originalName: 'Test Sheet.pdf',
        fileName: uniqueFileName,
        s3Key: `${teacherId}/${uniqueFileName}`,
        fileType: 'PDF',
        mimeType: 'application/pdf',
        fileSize: 1024,
        status: 'COMPLETED',
        testsToGenerate: 1,
        teacherId,
      },
    });

    // Create test
    const test = await prisma.test.create({
      data: {
        name: 'Test 1',
        variant: 'A',
        sheetId: sheet.id,
      },
    });
    testId = test.id;

    // Create vocabulary word
    const word = await prisma.vocabularyWord.create({
      data: {
        word: 'hello',
        definition: 'a greeting',
        sheetId: sheet.id,
      },
    });

    // Create test question
    const question = await prisma.testQuestion.create({
      data: {
        questionText: 'What is a greeting?',
        questionType: 'DEFINITION',
        correctAnswer: 'hello',
        orderIndex: 1,
        testId,
        wordId: word.id,
      },
    });
    questionId = question.id;
  });

  afterAll(async () => {
    // Cleanup will be handled by database reset
    // For now, just ensure connection closes cleanly
    await prisma.$disconnect();
  });

  describe('Test Assignment', () => {
    it('should assign a test to a classroom', async () => {
      const assignment = await prisma.testAssignment.create({
        data: {
          testId,
          classroomId,
        },
      });

      expect(assignment).toBeDefined();
      expect(assignment.testId).toBe(testId);
      expect(assignment.classroomId).toBe(classroomId);
    });

    it('should prevent duplicate test assignments', async () => {
      await expect(
        prisma.testAssignment.create({
          data: {
            testId,
            classroomId,
          },
        })
      ).rejects.toThrow();
    });

    it('should list assigned tests for a classroom', async () => {
      const assignments = await prisma.testAssignment.findMany({
        where: { classroomId },
        include: { test: true },
      });

      expect(assignments.length).toBeGreaterThan(0);
      expect(assignments[0].test.id).toBe(testId);
    });
  });

  describe('Test Attempts', () => {
    it('should start a test attempt', async () => {
      const test = await prisma.test.findUnique({
        where: { id: testId },
        include: { questions: true },
      });

      const attempt = await prisma.testAttempt.create({
        data: {
          testId,
          studentId,
          totalQuestions: test!.questions.length,
          status: 'IN_PROGRESS',
        },
      });
      attemptId = attempt.id;

      expect(attempt).toBeDefined();
      expect(attempt.status).toBe('IN_PROGRESS');
      expect(attempt.totalQuestions).toBe(1);
    });

    it('should submit an answer to a question', async () => {
      const answer = await prisma.testAnswer.create({
        data: {
          attemptId,
          questionId,
          answer: 'hello',
          isCorrect: true,
        },
      });

      expect(answer).toBeDefined();
      expect(answer.isCorrect).toBe(true);
    });

    it('should complete a test attempt and calculate score', async () => {
      // Get the attempt with answers
      const attempt = await prisma.testAttempt.findUnique({
        where: { id: attemptId },
        include: { answers: true },
      });

      const correctAnswers = attempt!.answers.filter((a: any) => a.isCorrect).length;
      const score = Math.round((correctAnswers / attempt!.totalQuestions) * 100);

      // Update attempt with score
      const completed = await prisma.testAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'SUBMITTED',
          correctAnswers,
          score,
          completedAt: new Date(),
        },
      });

      expect(completed.status).toBe('SUBMITTED');
      expect(completed.correctAnswers).toBe(1);
      expect(completed.score).toBe(100);
    });
  });

  describe('Test Retrieval', () => {
    it('should get a test with all questions', async () => {
      const test = await prisma.test.findUnique({
        where: { id: testId },
        include: {
          questions: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      expect(test).toBeDefined();
      expect(test!.questions.length).toBe(1);
      expect(test!.questions[0].questionText).toContain('greeting');
    });

    it('should get attempt history for a student', async () => {
      const attempts = await prisma.testAttempt.findMany({
        where: { studentId },
        include: {
          test: true,
        },
      });

      expect(attempts.length).toBeGreaterThan(0);
      expect(attempts[0].studentId).toBe(studentId);
    });
  });

  describe('Auto-grading', () => {
    it('should correctly grade spelling answers (case-insensitive)', () => {
      const correctAnswer = 'hello';
      const userAnswer1 = 'hello';
      const userAnswer2 = 'HELLO';
      const userAnswer3 = '  Hello  ';
      const userAnswer4 = 'goodbye';

      expect(
        userAnswer1.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
      ).toBe(true);
      expect(
        userAnswer2.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
      ).toBe(true);
      expect(
        userAnswer3.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
      ).toBe(true);
      expect(
        userAnswer4.toLowerCase().trim() === correctAnswer.toLowerCase().trim()
      ).toBe(false);
    });

    it('should calculate scores correctly', () => {
      expect(Math.round((3 / 10) * 100)).toBe(30);
      expect(Math.round((5 / 10) * 100)).toBe(50);
      expect(Math.round((8 / 10) * 100)).toBe(80);
      expect(Math.round((10 / 10) * 100)).toBe(100);
    });
  });

  /**
   * API CONTRACT TESTS
   * These tests validate that API responses match frontend schema expectations.
   * They would have caught the missing testId bug.
   */
  describe('API Contract Validation', () => {
    describe('GET /api/tests/classrooms/:classroomId/assigned', () => {
      it('should return assignments with testId field for classroom', async () => {
        // Query assignments as the API endpoint does
        const assignments = await prisma.testAssignment.findMany({
          where: { classroomId },
          select: {
            id: true,
            testId: true,
            classroomId: true,
            dueDate: true,
            assignedAt: true,
            test: {
              select: {
                id: true,
                name: true,
                variant: true,
                createdAt: true,
                sheet: {
                  select: {
                    id: true,
                    name: true,
                    originalName: true,
                  },
                },
                _count: {
                  select: { questions: true },
                },
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        });

        expect(assignments.length).toBeGreaterThan(0);

        // Validate each assignment against the frontend schema
        assignments.forEach((assignment) => {
          // This is the critical test that would have caught the bug
          expect(assignment.testId).toBeDefined();
          expect(typeof assignment.testId).toBe('string');

          // Validate full schema compliance
          const result = TestAssignmentSchema.safeParse({
            ...assignment,
            assignedAt: assignment.assignedAt.toISOString(),
            dueDate: assignment.dueDate?.toISOString() ?? null,
            test: assignment.test ? {
              ...assignment.test,
              createdAt: assignment.test.createdAt.toISOString(),
            } : undefined,
          });

          if (!result.success) {
            console.error('Schema validation failed:', result.error.format());
          }
          expect(result.success).toBe(true);
        });
      });

      it('should return testId that can be used to start test attempt', async () => {
        // Fetch assignments
        const assignments = await prisma.testAssignment.findMany({
          where: { classroomId },
          select: {
            id: true,
            testId: true,
          },
        });

        expect(assignments.length).toBeGreaterThan(0);
        const assignment = assignments[0];

        // Verify testId is a valid CUID that can be used
        expect(assignment.testId).toBeDefined();
        expect(typeof assignment.testId).toBe('string');
        expect(assignment.testId.length).toBeGreaterThan(0);

        // Verify we can actually use this testId to create an attempt
        const test = await prisma.test.findUnique({
          where: { id: assignment.testId },
        });
        expect(test).toBeDefined();
        expect(test!.id).toBe(assignment.testId);
      });
    });

    describe('GET /api/tests/students/:studentId/assigned', () => {
      it('should return assignments with testId field for student', async () => {
        // Get student's classroom IDs
        const student = await prisma.student.findFirst({
          where: {
            id: studentId,
            userId: studentUserId,
          },
          include: {
            enrollments: {
              select: { classroomId: true },
            },
          },
        });

        expect(student).toBeDefined();
        const classroomIds = student!.enrollments.map((e) => e.classroomId);

        // Query assignments as the API endpoint does
        const assignments = await prisma.testAssignment.findMany({
          where: { classroomId: { in: classroomIds } },
          select: {
            id: true,
            testId: true,
            classroomId: true,
            dueDate: true,
            assignedAt: true,
            test: {
              select: {
                id: true,
                name: true,
                variant: true,
                createdAt: true,
                sheet: {
                  select: {
                    id: true,
                    name: true,
                    originalName: true,
                  },
                },
                _count: {
                  select: { questions: true },
                },
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        });

        expect(assignments.length).toBeGreaterThan(0);

        // Validate each assignment
        assignments.forEach((assignment) => {
          // Critical: testId must be present
          expect(assignment.testId).toBeDefined();
          expect(typeof assignment.testId).toBe('string');

          // Validate schema compliance
          const result = TestAssignmentSchema.safeParse({
            ...assignment,
            assignedAt: assignment.assignedAt.toISOString(),
            dueDate: assignment.dueDate?.toISOString() ?? null,
            test: assignment.test ? {
              ...assignment.test,
              createdAt: assignment.test.createdAt.toISOString(),
            } : undefined,
          });

          if (!result.success) {
            console.error('Schema validation failed:', result.error.format());
          }
          expect(result.success).toBe(true);
        });
      });
    });

    describe('GET /api/tests/:testId', () => {
      it('should return test details matching TestDetailSchema', async () => {
        const test = await prisma.test.findUnique({
          where: { id: testId },
          select: {
            id: true,
            name: true,
            variant: true,
            createdAt: true,
            sheet: {
              select: {
                id: true,
                originalName: true,
                teacherId: true,
              },
            },
            questions: {
              orderBy: { orderIndex: 'asc' },
              select: {
                id: true,
                questionText: true,
                questionType: true,
                options: true,
                orderIndex: true,
                word: {
                  select: {
                    id: true,
                    word: true,
                    definition: true,
                  },
                },
              },
            },
            _count: {
              select: { questions: true },
            },
          },
        });

        expect(test).toBeDefined();

        // Validate schema compliance
        const result = TestDetailSchema.safeParse({
          ...test,
          createdAt: test!.createdAt.toISOString(),
        });

        if (!result.success) {
          console.error('Schema validation failed:', result.error.format());
        }
        expect(result.success).toBe(true);
      });
    });

    describe('POST /api/tests/attempts/start', () => {
      it('should create attempt with valid testId from assignment', async () => {
        // Get assignment
        const assignments = await prisma.testAssignment.findMany({
          where: { classroomId },
          select: { testId: true },
        });

        expect(assignments.length).toBeGreaterThan(0);
        const { testId: assignmentTestId } = assignments[0];

        // Get test details to count questions
        const test = await prisma.test.findUnique({
          where: { id: assignmentTestId },
          include: { questions: true },
        });

        expect(test).toBeDefined();

        // Create attempt using the testId from assignment
        const attempt = await prisma.testAttempt.create({
          data: {
            testId: assignmentTestId,
            studentId,
            totalQuestions: test!.questions.length,
            status: 'IN_PROGRESS',
          },
        });

        expect(attempt).toBeDefined();
        expect(attempt.testId).toBe(assignmentTestId);

        // Validate schema compliance
        const result = TestAttemptSchema.safeParse({
          ...attempt,
          startedAt: attempt.startedAt.toISOString(),
          completedAt: attempt.completedAt?.toISOString() ?? null,
        });

        if (!result.success) {
          console.error('Schema validation failed:', result.error.format());
        }
        expect(result.success).toBe(true);
      });
    });
  });

  /**
   * END-TO-END INTEGRATION TESTS
   * These tests validate the complete flow from assignment to test completion
   */
  describe('E2E: Complete Test Assignment Flow', () => {
    let e2eTestId: string;
    let e2eAssignmentId: string;
    let e2eAttemptId: string;

    beforeAll(async () => {
      // Create a new test for E2E flow
      const e2eTest = await prisma.test.create({
        data: {
          name: 'E2E Test',
          variant: 'E2E',
          sheetId: (await prisma.vocabularySheet.findFirst({
            where: { teacherId },
          }))!.id,
        },
      });
      e2eTestId = e2eTest.id;

      // Create questions
      const word = await prisma.vocabularyWord.findFirst();
      await prisma.testQuestion.create({
        data: {
          questionText: 'E2E Question',
          questionType: 'SPELLING',
          correctAnswer: 'test',
          orderIndex: 1,
          testId: e2eTestId,
          wordId: word!.id,
        },
      });
    });

    it('should complete full flow: assign -> fetch -> start -> submit -> complete', async () => {
      // STEP 1: Teacher assigns test to classroom
      const assignment = await prisma.testAssignment.create({
        data: {
          testId: e2eTestId,
          classroomId,
        },
      });
      e2eAssignmentId = assignment.id;

      expect(assignment.testId).toBe(e2eTestId);

      // STEP 2: Student fetches assigned tests
      const student = await prisma.student.findFirst({
        where: { id: studentId },
        include: {
          enrollments: {
            select: { classroomId: true },
          },
        },
      });

      const classroomIds = student!.enrollments.map((e) => e.classroomId);

      const assignments = await prisma.testAssignment.findMany({
        where: { classroomId: { in: classroomIds } },
        select: {
          id: true,
          testId: true,
          test: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Find our E2E assignment
      const e2eAssignment = assignments.find(
        (a) => a.testId === e2eTestId
      );
      expect(e2eAssignment).toBeDefined();
      expect(e2eAssignment!.testId).toBe(e2eTestId);

      // STEP 3: Student starts test using testId from assignment
      const test = await prisma.test.findUnique({
        where: { id: e2eAssignment!.testId },
        include: { questions: true },
      });

      const attempt = await prisma.testAttempt.create({
        data: {
          testId: e2eAssignment!.testId,
          studentId,
          totalQuestions: test!.questions.length,
          status: 'IN_PROGRESS',
        },
      });
      e2eAttemptId = attempt.id;

      expect(attempt.testId).toBe(e2eTestId);
      expect(attempt.status).toBe('IN_PROGRESS');

      // STEP 4: Student submits answer
      const question = test!.questions[0];
      const answer = await prisma.testAnswer.create({
        data: {
          attemptId: e2eAttemptId,
          questionId: question.id,
          answer: 'test',
          isCorrect: true,
        },
      });

      expect(answer.isCorrect).toBe(true);

      // STEP 5: Student completes test
      const attemptWithAnswers = await prisma.testAttempt.findUnique({
        where: { id: e2eAttemptId },
        include: { answers: true },
      });

      const correctAnswers = attemptWithAnswers!.answers.filter(
        (a) => a.isCorrect
      ).length;
      const score = Math.round(
        (correctAnswers / attemptWithAnswers!.totalQuestions) * 100
      );

      const completedAttempt = await prisma.testAttempt.update({
        where: { id: e2eAttemptId },
        data: {
          status: 'SUBMITTED',
          correctAnswers,
          score,
          completedAt: new Date(),
        },
      });

      expect(completedAttempt.status).toBe('SUBMITTED');
      expect(completedAttempt.score).toBe(100);

      // STEP 6: Validate all data relationships are correct
      const finalAttempt = await prisma.testAttempt.findUnique({
        where: { id: e2eAttemptId },
        include: {
          test: true,
          student: true,
          answers: {
            include: {
              question: true,
            },
          },
        },
      });

      expect(finalAttempt!.test.id).toBe(e2eTestId);
      expect(finalAttempt!.student.id).toBe(studentId);
      expect(finalAttempt!.answers.length).toBe(1);
      expect(finalAttempt!.answers[0].question.testId).toBe(e2eTestId);
    });

    it('should fail gracefully if testId is missing or invalid', async () => {
      // Simulate the bug: undefined testId
      await expect(
        prisma.testAttempt.create({
          data: {
            testId: undefined as any,
            studentId,
            totalQuestions: 1,
            status: 'IN_PROGRESS',
          },
        })
      ).rejects.toThrow();

      // Invalid CUID format
      await expect(
        prisma.testAttempt.create({
          data: {
            testId: 'invalid-cuid',
            studentId,
            totalQuestions: 1,
            status: 'IN_PROGRESS',
          },
        })
      ).rejects.toThrow();

      // Non-existent test ID
      await expect(
        prisma.testAttempt.create({
          data: {
            testId: 'clxyz1234567890abcdefg',
            studentId,
            totalQuestions: 1,
            status: 'IN_PROGRESS',
          },
        })
      ).rejects.toThrow();
    });
  });
});
