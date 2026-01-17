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

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
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

export type User = z.infer<typeof UserSchema>;
export type Student = z.infer<typeof StudentSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
