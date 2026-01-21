import { UserRole } from '@/lib/api';

interface ErrorContext {
  userRole?: UserRole;
  resourceType?: 'classroom' | 'test' | 'student' | 'vocabulary';
  action?: 'view' | 'edit' | 'delete' | 'create';
}

export function getContextualErrorMessage(
  statusCode: number,
  context?: ErrorContext
): string {
  if (!context) {
    return getDefaultErrorMessage(statusCode);
  }

  const { userRole, resourceType, action } = context;

  // 403 Forbidden - Role-specific messages
  if (statusCode === 403) {
    if (userRole === 'STUDENT') {
      return "You don't have permission to access this. Contact your teacher if you need help.";
    }
    if (resourceType === 'classroom' && action === 'edit') {
      return 'You can only edit your own classrooms.';
    }
    if (resourceType === 'test' && action === 'view') {
      return "This test hasn't been assigned to you yet.";
    }
    if (resourceType === 'student' && action === 'view') {
      return 'You can only view students in your own classrooms.';
    }
  }

  // 404 Not Found - Resource-specific messages
  if (statusCode === 404) {
    if (resourceType === 'classroom') {
      return "This classroom doesn't exist or has been deleted.";
    }
    if (resourceType === 'test') {
      return "This test doesn't exist or hasn't been created yet.";
    }
    if (resourceType === 'student') {
      return 'Student record not found.';
    }
    if (resourceType === 'vocabulary') {
      return "This vocabulary sheet doesn't exist or has been deleted.";
    }
  }

  // 409 Conflict - Resource-specific messages
  if (statusCode === 409) {
    if (resourceType === 'classroom' && action === 'create') {
      return 'A classroom with this name already exists.';
    }
    if (resourceType === 'student') {
      return 'This student is already enrolled in this classroom.';
    }
  }

  return getDefaultErrorMessage(statusCode);
}

function getDefaultErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'The request was invalid. Please check your input and try again.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This action conflicts with existing data.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'A server error occurred. Our team has been notified.';
    case 503:
      return 'The service is temporarily unavailable. Please try again later.';
    default:
      return 'An unexpected error occurred.';
  }
}
