'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FlashcardProps {
  word: string;
  definition: string | null;
  context: string | null;
  isFlipped: boolean;
  onFlip: () => void;
}

export function Flashcard({ word, definition, context, isFlipped, onFlip }: FlashcardProps) {
  return (
    <div className="perspective-[1000px] w-full max-w-2xl mx-auto">
      <div
        className={cn(
          'relative w-full transition-transform duration-500 transform-style-3d cursor-pointer',
          isFlipped && 'rotate-y-180'
        )}
        onClick={onFlip}
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front side - Word */}
        <Card
          className={cn(
            'absolute inset-0 min-h-[400px] md:min-h-[500px] backface-hidden',
            'flex items-center justify-center p-8',
            'shadow-lg hover:shadow-xl transition-shadow'
          )}
          style={{
            backfaceVisibility: 'hidden',
          }}
        >
          <CardContent className="w-full h-full flex flex-col items-center justify-center p-0">
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-8">
              {word}
            </h2>
            {!isFlipped && (
              <p className="text-sm text-muted-foreground animate-pulse">
                👆 Tap to see definition
              </p>
            )}
          </CardContent>
        </Card>

        {/* Back side - Definition */}
        <Card
          className={cn(
            'absolute inset-0 min-h-[400px] md:min-h-[500px] backface-hidden',
            'flex items-center justify-center p-8',
            'shadow-lg'
          )}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <CardContent className="w-full h-full flex flex-col items-center justify-center p-0 overflow-y-auto">
            <p className="text-2xl md:text-3xl font-semibold text-muted-foreground mb-6 text-center">
              {word}
            </p>
            <p className="text-lg md:text-xl text-center mb-6 leading-relaxed">
              {definition || 'No definition available'}
            </p>
            {context && (
              <p className="text-base md:text-lg text-muted-foreground italic text-center max-w-lg">
                &ldquo;{context}&rdquo;
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
