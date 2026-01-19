'use client';

import { Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VocabularyWord } from '@/lib/api';

interface ViewWordsSectionProps {
  words: VocabularyWord[];
  isLoading: boolean;
  onEditWord: (word: VocabularyWord) => void;
}

export function ViewWordsSection({
  words,
  isLoading,
  onEditWord,
}: ViewWordsSectionProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading words...</span>
      </div>
    );
  }

  if (!words || words.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No words extracted</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">
        Vocabulary Words ({words.length})
      </h4>

      {/* Desktop: Table layout */}
      <div className="hidden md:block">
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 text-sm font-medium">Word</th>
                <th className="text-left p-3 text-sm font-medium">Definition</th>
                <th className="text-left p-3 text-sm font-medium">Context</th>
                <th className="text-right p-3 text-sm font-medium w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {words.map((word) => (
                <tr key={word.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{word.word}</td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {word.definition || <span className="italic">No definition</span>}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {word.context || <span className="italic">No context</span>}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditWord(word)}
                      aria-label={`Edit word ${word.word}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: Card layout */}
      <div className="md:hidden space-y-3">
        {words.map((word) => (
          <div
            key={word.id}
            className="border rounded-lg p-4 space-y-2 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <h5 className="font-semibold text-base">{word.word}</h5>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditWord(word)}
                aria-label={`Edit word ${word.word}`}
                className="flex-shrink-0"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            {word.definition && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Definition: </span>
                <p className="text-sm mt-1">{word.definition}</p>
              </div>
            )}
            {word.context && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Context: </span>
                <p className="text-sm mt-1 text-muted-foreground">{word.context}</p>
              </div>
            )}
            {!word.definition && !word.context && (
              <p className="text-sm text-muted-foreground italic">No definition or context available</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
