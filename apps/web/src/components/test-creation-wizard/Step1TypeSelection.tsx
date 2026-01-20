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
    <div className="py-4 sm:py-8 space-y-4 sm:space-y-6">
      <div className="space-y-1 sm:space-y-2">
        <h3 className="text-lg sm:text-xl font-semibold">What kind of test do you want to create?</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Choose the test type that best matches your teaching material
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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

      <div className="flex justify-center pt-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <HelpCircle className="h-4 w-4" />
              Need help choosing?
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
                  <li>• Use "Use all words" for fastest spelling tests</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
