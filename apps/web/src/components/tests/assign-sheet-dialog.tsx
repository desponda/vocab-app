'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Classroom, vocabularySheetsApi } from '@/lib/api';

interface AssignSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheetId: string;
  sheetName: string;
  testCount: number;
  classrooms: Classroom[];
  accessToken: string;
  onAssigned: () => void;
}

export function AssignSheetDialog({
  open,
  onOpenChange,
  sheetId,
  sheetName,
  testCount,
  classrooms,
  accessToken,
  onAssigned,
}: AssignSheetDialogProps) {
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState('');

  const handleAssign = async () => {
    if (!selectedClassroomId) {
      setError('Please select a classroom');
      return;
    }

    setError('');
    setIsAssigning(true);

    try {
      const result = await vocabularySheetsApi.assignToClassroom(
        sheetId,
        selectedClassroomId,
        undefined, // dueDate - not implementing for now
        accessToken
      );

      onAssigned();
      onOpenChange(false);
      setSelectedClassroomId('');
    } catch (err: unknown) {
      console.error('Failed to assign tests:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign tests. Please try again.';
      setError(errorMessage);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedClassroomId('');
      setError('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Assign {sheetName} to Classroom</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {classrooms.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                You need to create a classroom first before assigning tests.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="classroom">Select Classroom</Label>
                <Select
                  value={selectedClassroomId}
                  onValueChange={setSelectedClassroomId}
                  disabled={isAssigning}
                >
                  <SelectTrigger id="classroom">
                    <SelectValue placeholder="Choose a classroom" />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        {classroom.name} (Grade {classroom.gradeLevel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  All <span className="font-medium text-foreground">{testCount}</span> test variant
                  {testCount === 1 ? '' : 's'} will be assigned to students in the selected classroom.
                </p>
              </div>

              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isAssigning}
          >
            Cancel
          </Button>
          {classrooms.length > 0 && (
            <Button
              type="button"
              onClick={handleAssign}
              disabled={isAssigning || !selectedClassroomId}
            >
              {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Tests
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
