'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { ApiError, testsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

interface ReviewData {
  attempt: {
    id: string;
    score: number | null;
    correctAnswers: number | null;
    totalQuestions: number;
    completedAt: string | null;
    test: {
      id: string;
      name: string;
      variant: string;
      sheet?: {
        id: string;
        name: string;
        originalName: string;
      };
    };
  };
  questions: Array<{
    id: string;
    questionText: string;
    questionType: string;
    orderIndex: number;
    options: string[] | null;
    correctAnswer: string;
    studentAnswer: string | null;
    isCorrect: boolean;
    word?: {
      id: string;
      word: string;
      definition: string | null;
    };
  }>;
}

export default function TestResultsPage() {
  const router = useRouter();
  const params = useParams();
  const { user, accessToken, isLoading } = useAuth();
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState(true);

  const attemptId = params?.attemptId as string;

  // Redirect if not authenticated or not a student
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'STUDENT')) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Load review data
  useEffect(() => {
    if (!accessToken || !attemptId) return;

    const loadReviewData = async () => {
      try {
        setIsLoadingData(true);
        setError('');

        const data = await testsApi.getAttemptReview(attemptId, accessToken);
        setReviewData(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load test results');
        }
        console.error('Error loading review data:', err);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadReviewData();
  }, [attemptId, accessToken]);

  if (isLoading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (isLoadingData) {
    return (
      <div className="space-y-8">
        <div className="text-center text-muted-foreground">Loading test results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
        <Link href="/student-dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="space-y-8">
        <div className="text-center text-muted-foreground">No results found</div>
        <Link href="/student-dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const { attempt, questions } = reviewData;
  const score = attempt.score ?? 0;
  const correctAnswers = attempt.correctAnswers ?? 0;

  // Determine badge variant based on score
  const scoreBadgeVariant =
    score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'outline';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/student-dashboard">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Test Results</h2>
        <p className="text-muted-foreground">
          Review your answers and see where you can improve
        </p>
      </div>

      {/* Score Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl">{attempt.test.name}</CardTitle>
              <CardDescription>
                {attempt.test.sheet?.originalName || 'Vocabulary Test'} - Variant {attempt.test.variant}
              </CardDescription>
            </div>
            <Badge variant={scoreBadgeVariant} className="text-lg px-4 py-2">
              {score}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-green-600">{correctAnswers}</div>
              <div className="text-sm text-muted-foreground">Correct Answers</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-600">
                {attempt.totalQuestions - correctAnswers}
              </div>
              <div className="text-sm text-muted-foreground">Incorrect Answers</div>
            </div>
          </div>
          {attempt.completedAt && (
            <div className="mt-4 text-center text-xs text-muted-foreground">
              Completed: {new Date(attempt.completedAt).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions Review */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Question-by-Question Review</h3>
        {questions.map((question, index) => {
          const isCorrect = question.isCorrect;
          const hasAnswer = question.studentAnswer !== null;

          return (
            <Card
              key={question.id}
              className={
                isCorrect
                  ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950'
                  : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
              }
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono">
                        Q{index + 1}
                      </Badge>
                      {isCorrect ? (
                        <Badge className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Correct
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-3 w-3" />
                          Incorrect
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{question.questionText}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Multiple Choice Options */}
                {question.options && question.options.length > 0 ? (
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => {
                      const isStudentAnswer = option === question.studentAnswer;
                      const isCorrectAnswer = option === question.correctAnswer;

                      return (
                        <div
                          key={optionIndex}
                          className={`flex items-center gap-2 p-3 rounded-md border ${
                            isCorrectAnswer
                              ? 'border-green-500 bg-green-100 dark:bg-green-900/30'
                              : isStudentAnswer
                              ? 'border-red-500 bg-red-100 dark:bg-red-900/30'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex-1">
                            <span className="font-medium mr-2">
                              {String.fromCharCode(65 + optionIndex)}.
                            </span>
                            {option}
                          </div>
                          {isCorrectAnswer && (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                          {isStudentAnswer && !isCorrectAnswer && (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Non-multiple choice answers */
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">
                        Your Answer:
                      </div>
                      <div
                        className={`p-3 rounded-md border ${
                          isCorrect
                            ? 'border-green-500 bg-green-100 dark:bg-green-900/30'
                            : 'border-red-500 bg-red-100 dark:bg-red-900/30'
                        }`}
                      >
                        {hasAnswer ? (
                          <span className="font-medium">{question.studentAnswer}</span>
                        ) : (
                          <span className="text-muted-foreground italic">No answer provided</span>
                        )}
                      </div>
                    </div>
                    {!isCorrect && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          Correct Answer:
                        </div>
                        <div className="p-3 rounded-md border border-green-500 bg-green-100 dark:bg-green-900/30">
                          <span className="font-medium">{question.correctAnswer}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Word Info (if available) */}
                {question.word && question.word.definition && (
                  <div className="mt-4 p-3 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900">
                    <div className="text-sm">
                      <span className="font-semibold">Word: </span>
                      {question.word.word}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {question.word.definition}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Back Button */}
      <div className="flex justify-center pt-8">
        <Link href="/student-dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
