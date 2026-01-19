import { z } from 'zod';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Only set Content-Type if there's a body
  if (fetchOptions.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: 'include', // Include cookies for refresh tokens
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: 'Unknown Error',
      message: 'An unexpected error occurred',
    }));

    throw new ApiError(
      errorData.message || 'Request failed',
      response.status,
      errorData.details
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Auth API
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    name: string;
    role: 'TEACHER' | 'STUDENT';
    classroomCode?: string;
  }): Promise<{ user: User; accessToken: string }> =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: {
    email: string;
    password: string;
  }): Promise<{ user: User; accessToken: string }> =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: (): Promise<{ message: string }> =>
    request('/api/auth/logout', {
      method: 'POST',
    }),

  refresh: (): Promise<{ accessToken: string }> =>
    request('/api/auth/refresh', {
      method: 'POST',
    }),

  me: (token: string): Promise<{ user: User }> =>
    request('/api/auth/me', {
      token,
    }),
};

// Students API
export const studentsApi = {
  // List students - used by student dashboard to get logged-in student's record
  list: (token: string): Promise<{ students: Student[] }> =>
    request('/api/students', { token }),
};

// Classrooms API
export const classroomsApi = {
  create: (name: string, gradeLevel: number, token: string): Promise<{ classroom: Classroom }> =>
    request('/api/classrooms', {
      method: 'POST',
      body: JSON.stringify({ name, gradeLevel }),
      token,
    }),

  list: (token: string): Promise<{ classrooms: Classroom[] }> =>
    request('/api/classrooms', { token }),

  get: (id: string, token: string): Promise<{ classroom: ClassroomDetail }> =>
    request(`/api/classrooms/${id}`, { token }),

  update: (
    id: string,
    data: { name?: string; gradeLevel?: number; isActive?: boolean },
    token: string
  ): Promise<{ classroom: Classroom }> =>
    request(`/api/classrooms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  delete: (id: string, token: string): Promise<void> =>
    request(`/api/classrooms/${id}`, {
      method: 'DELETE',
      token,
    }),

  enroll: (
    code: string,
    studentId: string,
    token: string
  ): Promise<{ enrollment: Enrollment }> =>
    request('/api/classrooms/enroll', {
      method: 'POST',
      body: JSON.stringify({ code, studentId }),
      token,
    }),

  unenroll: (enrollmentId: string, token: string): Promise<void> =>
    request(`/api/classrooms/enroll/${enrollmentId}`, {
      method: 'DELETE',
      token,
    }),

  // Get all students (needed for classroom detail page)
  listStudents: (token: string): Promise<{ students: Student[] }> =>
    request('/api/students', { token }),

  // Get classroom stats
  getStats: (
    id: string,
    token: string
  ): Promise<{
    studentCount: number;
    testsAssigned: number;
    avgTestScore: number;
    completionRate: number;
  }> => request(`/api/classrooms/${id}/stats`, { token }),

  // Get classroom activity
  getActivity: (
    id: string,
    token: string
  ): Promise<{
    activities: Array<{
      type: 'enrollment' | 'test_completion' | 'test_assignment';
      studentName?: string;
      testName?: string;
      score?: number;
      timestamp: Date;
    }>;
  }> => request(`/api/classrooms/${id}/activity`, { token }),

  // Get test attempts for classroom
  getTestAttempts: (
    id: string,
    token: string
  ): Promise<{
    attempts: Array<{
      id: string;
      studentName: string;
      testName: string;
      variant: string;
      score: number;
      completedAt: Date;
    }>;
  }> => request(`/api/classrooms/${id}/test-attempts`, { token }),
};

// Vocabulary Sheets API
export const vocabularySheetsApi = {
  upload: (
    file: File,
    name: string,
    testsToGenerate: number = 3,
    gradeLevel: number | undefined,
    token: string,
    onProgress?: (progress: number) => void
  ): Promise<{ sheet: VocabularySheet }> => {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          const errorData = JSON.parse(xhr.responseText);
          reject(new ApiError(errorData.error || 'Upload failed', xhr.status));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new ApiError('Network error', 0));
      });

      const encodedName = encodeURIComponent(name);
      const gradeLevelParam = gradeLevel ? `&gradeLevel=${gradeLevel}` : '';
      xhr.open('POST', `${API_URL}/api/vocabulary-sheets?name=${encodedName}&testsToGenerate=${testsToGenerate}${gradeLevelParam}`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  },

  list: (token: string): Promise<{ sheets: VocabularySheet[] }> =>
    request('/api/vocabulary-sheets', { token }),

  get: (id: string, token: string): Promise<{ sheet: VocabularySheetDetail }> =>
    request(`/api/vocabulary-sheets/${id}`, { token }),

  download: (id: string, token: string): string =>
    `${API_URL}/api/vocabulary-sheets/${id}/download?token=${token}`,

  delete: (id: string, token: string): Promise<void> =>
    request(`/api/vocabulary-sheets/${id}`, { method: 'DELETE', token }),

  assignToClassroom: (
    sheetId: string,
    classroomId: string,
    dueDate: string | undefined,
    token: string
  ): Promise<{
    assignments: Array<{
      id: string;
      testId: string;
      classroomId: string;
      dueDate: string | null;
      assignedAt: string;
    }>;
    sheet: { id: string; name: string };
    variantsAssigned: number;
  }> =>
    request(`/api/vocabulary-sheets/${sheetId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ classroomId, dueDate }),
      token,
    }),
};

