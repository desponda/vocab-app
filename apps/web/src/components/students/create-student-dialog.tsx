'use client';

import { useState } from 'react';
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

  const onSubmit = async (data: CreateStudentFormData) => {
    if (!accessToken) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { student } = await studentsApi.create(
        {
          name: data.name,
          gradeLevel: data.gradeLevel,
        },
        accessToken
      );

      onStudentCreated(student);
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create student');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
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
