'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Check, Copy } from 'lucide-react';
import { classroomsApi, Classroom } from '@/lib/api';

interface CreateClassroomDialogProps {
  accessToken: string | null;
  onClassroomCreated: (classroom: Classroom) => void;
}

export function CreateClassroomDialog({ accessToken, onClassroomCreated }: CreateClassroomDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('6');
  const [isCreating, setIsCreating] = useState(false);
  const [createdClassroom, setCreatedClassroom] = useState<Classroom | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !name.trim()) return;

    setIsCreating(true);
    try {
      const grade = parseInt(gradeLevel, 10);
      const { classroom } = await classroomsApi.create(name, grade, accessToken);
      setCreatedClassroom(classroom);
      onClassroomCreated(classroom);

      // Reset form
      setName('');
      setGradeLevel('6');
    } catch (error) {
      console.error('Failed to create classroom:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyCode = () => {
    if (createdClassroom) {
      navigator.clipboard.writeText(createdClassroom.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset state after animation completes
    setTimeout(() => {
      setCreatedClassroom(null);
      setCopiedCode(false);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Classroom
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {!createdClassroom ? (
          <>
            <DialogHeader>
              <DialogTitle>Create New Classroom</DialogTitle>
              <DialogDescription>
                Set up a new classroom and get a unique code to share with students.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="classroom-name">Classroom Name</Label>
                <Input
                  id="classroom-name"
                  placeholder="e.g., Grade 3A or Advanced English"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isCreating}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade-level">Grade Level</Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel} disabled={isCreating}>
                  <SelectTrigger id="grade-level">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((grade) => (
                      <SelectItem key={grade} value={grade.toString()}>
                        Grade {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!name.trim() || isCreating}>
                  {isCreating ? 'Creating...' : 'Create Classroom'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Classroom Created!</DialogTitle>
              <DialogDescription>
                Share this code with your students so they can join the classroom.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 p-6 text-center space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Classroom Code</p>
                <p className="text-4xl font-bold tracking-wider text-purple-600 dark:text-purple-400">
                  {createdClassroom.code}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  className="gap-2"
                >
                  {copiedCode ? (
                    <>
                      <Check className="h-4 w-4 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Code
                    </>
                  )}
                </Button>
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Classroom Name</span>
                  <span className="text-sm text-muted-foreground">{createdClassroom.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Grade Level</span>
                  <span className="text-sm text-muted-foreground">Grade {createdClassroom.gradeLevel}</span>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleClose}>Done</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
