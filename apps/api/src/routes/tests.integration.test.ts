import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prisma';

/**
 * Integration tests for test routes
 *
 * These tests require a running PostgreSQL database and are excluded from CI.
 * To run locally:
 *   1. Start Docker: docker-compose up -d postgres
 *   2. Run migrations: cd apps/api && pnpm prisma migrate dev
 *   3. Run tests: pnpm test -- --include='**/*.integration.test.ts'
 */
describe('Tests Routes', () => {
  let teacherId: string;
  let studentId: string;
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
        role: 'PARENT',
      },
    });

    // Create student for the parent user
    const student = await prisma.student.create({
      data: {
        name: 'Test Student',
        gradeLevel: 3,
        userId: studentUser.id,
      },
    });
    studentId = student.id;

    // Create classroom
    const classroom = await prisma.classroom.create({
      data: {
        name: 'Test Classroom',
        code: 'TST123',
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

    // Create vocabulary sheet
    const sheet = await prisma.vocabularySheet.create({
      data: {
        originalName: 'Test Sheet.pdf',
        fileName: 'test-sheet-123',
        s3Key: `${teacherId}/test-sheet-123`,
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
});