// Tests API
export const testsApi = {
  // Assign test to classroom
  assign: (
    testId: string,
    classroomId: string,
    token: string,
    dueDate?: string
  ): Promise<{ assignment: TestAssignment }> =>
    request(`/api/tests/${testId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ classroomId, dueDate }),
      token,
    }),

  // Remove test assignment
  removeAssignment: (assignmentId: string, token: string): Promise<void> =>
    request(`/api/tests/assignments/${assignmentId}`, {
      method: 'DELETE',
      token,
    }),

  // Get test with questions
  get: (testId: string, token: string): Promise<{ test: TestDetail }> =>
    request(`/api/tests/${testId}`, { token }),

  // Start test attempt
  startAttempt: (
    testId: string,
    studentId: string,
    token: string
  ): Promise<{ attempt: TestAttempt }> =>
    request('/api/tests/attempts/start', {
      method: 'POST',
      body: JSON.stringify({ testId, studentId }),
      token,
    }),

  // Get attempt details
  getAttempt: (
    attemptId: string,
    studentId: string,
    token: string
  ): Promise<{ attempt: TestAttempt }> =>
    request(`/api/tests/attempts/${attemptId}?studentId=${studentId}`, {
      token,
    }),

  // Submit answer to question
  submitAnswer: (
    attemptId: string,
    questionId: string,
    answer: string,
    token: string
  ): Promise<{ answer: TestAnswer }> =>
    request(`/api/tests/attempts/${attemptId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ questionId, answer }),
      token,
    }),

  // Complete test attempt
  completeAttempt: (
    attemptId: string,
    token: string
  ): Promise<{ attempt: TestAttempt }> =>
    request(`/api/tests/attempts/${attemptId}/complete`, {
      method: 'POST',
      token,
    }),

  // List assigned tests for classroom (teacher view)
  listAssignedToClassroom: (
    classroomId: string,
    token: string
  ): Promise<{ assignments: TestAssignment[] }> =>
    request(`/api/tests/classrooms/${classroomId}/assigned`, { token }),

  // List assigned tests for student
  listAssignedToStudent: (
    studentId: string,
    token: string
  ): Promise<{ assignments: TestAssignment[] }> =>
    request(`/api/tests/students/${studentId}/assigned`, { token }),

  // Get student's attempt history
  getAttemptHistory: (
    studentId: string,
    token: string
  ): Promise<{ attempts: TestAttempt[] }> =>
    request(`/api/tests/students/${studentId}/attempts`, { token }),

  // Create attempt and get questions (convenience method)
  createAttempt: async (
    testId: string,
    studentId: string,
    token: string
  ): Promise<{ attempt: TestAttempt & { test: TestDetail } }> => {
    // Start the attempt
    const { attempt } = await request<{ attempt: TestAttempt }>('/api/tests/attempts/start', {
      method: 'POST',
      body: JSON.stringify({ testId, studentId }),
      token,
    });

    // Get test with questions
    const { test } = await request<{ test: TestDetail }>(`/api/tests/${testId}`, { token });

    // Return attempt with test questions
    return {
      attempt: {
        ...attempt,
        test: {
          ...test,
          questions: test.questions || [],
        },
      },
    };
  },

  // Submit all answers and complete attempt
  submitAttempt: async (
    attemptId: string,
    data: { answers: { questionId: string; answer: string }[] },
    studentId: string,
    token: string
  ): Promise<{ attempt: TestAttempt }> => {
    // Submit each answer
    for (const answerData of data.answers) {
      await request(`/api/tests/attempts/${attemptId}/answer`, {
        method: 'POST',
        body: JSON.stringify({
          questionId: answerData.questionId,
          answer: answerData.answer,
        }),
        token,
      });
    }

    // Complete the attempt to calculate score
    const result = await request<{ attempt: TestAttempt }>(
      `/api/tests/attempts/${attemptId}/complete`,
      {
        method: 'POST',
        token,
      }
    );

    return result;
  },

  // List all tests (teacher view)
  list: (token: string): Promise<{ tests: Test[] }> =>
    request('/api/tests', { token }),

  // Get attempt review (detailed results for student)
  getAttemptReview: (attemptId: string, token: string): Promise<{
    attempt: {
      id: string;
      score: number | null;
      correctAnswers: number | null;
      totalQuestions: number;
      completedAt: string | null;
      test: {
        id: string;
        name: string;
        variant: string;
        sheet?: {
          id: string;
          name: string;
          originalName: string;
        };
      };
    };
    questions: Array<{
      id: string;
      questionText: string;
      questionType: string;
      orderIndex: number;
      options: string[] | null;
      correctAnswer: string;
      studentAnswer: string | null;
      isCorrect: boolean;
      word?: {
        id: string;
        word: string;
        definition: string | null;
      };
    }>;
  }> =>
    request(`/api/tests/attempts/${attemptId}/review`, { token }),
};

