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
    description: 'Test students on word definitions and meanings',
    bestFor: 'Vocabulary lists with definitions, study guides with terms and explanations',
    exampleContent: 'Upload a vocabulary list like: "Photosynthesis - The process by which plants make food"',
  },
  {
    type: 'SPELLING',
    icon: Pencil,
    label: 'Spelling Test',
    description: 'Test students on correct spelling of words',
    bestFor: 'Word lists, spelling practice sheets, or vocabulary lists (words only)',
    exampleContent: 'Upload a word list like: "accomplish, believe, conscience, efficient"',
  },
  {
    type: 'GENERAL_KNOWLEDGE',
    icon: Brain,
    label: 'General Knowledge',
    description: 'Test students on comprehension and facts',
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
    <div className="py-8 space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">What kind of test do you want to create?</h3>
        <p className="text-sm text-muted-foreground">
          Choose the test type that best matches your teaching material
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

              <CardContent className="space-y-3">
                <CardDescription className="text-sm">{option.description}</CardDescription>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Best for:</p>
                  <p className="text-xs text-muted-foreground">{option.bestFor}</p>
                </div>
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

            <div className="space-y-6 pt-4">
              {/* Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Feature</th>
                      <th className="text-left p-3 font-semibold">📚 Vocabulary</th>
                      <th className="text-left p-3 font-semibold">✏️ Spelling</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Question Types</td>
                      <td className="p-3 text-muted-foreground">Definition matching, fill-in-blank with word banks</td>
                      <td className="p-3 text-muted-foreground">Multiple choice (identify correct spelling)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Content Required</td>
                      <td className="p-3 text-muted-foreground">Words AND definitions</td>
                      <td className="p-3 text-muted-foreground">Just words (definitions optional)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">AI Processing</td>
                      <td className="p-3 text-muted-foreground">Extracts words and definitions</td>
                      <td className="p-3 text-muted-foreground">Extracts words, generates misspellings</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Fast Mode</td>
                      <td className="p-3 text-muted-foreground">Not available</td>
                      <td className="p-3 text-muted-foreground">✓ &quot;Use all words&quot; option (skips AI)</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Best Upload</td>
                      <td className="p-3 text-muted-foreground">Vocabulary lists, study guides, glossaries</td>
                      <td className="p-3 text-muted-foreground">Word lists, spelling practice sheets</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-medium">Processing Time</td>
                      <td className="p-3 text-muted-foreground">2-3 minutes for 3 variants</td>
                      <td className="p-3 text-muted-foreground">2-3 minutes (or 30 sec with &quot;Use all words&quot;)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Detailed Sections */}
              {TEST_TYPE_OPTIONS.filter(opt => !opt.disabled).map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.type} className="space-y-3 pb-6 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h4 className="font-semibold">{option.label}</h4>
                    </div>

                    <div className="space-y-2 pl-11">
                      <div>
                        <p className="text-sm font-medium">What you&apos;ll get:</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>

                      <div>
                        <p className="text-sm font-medium">Example upload:</p>
                        <div className="mt-1 p-2 bg-muted rounded text-xs font-mono">
                          {option.exampleContent}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">💡 Pro Tips</p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                  <li><strong>Vocabulary tests:</strong> Include definitions for better quality questions</li>
                  <li><strong>Spelling tests:</strong> Simple word lists work great - use &quot;Use all words&quot; for fastest processing</li>
                  <li><strong>Image quality:</strong> Clear, well-lit photos with good contrast produce best results</li>
                  <li><strong>Processing time:</strong> More variants = longer processing (plan accordingly)</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
