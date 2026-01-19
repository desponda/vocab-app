'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { VocabularyWord, vocabularySheetsApi } from '@/lib/api';

interface EditWordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  word: VocabularyWord;
  sheetId: string;
  accessToken: string;
  onWordUpdated: (wordId: string, updatedWord: VocabularyWord) => void;
}

export function EditWordDialog({
  open,
  onOpenChange,
  word,
  sheetId,
  accessToken,
  onWordUpdated,
}: EditWordDialogProps) {
  const [formData, setFormData] = useState({
    word: word.word,
    definition: word.definition || '',
    context: word.context || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when word changes
  useEffect(() => {
    setFormData({
      word: word.word,
      definition: word.definition || '',
      context: word.context || '',
    });
    setError('');
  }, [word]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation: At least one field must be changed
    const hasChanges =
      formData.word !== word.word ||
      formData.definition !== (word.definition || '') ||
      formData.context !== (word.context || '');

    if (!hasChanges) {
      setError('No changes detected');
      return;
    }

    // Validation: Word cannot be empty
    if (!formData.word.trim()) {
      setError('Word cannot be empty');
      return;
    }

    setIsSubmitting(true);

    try {
      const { word: updatedWord } = await vocabularySheetsApi.updateWord(
        sheetId,
        word.id,
        {
          word: formData.word.trim(),
          definition: formData.definition.trim() || undefined,
          context: formData.context.trim() || undefined,
        },
        accessToken
      );

      onWordUpdated(word.id, updatedWord);
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Failed to update word:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update word. Please try again.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Vocabulary Word</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="word">Word *</Label>
            <Input
              id="word"
              value={formData.word}
              onChange={(e) => setFormData({ ...formData, word: e.target.value })}
              maxLength={100}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="definition">Definition</Label>
            <textarea
              id="definition"
              className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.definition}
              onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
              maxLength={500}
              disabled={isSubmitting}
              placeholder="Enter the definition of the word"
            />
            <p className="text-xs text-muted-foreground">
              {formData.definition.length}/500 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Context / Example Sentence</Label>
            <textarea
              id="context"
              className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.context}
              onChange={(e) => setFormData({ ...formData, context: e.target.value })}
              maxLength={500}
              disabled={isSubmitting}
              placeholder="Enter an example sentence using the word"
            />
            <p className="text-xs text-muted-foreground">
              {formData.context.length}/500 characters
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
