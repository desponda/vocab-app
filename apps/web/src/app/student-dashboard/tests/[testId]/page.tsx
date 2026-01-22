'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  testsApi,
  studentsApi,
  type TestAttempt,
  type Student,
  type TestQuestion,
  type TestDetail,
  ApiError,
} from '@/lib/api';
import { Error500 } from '@/components/error/http-errors';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { StagingErrorAccordion } from '@/components/debug/staging-error-accordion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import debounce from 'lodash.debounce';

interface TestAttemptWithQuestions extends TestAttempt {
  test: TestDetail;
}

export default function TakeTestPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;
  const { user, accessToken, isLoading: isAuthLoading } = useAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [attempt, setAttempt] = useState<TestAttemptWithQuestions | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [detailedError, setDetailedError] = useState<Error | Record<string, unknown> | string | null>(null);
  const { handleError } = useErrorHandler({ showToast: false });
  const [results, setResults] = useState<TestAttempt | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isResumed, setIsResumed] = useState(false);
  const [showUnansweredWarning, setShowUnansweredWarning] = useState(false);
  const [unansweredCount, setUnansweredCount] = useState(0);

  // Debounced auto-save function
  const saveAnswerDebounced = useRef(
    debounce(async (attemptId: string, questionId: string, answer: string, token: string) => {
      try {
        setIsSaving(true);
        await testsApi.submitAnswer(attemptId, questionId, answer, token);
        setLastSaved(new Date());
      } catch (err) {
        console.error('Error auto-saving answer:', err);
      } finally {
        setIsSaving(false);
      }
    }, 500)
  ).current;

  // Debounced progress update function (reduces API calls by ~50%)
  const saveProgressDebounced = useRef(
    debounce(async (attemptId: string, questionIndex: number, token: string) => {
      try {
        await testsApi.updateProgress(attemptId, questionIndex, token);
      } catch (err) {
        console.error('Error saving progress:', err);
      }
    }, 1000) // 1 second debounce (longer than answer save)
  ).current;

  // Cleanup debounced functions on unmount
  useEffect(() => {
    return () => {
      saveAnswerDebounced.cancel?.();
      saveProgressDebounced.cancel?.();
    };
  }, [saveAnswerDebounced, saveProgressDebounced]);

  // Redirect if not authenticated or not a student
  useEffect(() => {
    if (!isAuthLoading && (!user || user.role !== 'STUDENT')) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // Load student and start test attempt
  const startTest = async () => {
    if (!accessToken || !user) return;

    try {
      setIsLoading(true);
      setError('');

      // Get student record
      const { students } = await studentsApi.list(accessToken);
      if (students.length === 0) {
        setError('No student record found. Please contact your teacher.');
        setIsLoading(false);
        return;
      }

      const userStudent = students[0];
      setStudent(userStudent);

      // Create test attempt (or resume existing)
      const attemptData = await testsApi.createAttempt(
        testId,
        userStudent.id,
        accessToken
      );

      setAttempt(attemptData.attempt as TestAttemptWithQuestions);
      setQuestions(attemptData.attempt.test.questions || []);

      // Resume detection and state restoration
      if (attemptData.resumed) {
        setIsResumed(true);

        // Restore saved answers
        const answerMap: Record<string, string> = {};
        attemptData.attempt.answers?.forEach((ans) => {
          answerMap[ans.questionId] = ans.answer;
        });
        setAnswers(answerMap);

        // Restore question position
        const savedIndex = attemptData.attempt.currentQuestionIndex ?? 0;
        setCurrentQuestionIndex(savedIndex);
      }
    } catch (err) {
      handleError(err, 'Failed to load test');
      setError(err instanceof ApiError ? err.message : 'Failed to load test');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    startTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, accessToken, user]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    // Update local state immediately (optimistic update)
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));

    // Trigger debounced auto-save
    if (attempt && accessToken) {
      saveAnswerDebounced(attempt.id, questionId, answer, accessToken);
    }
  };

  const handleNext = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);

      // Save progress with debounce (reduces API calls by ~50%)
      if (attempt && accessToken) {
        saveProgressDebounced(attempt.id, nextIndex, accessToken);
      }
    }
  };

  const handlePrevious = async () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);

      // Save progress with debounce (reduces API calls by ~50%)
      if (attempt && accessToken) {
        saveProgressDebounced(attempt.id, prevIndex, accessToken);
      }
    }
  };

  const handleSubmit = async () => {
    if (!attempt || !student) return;

    // Check for unanswered questions
    const unanswered = questions.filter(q => !answers[q.id] || answers[q.id].trim() === '').length;

    if (unanswered > 0) {
      setUnansweredCount(unanswered);
      setShowUnansweredWarning(true);
      return;
    }

    // Proceed with submission
    await doSubmit();
  };

  const doSubmit = async () => {
    if (!attempt || !student) return;

    setShowUnansweredWarning(false);
    setIsSubmitting(true);
    try {
      // Build answers array
      const answersArray = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id] || '',
      }));

      // Submit test
      const result = await testsApi.submitAttempt(
        attempt.id,
        { answers: answersArray },
        student.id,
        accessToken!
      );

      setResults(result.attempt);
    } catch (err) {
      console.error('Error submitting test:', err);
      setError('Failed to submit test. Please try again.');
      // Capture full error for staging debug
      setDetailedError(err as Error | Record<string, unknown> | string);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewUnanswered = () => {
    setShowUnansweredWarning(false);
    // Find first unanswered question
    const firstUnanswered = questions.findIndex(q => !answers[q.id] || answers[q.id].trim() === '');
    if (firstUnanswered !== -1) {
      setCurrentQuestionIndex(firstUnanswered);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading test...</p>
        </div>
      </div>
    );
  }

  if (error && !attempt) {
    return <Error500 preserveLayout={true} onRetry={() => window.location.reload()} />;
  }

  // Show results after submission
  if (results) {
    // Score is already a percentage (0-100), no need to recalculate
    const percentage = results.score ?? 0;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Test Complete!</CardTitle>
            <CardDescription>
              You have successfully completed {attempt?.test.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-6xl font-bold text-primary">
                {percentage}%
              </p>
              <p className="text-lg text-muted-foreground">
                {results.correctAnswers ?? 0} out of {results.totalQuestions} correct
              </p>
            </div>

            <div className="pt-4">
              <Button
                onClick={() => router.push('/student-dashboard')}
                className="w-full"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!attempt || questions.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        No questions available for this test.
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Parse options for multiple choice questions
  const questionOptions = currentQuestion.options
    ? JSON.parse(currentQuestion.options) as string[]
    : [];

  // Calculate time since last save for UI
  const getTimeSinceLastSave = () => {
    if (!lastSaved) return null;
    const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Resume Banner */}
      {isResumed && (
        <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-4 text-blue-800 dark:text-blue-200">
          <p className="text-sm font-medium">
            Test resumed - Your previous answers and progress have been restored.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{attempt.test.name}</h2>
          <p className="text-sm text-muted-foreground">
            Variant {attempt.test.variant}
          </p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm font-medium">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
          {/* Auto-save indicator */}
          <p className="text-xs text-muted-foreground">
            {isSaving ? (
              <span>Saving...</span>
            ) : lastSaved ? (
              <span>Saved {getTimeSinceLastSave()}</span>
            ) : null}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <Progress value={progressPercent} className="h-2" />

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Question {currentQuestionIndex + 1}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Question Text */}
          <div>
            <p className="text-lg font-medium mb-4">{currentQuestion.questionText}</p>
          </div>

          {/* Multiple Choice Options */}
          {questionOptions.length > 0 ? (
            <div className="space-y-3">
              <Label>Select your answer:</Label>
              <div className="grid gap-3">
                {questionOptions.map((option, index) => {
                  const isSelected = answers[currentQuestion.id] === option;
                  return (
                    <Button
                      key={index}
                      variant={isSelected ? "default" : "outline"}
                      className="w-full justify-start text-left h-auto min-h-[3rem] px-4 py-3"
                      onClick={() => handleAnswerChange(currentQuestion.id, option)}
                    >
                      <span className="font-semibold mr-3">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <span className="flex-1">{option}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* No options - old test format no longer supported */
            <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 p-4 text-amber-800 dark:text-amber-200">
              <p className="font-semibold mb-2">⚠️ Incompatible Test Format</p>
              <p className="text-sm">
                This test was created with an older format and is no longer supported.
                Please ask your teacher to assign a new test.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="space-y-4">
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
          {/* Staging-only detailed error info */}
          {detailedError && (
            <StagingErrorAccordion
              error={detailedError}
              context="Test submission failed on iPad"
            />
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <Button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          variant="outline"
          className="w-32"
        >
          Previous
        </Button>

        {isLastQuestion ? (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-32"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Test'}
          </Button>
        ) : (
          <Button onClick={handleNext} className="w-32">
            Next
          </Button>
        )}
      </div>

      {/* Answer Progress Indicator */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          {Object.keys(answers).filter((key) => answers[key]?.trim()).length} of{' '}
          {questions.length} questions answered
        </p>
      </div>

      {/* Unanswered Questions Warning Dialog */}
      <Dialog open={showUnansweredWarning} onOpenChange={setShowUnansweredWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Unanswered Questions</DialogTitle>
            <DialogDescription>
              You have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Unanswered questions will count as incorrect (0 points).
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Would you like to review them before submitting?
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleReviewUnanswered} className="w-full sm:w-auto">
              Review Unanswered
            </Button>
            <Button onClick={doSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? 'Submitting...' : 'Submit Anyway'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
