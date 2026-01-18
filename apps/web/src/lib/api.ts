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
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

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
  list: (token: string): Promise<{ students: Student[] }> =>
    request('/api/students', { token }),

  get: (id: string, token: string): Promise<{ student: Student }> =>
    request(`/api/students/${id}`, { token }),

  create: (
    data: { name: string; gradeLevel: number },
    token: string
  ): Promise<{ student: Student }> =>
    request('/api/students', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    }),

  update: (
    id: string,
    data: { name?: string; gradeLevel?: number },
    token: string
  ): Promise<{ student: Student }> =>
    request(`/api/students/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),

  delete: (id: string, token: string): Promise<void> =>
    request(`/api/students/${id}`, {
      method: 'DELETE',
      token,
    }),
};

// Classrooms API
export const classroomsApi = {
  create: (name: string, token: string): Promise<{ classroom: Classroom }> =>
    request('/api/classrooms', {
      method: 'POST',
      body: JSON.stringify({ name }),
      token,
    }),

  list: (token: string): Promise<{ classrooms: Classroom[] }> =>
    request('/api/classrooms', { token }),

  get: (id: string, token: string): Promise<{ classroom: ClassroomDetail }> =>
    request(`/api/classrooms/${id}`, { token }),

  update: (
    id: string,
    data: { name?: string; isActive?: boolean },
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
};

// Documents API
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
export const UserRoleSchema = z.enum(['PARENT', 'TEACHER', 'ADMIN']);

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
  gradeLevel: z.number().int().min(1).max(12),
  createdAt: z.string(),
  updatedAt: z.string(),
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
  isActive: z.boolean(),
  createdAt: z.string(),
  _count: z.object({
    enrollments: z.number(),
  }).optional(),
});

export const EnrolledStudentSchema = z.object({
  id: z.string(),
  name: z.string(),
  gradeLevel: z.number(),
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
