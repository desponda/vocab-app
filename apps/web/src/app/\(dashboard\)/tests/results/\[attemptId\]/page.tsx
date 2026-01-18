'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { testsApi, TestAttempt } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function TestResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken } = useAuth();
  const attemptId = params.attemptId as string;

  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !attemptId) return;

    const fetchAttempt = async () => {
      try {
        setIsLoading(true);
        // Note: This endpoint isn't fully implemented in the backend yet
        // For now, attempting to fetch via the API we have
        const data = await testsApi.getAttempt(attemptId, '', accessToken);
        setAttempt(data.attempt);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch test results:', err);
        setError('Failed to load test results. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttempt();
  }, [accessToken, attemptId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-3 text-muted-foreground">Loading test results...</p>
      </div>
    );
  }

  if (error || !attempt) {
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
            <p className="text-sm text-muted-foreground">{error || 'Results not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/tests')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tests
        </Button>
      </div>

      {/* Score Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Test</p>
              <p className="font-semibold">{attempt.test?.name}</p>
              <p className="text-xs text-muted-foreground">Variant {attempt.test?.variant}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Score</p>
              <p className="text-4xl font-bold text-blue-600">{attempt.score}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Correct</p>
              <p className="text-3xl font-bold text-green-600">
                {attempt.correctAnswers}/{attempt.totalQuestions}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Completed</p>
              <p className="text-sm">
                {attempt.completedAt
                  ? format(new Date(attempt.completedAt), 'MMM d, yyyy h:mm a')
                  : 'In Progress'}
              </p>
            </div>
          </div>

          {/* Performance Assessment */}
          <div className="pt-4 border-t">
            {attempt.score! >= 90 && (
              <p className="text-sm font-medium text-green-700 bg-green-50 p-3 rounded">
                ✨ Excellent work! You've demonstrated mastery of this material.
              </p>
            )}
            {attempt.score! >= 80 && attempt.score! < 90 && (
              <p className="text-sm font-medium text-blue-700 bg-blue-50 p-3 rounded">
                🎉 Great job! You're showing solid understanding.
              </p>
            )}
            {attempt.score! >= 70 && attempt.score! < 80 && (
              <p className="text-sm font-medium text-amber-700 bg-amber-50 p-3 rounded">
                👍 Good effort! Review the questions you missed to strengthen your understanding.
              </p>
            )}
            {attempt.score! < 70 && (
              <p className="text-sm font-medium text-orange-700 bg-orange-50 p-3 rounded">
                📚 Keep practicing! Review the material and try again to improve your score.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Answer Review */}
      {attempt.answers && attempt.answers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Answer Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attempt.answers.map((answer, idx) => (
              <div
                key={answer.id}
                className={`p-4 border rounded-lg ${
                  answer.isCorrect
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-1">
                    {answer.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">
                        Question {idx + 1}
                      </p>
                      <Badge
                        variant={answer.isCorrect ? 'default' : 'destructive'}
                      >
                        {answer.isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mt-2">
                      Your answer: <span className="font-medium">{answer.answer}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Answered {format(new Date(answer.answeredAt), 'h:mm:ss a')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <div className="flex gap-2">
        <Button onClick={() => router.push('/tests')} className="flex-1">
          Back to My Tests
        </Button>
      </div>
    </div>
  );
}