// Documents API (Deprecated - use vocabularySheetsApi instead)
export const documentsApi = {
  upload: (
    file: File,
    studentId: string,
    token: string,
    onProgress?: (progress: number) => void
  ): Promise<{ document: Document }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('studentId', studentId);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          const errorData = JSON.parse(xhr.responseText);
          reject(new ApiError(errorData.error || 'Upload failed', xhr.status));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new ApiError('Network error', 0));
      });

      xhr.open('POST', `${API_URL}/api/documents`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  },

  list: (token: string, studentId?: string): Promise<{ documents: Document[] }> => {
    const url = studentId
      ? `/api/documents?studentId=${studentId}`
      : '/api/documents';
    return request(url, { token });
  },

  get: (id: string, token: string): Promise<{ document: Document }> =>
    request(`/api/documents/${id}`, { token }),

  download: (id: string, token: string): string =>
    `${API_URL}/api/documents/${id}/download?token=${token}`,

  delete: (id: string, token: string): Promise<void> =>
    request(`/api/documents/${id}`, { method: 'DELETE', token }),
};

// Types
export const UserRoleSchema = z.enum(['STUDENT', 'TEACHER', 'ADMIN']);

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: UserRoleSchema,
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export const StudentSchema = z.object({
  id: z.string(),
  name: z.string(),
  gradeLevel: z.number().int().min(1).max(12).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  enrollments: z.array(z.object({
    id: z.string(),
    classroomId: z.string(),
  })).optional(),
});

export const DocumentStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);

export const DocumentTypeSchema = z.enum(['PDF', 'IMAGE']);

export const DocumentSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  fileName: z.string(),
  fileType: DocumentTypeSchema,
  mimeType: z.string().optional(),
  fileSize: z.number(),
  status: DocumentStatusSchema,
  uploadedAt: z.string(),
  processedAt: z.string().optional(),
  student: z.object({
    id: z.string(),
    name: z.string(),
    gradeLevel: z.number().optional(),
  }),
});

// Classroom schemas
export const ClassroomSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  gradeLevel: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  _count: z.object({
    enrollments: z.number(),
  }).optional(),
});

export const EnrolledStudentSchema = z.object({
  id: z.string(),
  name: z.string(),
  gradeLevel: z.number().nullable().optional(),
});

export const EnrollmentSchema = z.object({
  id: z.string(),
  enrolledAt: z.string(),
  student: EnrolledStudentSchema.optional(),
  classroom: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
  }).optional(),
});

export const ClassroomDetailSchema = ClassroomSchema.extend({
  enrollments: z.array(EnrollmentSchema),
});

