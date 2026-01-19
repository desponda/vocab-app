import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';

// Schemas for validation
const assignTestSchema = z.object({
  classroomId: z.string().cuid(),
  dueDate: z.string().datetime().optional(),
});

const testIdSchema = z.object({
  testId: z.string().cuid(),
});

const classroomIdSchema = z.object({
  classroomId: z.string().cuid(),
});

const assignmentIdSchema = z.object({
  assignmentId: z.string().cuid(),
});

const startAttemptSchema = z.object({
  testId: z.string().cuid(),
  studentId: z.string().cuid(),
});

const submitAnswerSchema = z.object({
  questionId: z.string().cuid(),
  answer: z.string(),
});

const completeAttemptSchema = z.object({
  // No body required
});

const updateProgressSchema = z.object({
  currentQuestionIndex: z.number().int().min(0),
});

export const testRoutes = async (app: FastifyInstance) => {
  // All test routes require authentication
  app.addHook('onRequest', requireAuth);

  // List all tests for authenticated teacher
  app.get('/', async (request: FastifyRequest, reply) => {
    const tests = await prisma.test.findMany({
      where: {
        sheet: {
          teacherId: request.userId,
        },
      },
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
          select: {
            questions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reply.send({ tests });
  });

  // Assign test to classroom (teacher only)
  app.post('/:testId/assign', async (request: FastifyRequest, reply) => {
    const params = testIdSchema.parse(request.params);
    const body = assignTestSchema.parse(request.body);

    // Verify test exists and belongs to teacher's vocabulary sheet
    const test = await prisma.test.findUnique({
      where: { id: params.testId },
      include: {
        sheet: {
          select: { teacherId: true },
        },
      },
    });

    if (!test) {
      return reply.code(404).send({ error: 'Test not found' });
    }

    if (test.sheet.teacherId !== request.userId) {
      return reply.code(403).send({ error: 'Unauthorized' });
    }

    // Verify classroom belongs to teacher
    const classroom = await prisma.classroom.findFirst({
      where: {
        id: body.classroomId,
        teacherId: request.userId,
      },
    });

    if (!classroom) {
      return reply.code(404).send({ error: 'Classroom not found' });
    }

    // Check if already assigned
    const existing = await prisma.testAssignment.findUnique({
      where: {
        testId_classroomId: {
          testId: params.testId,
          classroomId: body.classroomId,
        },
      },
    });

    if (existing) {
      return reply.code(409).send({ error: 'Test already assigned to this classroom' });
    }

    // Create assignment
    const assignment = await prisma.testAssignment.create({
      data: {
        testId: params.testId,
        classroomId: body.classroomId,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
      },
      select: {
        id: true,
        testId: true,
        classroomId: true,
        dueDate: true,
        assignedAt: true,
      },
    });

    return reply.code(201).send({ assignment });
  });

  // Remove test assignment
  app.delete('/assignments/:assignmentId', async (request: FastifyRequest, reply) => {
    const params = assignmentIdSchema.parse(request.params);

    // Verify assignment exists and teacher owns the classroom
    const assignment = await prisma.testAssignment.findUnique({
      where: { id: params.assignmentId },
      include: {
        classroom: {
          select: { teacherId: true },
        },
      },
    });

    if (!assignment) {
      return reply.code(404).send({ error: 'Assignment not found' });
    }

    if (assignment.classroom.teacherId !== request.userId) {
      return reply.code(403).send({ error: 'Unauthorized' });
    }

    await prisma.testAssignment.delete({
      where: { id: params.assignmentId },
    });

    return reply.code(204).send();
  });

  // Get test with questions (student: for taking test, teacher: for viewing)
  app.get('/:testId', async (request: FastifyRequest, reply) => {
    const params = testIdSchema.parse(request.params);

    const test = await prisma.test.findUnique({
      where: { id: params.testId },
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
            teacherId: true,
          },
        },
        questions: {
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
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!test) {
      return reply.code(404).send({ error: 'Test not found' });
    }

    return reply.send({ test });
  });

  // Start test attempt (student)
  app.post('/attempts/start', async (request: FastifyRequest, reply) => {
    const body = startAttemptSchema.parse(request.body);

    // Verify student belongs to user
    const student = await prisma.student.findFirst({
      where: {
        id: body.studentId,
        userId: request.userId,
      },
      include: {
        enrollments: {
          select: { classroomId: true },
        },
      },
    });

    if (!student) {
      return reply.code(404).send({ error: 'Student not found' });
    }

    // Verify test is assigned to one of student's classrooms
    const studentClassroomIds = student.enrollments.map((e) => e.classroomId);

    const assignment = await prisma.testAssignment.findFirst({
      where: {
        testId: body.testId,
        classroomId: { in: studentClassroomIds },
      },
    });

    if (!assignment) {
      return reply.code(403).send({ error: 'Test not assigned to your classroom' });
    }

    // Check if attempt already in progress
    const existingAttempt = await prisma.testAttempt.findFirst({
      where: {
        testId: body.testId,
        studentId: body.studentId,
        status: 'IN_PROGRESS',
      },
      include: {
        answers: {
          select: {
            id: true,
            questionId: true,
            answer: true,
            isCorrect: true,
            answeredAt: true,
          },
        },
      },
    });

    if (existingAttempt) {
      // Return existing attempt for resume (instead of 409 error)
      return reply.send({
        attempt: existingAttempt,
        resumed: true, // Flag to indicate this is a resume
      });
    }

    // Get test to count questions
    const test = await prisma.test.findUnique({
      where: { id: body.testId },
      select: {
        _count: {
          select: { questions: true },
        },
      },
    });

    if (!test) {
      return reply.code(404).send({ error: 'Test not found' });
    }

    // Validate test has questions
    if (test._count.questions === 0) {
      return reply.code(400).send({ error: 'This test has no questions and cannot be started' });
    }

    // Create attempt
    const attempt = await prisma.testAttempt.create({
      data: {
        testId: body.testId,
        studentId: body.studentId,
        totalQuestions: test._count.questions,
        status: 'IN_PROGRESS',
      },
      select: {
        id: true,
        testId: true,
        studentId: true,
        totalQuestions: true,
        status: true,
        startedAt: true,
        currentQuestionIndex: true,
        lastActivityAt: true,
      },
    });

    return reply.code(201).send({ attempt });
  });

  // Get attempt details with answers so far
  app.get('/attempts/:attemptId', async (request: FastifyRequest, reply) => {
    const attemptId = (request.params as any).attemptId;

    if (!attemptId) {
      return reply.code(400).send({ error: 'Attempt ID required' });
    }

    // Verify student ownership from query param
    const studentId = (request.query as any).studentId;
    if (!studentId) {
      return reply.code(400).send({ error: 'Student ID required' });
    }

    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        testId: true,
        studentId: true,
        totalQuestions: true,
        correctAnswers: true,
        score: true,
        status: true,
        startedAt: true,
        completedAt: true,
        currentQuestionIndex: true,
        lastActivityAt: true,
        answers: {
          select: {
            id: true,
            questionId: true,
            answer: true,
            isCorrect: true,
            answeredAt: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
          },
        },
        test: {
          select: {
            id: true,
            name: true,
            variant: true,
          },
        },
      },
    });

    if (!attempt) {
      return reply.code(404).send({ error: 'Attempt not found' });
    }

    // Verify student ownership
    if (attempt.student.id !== (request.query as any).studentId) {
      return reply.code(403).send({ error: 'Unauthorized' });
    }

    return reply.send({ attempt });
  });

  // Submit answer to a question
  app.post('/attempts/:attemptId/answer', async (request: FastifyRequest, reply) => {
    const params = { attemptId: (request.params as any).attemptId };
    const body = submitAnswerSchema.parse(request.body);

    // Verify attempt exists and is in progress
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: params.attemptId },
      select: {
        id: true,
        status: true,
        studentId: true,
        testId: true,
      },
    });

    if (!attempt) {
      return reply.code(404).send({ error: 'Attempt not found' });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return reply.code(400).send({ error: 'Attempt not in progress' });
    }

    // Verify question belongs to the test
    const question = await prisma.testQuestion.findUnique({
      where: { id: body.questionId },
      select: {
        id: true,
        testId: true,
        correctAnswer: true,
      },
    });

    if (!question) {
      return reply.code(404).send({ error: 'Question not found' });
    }

    if (question.testId !== attempt.testId) {
      return reply.code(400).send({ error: 'Question does not belong to this test' });
    }

    // Check if answer already exists for this question
    const existingAnswer = await prisma.testAnswer.findUnique({
      where: {
        attemptId_questionId: {
          attemptId: params.attemptId,
          questionId: body.questionId,
        },
      },
    });

    if (existingAnswer) {
      // Update existing answer
      const isCorrect = body.answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
      const answer = await prisma.testAnswer.update({
        where: { id: existingAnswer.id },
        data: {
          answer: body.answer,
          isCorrect,
          answeredAt: new Date(),
        },
        select: {
          id: true,
          questionId: true,
          answer: true,
          isCorrect: true,
          answeredAt: true,
        },
      });

      return reply.send({ answer });
    }

    // Create new answer
    const isCorrect = body.answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();

    const answer = await prisma.testAnswer.create({
      data: {
        attemptId: params.attemptId,
        questionId: body.questionId,
        answer: body.answer,
        isCorrect,
      },
      select: {
        id: true,
        questionId: true,
        answer: true,
        isCorrect: true,
        answeredAt: true,
      },
    });

    // Update last activity timestamp
    await prisma.testAttempt.update({
      where: { id: params.attemptId },
      data: { lastActivityAt: new Date() },
    });

    return reply.code(201).send({ answer });
  });

  // Update test progress (current question index)
  app.put('/attempts/:attemptId/progress', async (request: FastifyRequest, reply) => {
    const params = { attemptId: (request.params as any).attemptId };
    const body = updateProgressSchema.parse(request.body);

    // Verify attempt exists and belongs to user's student
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: params.attemptId },
      select: {
        id: true,
        status: true,
        student: {
          select: { userId: true },
        },
      },
    });

    if (!attempt) {
      return reply.code(404).send({ error: 'Attempt not found' });
    }

    if (attempt.student.userId !== request.userId) {
      return reply.code(403).send({ error: 'Not authorized to update this attempt' });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return reply.code(400).send({ error: 'Attempt not in progress' });
    }

    // Update progress
    const updated = await prisma.testAttempt.update({
      where: { id: params.attemptId },
      data: {
        currentQuestionIndex: body.currentQuestionIndex,
        lastActivityAt: new Date(),
      },
      select: {
        id: true,
        currentQuestionIndex: true,
        lastActivityAt: true,
      },
    });

    return reply.send({ attempt: updated });
  });

  // Complete test attempt (calculate final score)
  app.post('/attempts/:attemptId/complete', async (request: FastifyRequest, reply) => {
    const params = { attemptId: (request.params as any).attemptId };

    // Get attempt with answers
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: params.attemptId },
      include: {
        answers: {
          select: { isCorrect: true },
        },
      },
    });

    if (!attempt) {
      return reply.code(404).send({ error: 'Attempt not found' });
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return reply.code(400).send({ error: 'Attempt not in progress' });
    }

    // Calculate score
    const correctAnswers = attempt.answers.filter((a) => a.isCorrect).length;
    const score = Math.round((correctAnswers / attempt.totalQuestions) * 100);

    // Update attempt
    const completed = await prisma.testAttempt.update({
      where: { id: params.attemptId },
      data: {
        status: 'SUBMITTED',
        correctAnswers,
        score,
        completedAt: new Date(),
      },
      select: {
        id: true,
        testId: true,
        studentId: true,
        totalQuestions: true,
        correctAnswers: true,
        score: true,
        status: true,
        startedAt: true,
        completedAt: true,
      },
    });

    return reply.send({ attempt: completed });
  });

  // List tests assigned to a classroom (teacher view)
  app.get('/classrooms/:classroomId/assigned', async (request: FastifyRequest, reply) => {
    const params = classroomIdSchema.parse(request.params);

    // Verify teacher owns classroom
    const classroom = await prisma.classroom.findFirst({
      where: {
        id: params.classroomId,
        teacherId: request.userId,
      },
    });

    if (!classroom) {
      return reply.code(404).send({ error: 'Classroom not found' });
    }

    // Get assigned tests
    const assignments = await prisma.testAssignment.findMany({
      where: { classroomId: params.classroomId },
      select: {
        id: true,
        testId: true,
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

    return reply.send({ assignments });
  });

  // List assigned tests for a student (student view)
  app.get('/students/:studentId/assigned', async (request: FastifyRequest, reply) => {
    const studentId = (request.params as any).studentId;

    // Verify student belongs to user
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        userId: request.userId,
      },
      include: {
        enrollments: {
          select: { classroomId: true },
        },
      },
    });

    if (!student) {
      return reply.code(404).send({ error: 'Student not found' });
    }

    const classroomIds = student.enrollments.map((e) => e.classroomId);

    // Get assigned tests
    const assignments = await prisma.testAssignment.findMany({
      where: { classroomId: { in: classroomIds } },
      select: {
        id: true,
        testId: true,
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

    return reply.send({ assignments });
  });

  // Get student's test attempts history (for review)
  app.get('/students/:studentId/attempts', async (request: FastifyRequest, reply) => {
    const studentId = (request.params as any).studentId;

    // Verify student is enrolled in one of the teacher's classrooms
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        enrollments: {
          some: {
            classroom: {
              teacherId: request.userId,
            },
          },
        },
      },
    });

    if (!student) {
      return reply.code(404).send({ error: 'Student not found or not in your classrooms' });
    }

    const attempts = await prisma.testAttempt.findMany({
      where: { studentId },
      select: {
        id: true,
        testId: true,
        totalQuestions: true,
        correctAnswers: true,
        score: true,
        status: true,
        startedAt: true,
        completedAt: true,
        test: {
          select: {
            id: true,
            name: true,
            variant: true,
            sheet: {
              select: {
                id: true,
                name: true,
                originalName: true,
              },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    return reply.send({ attempts });
  });

  // Get detailed test review (for student to review completed test)
  app.get('/attempts/:attemptId/review', async (request: FastifyRequest, reply) => {
    const attemptId = (request.params as any).attemptId;

    if (!attemptId) {
      return reply.code(400).send({ error: 'Attempt ID required' });
    }

    // Get attempt with all details
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        testId: true,
        studentId: true,
        totalQuestions: true,
        correctAnswers: true,
        score: true,
        status: true,
        startedAt: true,
        completedAt: true,
        student: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
        test: {
          select: {
            id: true,
            name: true,
            variant: true,
            sheet: {
              select: {
                id: true,
                name: true,
                originalName: true,
              },
            },
          },
        },
        answers: {
          select: {
            id: true,
            questionId: true,
            answer: true,
            isCorrect: true,
            answeredAt: true,
          },
        },
      },
    });

    if (!attempt) {
      return reply.code(404).send({ error: 'Attempt not found' });
    }

    // Verify student ownership (check if the logged-in user owns this student)
    if (attempt.student.userId !== request.userId) {
      return reply.code(403).send({ error: 'Unauthorized' });
    }

    // Only allow reviewing submitted attempts
    if (attempt.status !== 'SUBMITTED' && attempt.status !== 'GRADED') {
      return reply.code(400).send({ error: 'Attempt not completed yet' });
    }

    // Get all questions for this test with correct answers
    const questions = await prisma.testQuestion.findMany({
      where: { testId: attempt.testId },
      select: {
        id: true,
        questionText: true,
        questionType: true,
        correctAnswer: true,
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
      orderBy: { orderIndex: 'asc' },
    });

    // Create a map of student answers for quick lookup
    const answerMap = new Map(
      attempt.answers.map((ans) => [ans.questionId, ans])
    );

    // Combine questions with student answers
    const questionsWithAnswers = questions.map((question) => {
      const studentAnswer = answerMap.get(question.id);

      // Parse options if they exist
      let parsedOptions: string[] | null = null;
      if (question.options) {
        try {
          parsedOptions = JSON.parse(question.options);
        } catch (e) {
          // If parsing fails, leave as null
          parsedOptions = null;
        }
      }

      return {
        id: question.id,
        questionText: question.questionText,
        questionType: question.questionType,
        orderIndex: question.orderIndex,
        options: parsedOptions,
        correctAnswer: question.correctAnswer,
        studentAnswer: studentAnswer?.answer || null,
        isCorrect: studentAnswer?.isCorrect ?? false,
        word: question.word,
      };
    });

    // Return review data
    return reply.send({
      attempt: {
        id: attempt.id,
        score: attempt.score,
        correctAnswers: attempt.correctAnswers,
        totalQuestions: attempt.totalQuestions,
        completedAt: attempt.completedAt,
        test: attempt.test,
      },
      questions: questionsWithAnswers,
    });
  });
};
