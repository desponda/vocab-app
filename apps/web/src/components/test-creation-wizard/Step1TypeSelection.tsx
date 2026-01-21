'use client';

import { useWizard } from './WizardContext';
import { TestType } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BookOpen, Pencil, Brain, HelpCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestTypeOption {
  type: TestType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  bestFor: string;
  exampleContent: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

const TEST_TYPE_OPTIONS: TestTypeOption[] = [
  {
    type: 'VOCABULARY',
    icon: BookOpen,
    label: 'Vocabulary Test',
    description: 'Word meanings and definitions',
    bestFor: 'Vocabulary lists with definitions, study guides with terms and explanations',
    exampleContent: 'Upload a vocabulary list like: "Photosynthesis - The process by which plants make food"',
  },
  {
    type: 'SPELLING',
    icon: Pencil,
    label: 'Spelling Test',
    description: 'Correct word spelling',
    bestFor: 'Word lists, spelling practice sheets, or vocabulary lists (words only)',
    exampleContent: 'Upload a word list like: "accomplish, believe, conscience, efficient"',
  },
  {
    type: 'GENERAL_KNOWLEDGE',
    icon: Brain,
    label: 'General Knowledge',
    description: 'Facts and comprehension',
    bestFor: 'Study guides, textbook chapters, articles',
    exampleContent: 'Upload content like textbook passages or study materials',
    disabled: true,
    comingSoon: true,
  },
];

export function Step1TypeSelection() {
  const { state, updateState } = useWizard();
  const { testType } = state;

  const handleSelectType = (type: TestType) => {
    updateState({ testType: type });
  };

  return (
    <div className="py-2 sm:py-8 space-y-3 sm:space-y-6">
      <div className="space-y-1 sm:space-y-2">
        <h3 className="text-base sm:text-xl font-semibold">What kind of test do you want to create?</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Choose the test type that best matches your teaching material
        </p>
      </div>

      {/* Mobile: List view with large tap targets */}
      <div className="sm:hidden space-y-2">
        {TEST_TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = testType === option.type;
          const isDisabled = option.disabled;

          return (
            <button
              key={option.type}
              onClick={() => !isDisabled && handleSelectType(option.type)}
              disabled={isDisabled}
              className={cn(
                'w-full p-4 rounded-lg border-2 text-left transition-all',
                'min-h-[72px] flex items-center gap-3',
                isSelected && 'border-primary bg-primary/5 shadow-sm',
                !isSelected && !isDisabled && 'border-border hover:border-muted-foreground/30 hover:bg-muted/50',
                isDisabled && 'opacity-60 cursor-not-allowed border-border'
              )}
            >
              <div
                className={cn(
                  'p-2.5 rounded-lg flex-shrink-0',
                  isSelected && !isDisabled ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm">{option.label}</span>
                  {option.comingSoon && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      Coming Soon
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {option.description}
                </p>
              </div>
              {isSelected && !isDisabled && (
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop: Card grid (original design) */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {TEST_TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = testType === option.type;
          const isDisabled = option.disabled;

          return (
            <Card
              key={option.type}
              className={cn(
                'relative cursor-pointer transition-all hover:shadow-md',
                isSelected && 'ring-2 ring-primary shadow-lg',
                isDisabled && 'opacity-60 cursor-not-allowed hover:shadow-none'
              )}
              onClick={() => !isDisabled && handleSelectType(option.type)}
            >
              {option.comingSoon && (
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="text-xs">
                    Coming Soon
                  </Badge>
                </div>
              )}

              {isSelected && !isDisabled && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
              )}

              <CardHeader>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{option.label}</CardTitle>
                </div>
              </CardHeader>

              <CardContent>
                <CardDescription className="text-sm">{option.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center pt-3 sm:pt-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground min-h-[44px] px-4"
            >
              <HelpCircle className="h-4 w-4" />
              Need help choosing?
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-sm:fixed max-sm:inset-0 max-sm:h-screen max-sm:w-screen max-sm:max-w-full max-sm:rounded-none max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>How to Choose a Test Type</DialogTitle>
              <DialogDescription>
                Here&apos;s a detailed comparison to help you select the right test type
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div>
                <h4 className="font-semibold mb-3">Quick Guide</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">📚 Vocabulary: <span className="font-normal text-muted-foreground">Word meanings and definitions</span></p>
                    <p className="text-xs text-muted-foreground ml-5">Upload: Vocabulary lists, study guides, glossaries</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">✏️ Spelling: <span className="font-normal text-muted-foreground">Correct word spelling</span></p>
                    <p className="text-xs text-muted-foreground ml-5">Upload: Word lists, spelling sheets</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">💡 Pro Tips</p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Clear photos with good lighting work best</li>
                  <li>• Include definitions for vocabulary tests</li>
                  <li>• Use &quot;Use all words&quot; for fastest spelling tests</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