export type User = z.infer<typeof UserSchema>;
export type Student = z.infer<typeof StudentSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;
export type DocumentType = z.infer<typeof DocumentTypeSchema>;
export type Classroom = z.infer<typeof ClassroomSchema>;
export type ClassroomDetail = z.infer<typeof ClassroomDetailSchema>;
export type Enrollment = z.infer<typeof EnrollmentSchema>;

// Vocabulary Sheet schemas
export const ProcessingStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);

export const VocabularySheetSchema = z.object({
  id: z.string(),
  name: z.string(),
  originalName: z.string(),
  fileName: z.string(),
  fileType: DocumentTypeSchema,
  mimeType: z.string(),
  fileSize: z.number(),
  gradeLevel: z.number().nullable().optional(),
  status: ProcessingStatusSchema,
  errorMessage: z.string().nullable().optional(),
  testsToGenerate: z.number(),
  uploadedAt: z.string(),
  processedAt: z.string().nullable().optional(),
  _count: z.object({
    words: z.number(),
    tests: z.number(),
  }).optional(),
});

export const VocabularyWordSchema = z.object({
  id: z.string(),
  word: z.string(),
  definition: z.string().nullable().optional(),
  context: z.string().nullable().optional(),
});

export const TestSchema = z.object({
  id: z.string(),
  name: z.string(),
  variant: z.string(),
  createdAt: z.string(),
  _count: z.object({
    questions: z.number(),
  }).optional(),
});

export const VocabularySheetDetailSchema = VocabularySheetSchema.extend({
  extractedText: z.string().nullable().optional(),
  words: z.array(VocabularyWordSchema).optional(),
  tests: z.array(TestSchema).optional(),
});

export const QuestionTypeSchema = z.enum([
  'SPELLING',
  'DEFINITION',
  'FILL_BLANK',
  'MULTIPLE_CHOICE',
]);

export const TestQuestionSchema = z.object({
  id: z.string(),
  questionText: z.string(),
  questionType: QuestionTypeSchema,
  options: z.string().nullable().optional(),
  orderIndex: z.number(),
  word: z.object({
    id: z.string(),
    word: z.string(),
    definition: z.string().nullable().optional(),
  }).optional(),
});

export const TestDetailSchema = TestSchema.extend({
  sheet: z.object({
    id: z.string(),
    name: z.string(),
    originalName: z.string(),
    teacherId: z.string(),
  }).optional(),
  questions: z.array(TestQuestionSchema).optional(),
});

export const TestAssignmentSchema = z.object({
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

export const TestAnswerSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  answer: z.string(),
  isCorrect: z.boolean().nullable().optional(),
  answeredAt: z.string(),
});

export const AttemptStatusSchema = z.enum([
  'IN_PROGRESS',
  'SUBMITTED',
  'GRADED',
]);

export const TestAttemptSchema = z.object({
  id: z.string(),
  testId: z.string(),
  studentId: z.string(),
  totalQuestions: z.number(),
  correctAnswers: z.number().nullable().optional(),
  score: z.number().nullable().optional(),
  status: AttemptStatusSchema,
  startedAt: z.string(),
  completedAt: z.string().nullable().optional(),
  answers: z.array(TestAnswerSchema).optional(),
  student: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
  test: z.object({
    id: z.string(),
    name: z.string(),
    variant: z.string(),
    sheet: z.object({
      id: z.string(),
      name: z.string(),
      originalName: z.string(),
    }).optional(),
  }).optional(),
});

export type ProcessingStatus = z.infer<typeof ProcessingStatusSchema>;
export type VocabularySheet = z.infer<typeof VocabularySheetSchema>;
export type VocabularySheetDetail = z.infer<typeof VocabularySheetDetailSchema>;
export type VocabularyWord = z.infer<typeof VocabularyWordSchema>;
export type Test = z.infer<typeof TestSchema>;
export type TestDetail = z.infer<typeof TestDetailSchema>;
export type TestQuestion = z.infer<typeof TestQuestionSchema>;
export type TestAssignment = z.infer<typeof TestAssignmentSchema>;
export type TestAnswer = z.infer<typeof TestAnswerSchema>;
export type TestAttempt = z.infer<typeof TestAttemptSchema>;
export type QuestionType = z.infer<typeof QuestionTypeSchema>;
export type AttemptStatus = z.infer<typeof AttemptStatusSchema>;
