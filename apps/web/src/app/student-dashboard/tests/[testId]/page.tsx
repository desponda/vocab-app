'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  testsApi,
  studentsApi,
  type TestAttempt,
  type Student,
  type TestQuestion,
  type TestDetail
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

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
  const [results, setResults] = useState<TestAttempt | null>(null);

  // Redirect if not authenticated or not a student
  useEffect(() => {
    if (!isAuthLoading && (!user || user.role !== 'STUDENT')) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // Load student and start test attempt
  useEffect(() => {
    if (!accessToken || !user) return;

    const startTest = async () => {
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

        // Create test attempt
        const attemptData = await testsApi.createAttempt(
          testId,
          userStudent.id,
          accessToken
        );

        setAttempt(attemptData.attempt as TestAttemptWithQuestions);
        setQuestions(attemptData.attempt.test.questions || []);
      } catch (err) {
        console.error('Error starting test:', err);
        setError('Failed to start test. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    startTest();
  }, [testId, accessToken, user]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!attempt || !student) return;

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
    } finally {
      setIsSubmitting(false);
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
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
        <Button onClick={() => router.push('/student-dashboard')} variant="outline">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Show results after submission
  if (results) {
    const percentage = results.totalQuestions
      ? Math.round((results.score! / results.totalQuestions) * 100)
      : 0;

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
                {results.score} out of {results.totalQuestions} correct
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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{attempt.test.name}</h2>
          <p className="text-sm text-muted-foreground">
            Variant {attempt.test.variant}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">
            Question {currentQuestionIndex + 1} of {questions.length}
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
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
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
    </div>
  );
}
