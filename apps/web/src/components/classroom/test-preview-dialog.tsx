'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { testsApi, type TestDetail } from '@/lib/api';
import { Eye, Loader2, CheckCircle, Edit, FileText } from 'lucide-react';

interface TestPreviewDialogProps {
  testId: string;
  testName: string;
  variant: string;
  accessToken: string | null;
}

export function TestPreviewDialog({
  testId,
  testName,
  variant,
  accessToken,
}: TestPreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [test, setTest] = useState<TestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setOpen(true);
    if (!test && accessToken) {
      setIsLoading(true);
      setError(null);
      try {
        const { test: testData } = await testsApi.get(testId, accessToken);
        setTest(testData);
      } catch (err) {
        setError('Failed to load test questions');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'MULTIPLE_CHOICE':
        return <CheckCircle className="h-4 w-4" />;
      case 'FILL_IN_BLANK':
        return <Edit className="h-4 w-4" />;
      case 'SPELLING':
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getQuestionTypeName = (type: string) => {
    switch (type) {
      case 'MULTIPLE_CHOICE':
        return 'Multiple Choice';
      case 'FILL_IN_BLANK':
        return 'Fill in the Blank';
      case 'SPELLING':
        return 'Spelling';
      default:
        return type;
    }
  };

  const parseOptions = (optionsJson: string | null | undefined): string[] => {
    if (!optionsJson) return [];
    try {
      return JSON.parse(optionsJson);
    } catch {
      return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" onClick={handleOpen}>
          <Eye className="h-4 w-4" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {testName}
            <Badge variant="outline">{variant}</Badge>
          </DialogTitle>
          <DialogDescription>
            Preview test questions before assigning to students
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">{error}</div>
        ) : test?.questions && test.questions.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{test.questions.length} questions</span>
              <span>Created {new Date(test.createdAt).toLocaleDateString()}</span>
            </div>

            {test.questions
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((question, index) => {
                const options = parseOptions(question.options);
                return (
                  <Card key={question.id}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Question Header */}
                        <div className="flex items-start gap-3">
                          <Badge variant="secondary" className="flex-shrink-0">
                            Q{index + 1}
                          </Badge>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="gap-1">
                                {getQuestionTypeIcon(question.questionType)}
                                {getQuestionTypeName(question.questionType)}
                              </Badge>
                              {question.word && (
                                <span className="text-xs text-muted-foreground">
                                  Word: <strong>{question.word.word}</strong>
                                </span>
                              )}
                            </div>
                            <p className="text-base font-medium">{question.questionText}</p>
                          </div>
                        </div>

                        {/* Options (for multiple choice) */}
                        {options.length > 0 && (
                          <div className="ml-14 space-y-2">
                            {options.map((option, optionIndex) => (
                              <div
                                key={optionIndex}
                                className="flex items-center gap-2 text-sm"
                              >
                                <div className="h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs text-muted-foreground">
                                    {String.fromCharCode(65 + optionIndex)}
                                  </span>
                                </div>
                                <span>{option}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Word definition (if available) */}
                        {question.word?.definition && (
                          <div className="ml-14 mt-2 p-3 rounded-md bg-muted text-sm">
                            <span className="font-medium">Definition: </span>
                            {question.word.definition}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No questions found for this test
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
