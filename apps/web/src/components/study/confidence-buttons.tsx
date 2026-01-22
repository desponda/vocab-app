'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfidenceButtonsProps {
  visible: boolean;
  onNotYet: () => void;
  onGotIt: () => void;
  disabled?: boolean;
}

export function ConfidenceButtons({
  visible,
  onNotYet,
  onGotIt,
  disabled = false,
}: ConfidenceButtonsProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 p-4 bg-background border-t',
        'animate-in slide-in-from-bottom duration-300',
        'md:static md:border-0 md:mt-6'
      )}
      style={{
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))', // iOS safe area
      }}
    >
      <div className="max-w-2xl mx-auto grid grid-cols-2 gap-4">
        <Button
          size="lg"
          variant="outline"
          onClick={onNotYet}
          disabled={disabled}
          className="h-14 md:h-16 text-base md:text-lg font-medium gap-2"
        >
          <span className="text-xl">😕</span>
          Not Yet
        </Button>
        <Button
          size="lg"
          onClick={onGotIt}
          disabled={disabled}
          className="h-14 md:h-16 text-base md:text-lg font-semibold gap-2 bg-green-600 hover:bg-green-700"
        >
          <span className="text-xl">✓</span>
          Got It!
        </Button>
      </div>
    </div>
  );
}
