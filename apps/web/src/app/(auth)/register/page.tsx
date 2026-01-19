'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import RegisterForm from './register-form';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
