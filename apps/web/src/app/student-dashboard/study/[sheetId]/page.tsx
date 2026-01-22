'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Flashcard } from '@/components/study/flashcard';
import { ConfidenceButtons } from '@/components/study/confidence-buttons';
import { StudySummaryDialog } from '@/components/study/study-summary-dialog';
import { studyApi, studentsApi, Student } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

interface VocabularyWord {
  id: string;
  word: string;
  definition: string | null;
  context: string | null;
  confidence: number;
  studyCount: number;
  lastStudiedAt: string | null;
}

interface StudyStats {
  total: number;
  mastered: number;
  notYet: number;
  notSeen: number;
}

export default function StudyPage({ params }: { params: { sheetId: string } }) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [stats, setStats] = useState<StudyStats>({
    total: 0,
    mastered: 0,
    notYet: 0,
    notSeen: 0,
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const currentWord = words[currentIndex];
  const progressPercent = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;

  // Fetch student and words on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) return;

      try {
        setIsLoading(true);

        // Get the student record
        const { students } = await studentsApi.list(accessToken);

        if (students.length === 0) {
          toast.error('No student record found');
          router.push('/student-dashboard');
          return;
        }

        const userStudent = students[0];
        setStudent(userStudent);

        // Fetch words for this vocabulary sheet
        const response = await studyApi.getWords(params.sheetId, userStudent.id, accessToken);

        // Sort words: not seen first, then not yet, then mastered
        const sortedWords = [...response.words].sort((a, b) => {
          if (a.confidence === b.confidence) return 0;
          if (a.confidence === 0) return -1;
          if (b.confidence === 0) return 1;
          if (a.confidence === 1) return -1;
          if (b.confidence === 1) return 1;
          return 0;
        });

        setWords(sortedWords);
        setStats(response.stats);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load study session');
        router.push('/student-dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.sheetId, accessToken, router]);

  // Handle card flip
  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // Handle confidence rating
  const handleConfidence = useCallback(
    async (confidence: 1 | 2) => {
      if (!student || !accessToken || !currentWord) return;

      try {
        setIsUpdating(true);

        // Update confidence on backend
        await studyApi.updateConfidence(currentWord.id, student.id, confidence, accessToken);

        // Update local state
        setWords((prevWords) =>
          prevWords.map((w) =>
            w.id === currentWord.id
              ? {
                  ...w,
                  confidence,
                  studyCount: w.studyCount + 1,
                  lastStudiedAt: new Date().toISOString(),
                }
              : w
          )
        );

        // Update stats
        setStats((prevStats) => {
          const newStats = { ...prevStats };
          if (currentWord.confidence === 0) {
            newStats.notSeen -= 1;
          } else if (currentWord.confidence === 1) {
            newStats.notYet -= 1;
          } else if (currentWord.confidence === 2) {
            newStats.mastered -= 1;
          }

          if (confidence === 1) {
            newStats.notYet += 1;
          } else if (confidence === 2) {
            newStats.mastered += 1;
          }

          return newStats;
        });

        // Move to next card after a short delay
        setTimeout(() => {
          if (currentIndex < words.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            setIsFlipped(false);
          } else {
            // All cards reviewed - show summary
            setShowSummary(true);
          }
          setIsUpdating(false);
        }, 300);
      } catch (error) {
        console.error('Failed to update confidence:', error);
        toast.error('Failed to save progress');
        setIsUpdating(false);
      }
    },
    [student, accessToken, currentWord, currentIndex, words.length]
  );

  // Handle study again
  const handleStudyAgain = useCallback(() => {
    // Reset to first card
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowSummary(false);

    // Re-sort words to prioritize non-mastered
    const sortedWords = [...words].sort((a, b) => {
      if (a.confidence === b.confidence) return 0;
      if (a.confidence === 0) return -1;
      if (b.confidence === 0) return 1;
      if (a.confidence === 1) return -1;
      if (b.confidence === 1) return 1;
      return 0;
    });
    setWords(sortedWords);
  }, [words]);

  // Handle done
  const handleDone = useCallback(() => {
    router.push('/student-dashboard');
  }, [router]);

  // Handle close with confirmation
  const handleClose = useCallback(() => {
    if (confirm('Leave study session? Your progress has been saved.')) {
      router.push('/student-dashboard');
    }
  }, [router]);

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">No words to study yet.</p>
          <Button onClick={() => router.push('/student-dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <span className="text-sm font-medium">
              Card {currentIndex + 1} / {words.length}
            </span>
            <div className="flex-1 max-w-xs">
              <Progress value={progressPercent} className="h-2" />
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {stats.mastered}/{stats.total} mastered
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleClose}
            className="ml-2"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Flashcard Area */}
      <div className="flex-1 flex items-center justify-center p-4 pb-24 md:pb-4">
        {currentWord && (
          <Flashcard
            word={currentWord.word}
            definition={currentWord.definition}
            context={currentWord.context}
            isFlipped={isFlipped}
            onFlip={handleFlip}
          />
        )}
      </div>

      {/* Confidence Buttons */}
      <ConfidenceButtons
        visible={isFlipped}
        onNotYet={() => handleConfidence(1)}
        onGotIt={() => handleConfidence(2)}
        disabled={isUpdating}
      />

      {/* Summary Dialog */}
      <StudySummaryDialog
        open={showSummary}
        stats={stats}
        sheetId={params.sheetId}
        onStudyAgain={handleStudyAgain}
        onDone={handleDone}
      />
    </div>
  );
}
