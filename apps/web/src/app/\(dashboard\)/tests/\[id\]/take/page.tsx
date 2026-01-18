'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { testsApi, TestDetail, TestAttempt, TestQuestion } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, AlertCircle, Send, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function TakeTestPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { accessToken } = useAuth();

  const testId = params.id as string;
  const studentId = searchParams.get('studentId') as string;

  const [test, setTest] = useState<TestDetail | null>(null);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Initialize test
  useEffect(() => {
    if (!accessToken || !testId || !studentId) return;

    const initializeTest = async () => {
      try {
        setIsLoading(true);

        // Get test details
        const testData = await testsApi.get(testId, accessToken);
        setTest(testData.test);

        // Start attempt
        const attemptData = await testsApi.startAttempt(testId, studentId, accessToken);
        setAttempt(attemptData.attempt);

        setError(null);
      } catch (err) {
        console.error('Failed to initialize test:', err);
        if (err instanceof Error && err.message.includes('already in progress')) {
          setError('You already have an attempt in progress for this test. Complete or refresh to continue.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load test');
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeTest();
  }, [accessToken, testId, studentId]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmitAnswer = async () => {
    if (!attempt || !test || currentQuestionIndex >= test.questions!.length) return;

    const question = test.questions![currentQuestionIndex];
    const answer = answers[question.id] || '';

    if (!answer.trim()) {
      alert('Please enter an answer');
      return;
    }

    setIsSubmitting(true);
    try {
      await testsApi.submitAnswer(attempt.id, question.id, answer, accessToken!);

      // Move to next question or finish
      if (currentQuestionIndex < test.questions!.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        // Test complete
        const completed = await testsApi.completeAttempt(attempt.id, accessToken!);
        setAttempt(completed.attempt);
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      alert(err instanceof Error ? err.message : 'Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishTest = async () => {
    if (!attempt) return;

    if (!confirm('Are you sure you want to finish the test? You cannot go back and change your answers.')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const completed = await testsApi.completeAttempt(attempt.id, accessToken!);
      setAttempt(completed.attempt);
    } catch (err) {
      console.error('Failed to complete test:', err);
      alert(err instanceof Error ? err.message : 'Failed to complete test');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-3 text-muted-foreground">Loading test...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/tests')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tests
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Error</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!test || !attempt) {
    return null;
  }

  // Test completed - show results
  if (attempt.status !== 'IN_PROGRESS') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/tests')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tests
          </Button>
        </div>

        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle className="h-6 w-6" />
              Test Completed!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-green-600 font-medium">Correct</p>
                <p className="text-3xl font-bold text-green-700">{attempt.correctAnswers}</p>
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Total</p>
                <p className="text-3xl font-bold text-green-700">{attempt.totalQuestions}</p>
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Score</p>
                <p className="text-3xl font-bold text-green-700">{attempt.score}%</p>
              </div>
            </div>

            <div className="pt-4 border-t border-green-200">
              <p className="text-sm text-green-700">
                Completed at {format(new Date(attempt.completedAt!), 'MMM d, yyyy h:mm a')}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => router.push(`/tests/results/${attempt.id}`)}
                className="flex-1"
              >
                Review Answers
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/tests')}
                className="flex-1"
              >
                Back to Tests
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active test - show current question
  const questions = test.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id] || '';
  const answeredCount = Object.keys(answers).length;
  const allQuestionsAnswered = answeredCount === questions.length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">
            Question {currentQuestionIndex + 1} of {questions.length}
          </h3>
          <Badge variant="outline">
            Answers: {Object.keys(answers).length} / {questions.length}
          </Badge>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{
              width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{currentQuestion.questionText}</CardTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Type: {currentQuestion.questionType}
            {currentQuestion.word && ` • Word: ${currentQuestion.word.word}`}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Multiple choice options if applicable */}
          {currentQuestion.questionType === 'MULTIPLE_CHOICE' && currentQuestion.options ? (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Select your answer:</Label>
              <div className="space-y-2">
                {JSON.parse(currentQuestion.options).map((option: string, idx: number) => (
                  <Button
                    key={idx}
                    variant={currentAnswer === option ? 'default' : 'outline'}
                    className="w-full justify-start text-base h-auto py-3 px-4"
                    onClick={() => handleAnswerChange(currentQuestion.id, option)}
                    disabled={isSubmitting}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="answer">Your Answer</Label>
              <Input
                id="answer"
                placeholder="Enter your answer..."
                value={currentAnswer}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmitAnswer();
                  }
                }}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              disabled={currentQuestionIndex === 0 || isSubmitting}
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
            >
              Previous
            </Button>

            {currentQuestionIndex < questions.length - 1 ? (
              <Button
                onClick={handleSubmitAnswer}
                disabled={!currentAnswer.trim() || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Next Question
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-2 flex-1">
                {!allQuestionsAnswered && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    ⚠️ You have {questions.length - answeredCount} unanswered question{questions.length - answeredCount !== 1 ? 's' : ''}. Answer all questions before finishing.
                  </p>
                )}
                <Button
                  onClick={handleFinishTest}
                  disabled={!allQuestionsAnswered || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Finishing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Finish Test
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
