'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import Link from 'next/link';

export function StudentEnrollmentSection() {
  const [code, setCode] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();

    // Basic validation: 6 alphanumeric characters
    if (trimmedCode.length === 6 && /^[A-Z0-9]{6}$/.test(trimmedCode)) {
      router.push(`/register?role=student&code=${trimmedCode}`);
    } else {
      // Show error (could add a toast notification here)
      alert('Please enter a valid 6-character classroom code');
    }
  };

  return (
    <section className="py-16 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl">Student? Join Your Classroom</CardTitle>
            <CardDescription className="text-base sm:text-lg">
              Enter the code your teacher gave you to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="ABC123"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-2xl font-bold tracking-wider"
                  aria-label="Classroom code"
                />
                <p className="text-center text-sm text-muted-foreground">
                  6-character code from your teacher
                </p>
              </div>

              <Button type="submit" size="lg" className="w-full">
                Join Classroom
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
