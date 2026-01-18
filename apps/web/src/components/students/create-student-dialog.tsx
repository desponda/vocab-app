'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { studentsApi, Student } from '@/lib/api';

const createStudentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  gradeLevel: z.coerce
    .number()
    .int()
    .min(1, 'Grade must be between 1 and 12')
    .max(12, 'Grade must be between 1 and 12'),
});

type CreateStudentFormData = z.infer<typeof createStudentSchema>;

interface CreateStudentDialogProps {
  onStudentCreated: (student: Student) => void;
  trigger?: React.ReactNode;
}

export function CreateStudentDialog({
  onStudentCreated,
  trigger,
}: CreateStudentDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { accessToken } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateStudentFormData>({
    resolver: zodResolver(createStudentSchema),
  });

  // Debug logging
  useEffect(() => {
    console.log('[CreateStudentDialog] Component mounted');
    return () => console.log('[CreateStudentDialog] Component unmounted');
  }, []);

  useEffect(() => {
    console.log('[CreateStudentDialog] Dialog open state changed:', open);
  }, [open]);

  useEffect(() => {
    if (error) {
      console.error('[CreateStudentDialog] Error:', error);
    }
  }, [error]);

  const onSubmit = async (data: CreateStudentFormData) => {
    console.log('[CreateStudentDialog] Form submitted with data:', data);
    if (!accessToken) {
      console.error('[CreateStudentDialog] No access token available');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('[CreateStudentDialog] Creating student...');
      const { student } = await studentsApi.create(
        {
          name: data.name,
          gradeLevel: data.gradeLevel,
        },
        accessToken
      );

      console.log('[CreateStudentDialog] Student created successfully:', student);
      onStudentCreated(student);
      setOpen(false);
      reset();
    } catch (err) {
      console.error('[CreateStudentDialog] Failed to create student:', err);
      setError(err instanceof Error ? err.message : 'Failed to create student');
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log('[CreateStudentDialog] Rendering with open:', open);

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      console.log('[CreateStudentDialog] Dialog onOpenChange called with:', newOpen);
      setOpen(newOpen);
    }}>
      <DialogTrigger asChild onClick={() => console.log('[CreateStudentDialog] Trigger clicked')}>
        {trigger || <Button>Add Student</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add Student</DialogTitle>
            <DialogDescription>
              Create a new student profile to track their vocabulary progress.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Student Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                {...register('name')}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gradeLevel">Grade Level</Label>
              <Input
                id="gradeLevel"
                type="number"
                min="1"
                max="12"
                placeholder="6"
                {...register('gradeLevel')}
                disabled={isSubmitting}
              />
              {errors.gradeLevel && (
                <p className="text-sm text-destructive">
                  {errors.gradeLevel.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
