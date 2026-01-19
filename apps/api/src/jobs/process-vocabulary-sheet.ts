import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma';
import { downloadFile, uploadFile } from '../lib/minio';
import { extractVocabulary, generateTestQuestions } from '../lib/claude';
import { VocabularyProcessingJob } from '../lib/queue';
import { config } from '../lib/config';

// Parse Redis URL to extract connection details
// This will only be used if the worker is started (which requires Redis)
const connection = config.redisUrl ? (() => {
  const redisUrl = new URL(config.redisUrl);
  return {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port || '6379'),
  };
})() : {
  host: 'localhost',
  port: 6379,
};

/**
 * Test variant labels (A, B, C, D, etc.)
 */
const TEST_VARIANTS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

/**
 * Process vocabulary sheet: extract words and generate tests
 */
async function processVocabularySheet(job: Job<VocabularyProcessingJob>) {
  const { sheetId } = job.data;

  console.log(`[Job ${job.id}] Processing vocabulary sheet: ${sheetId}`);

  try {
    // Get vocabulary sheet from database
    const sheet = await prisma.vocabularySheet.findUnique({
      where: { id: sheetId },
      select: {
        id: true,
        name: true,
        s3Key: true,
        mimeType: true,
        gradeLevel: true,
        testsToGenerate: true,
      },
    });

    if (!sheet) {
      throw new Error(`Vocabulary sheet ${sheetId} not found`);
    }

    // Update status to PROCESSING
    await prisma.vocabularySheet.update({
      where: { id: sheetId },
      data: { status: 'PROCESSING' },
    });

    // Download file from MinIO
    console.log(`[Job ${job.id}] Downloading file from MinIO: ${sheet.s3Key}`);
    const fileBuffer = await downloadFile(sheet.s3Key);

    // Extract vocabulary using Claude Vision API
    console.log(`[Job ${job.id}] Extracting vocabulary with Claude Vision API`);
    await job.updateProgress(20);
    const extractionResult = await extractVocabulary(fileBuffer, sheet.mimeType);

    console.log(
      `[Job ${job.id}] Extracted ${extractionResult.vocabulary.length} vocab words and ${extractionResult.spelling.length} spelling words`
    );

    // Save processed/compressed image to MinIO so teachers can download it
    let processedS3Key: string | null = null;
    if (extractionResult.processedImage) {
      const extension = extractionResult.processedImage.mimeType === 'image/png' ? 'png' : 'jpg';
      processedS3Key = sheet.s3Key.replace(/\.[^.]+$/, `_processed.${extension}`); // e.g., userId/file_processed.png
      console.log(`[Job ${job.id}] Saving processed image to MinIO: ${processedS3Key}`);

      await uploadFile(
        processedS3Key,
        extractionResult.processedImage.buffer,
        { 'Content-Type': extractionResult.processedImage.mimeType }
      );

      console.log(`[Job ${job.id}] Processed image saved: ${processedS3Key}`);
    }

    // Combine all words (vocab + spelling) for database storage
    const allWords = [
      ...extractionResult.vocabulary.map((v) => ({
        word: v.word,
        definition: v.definition,
        context: v.context,
      })),
      ...extractionResult.spelling.map((word) => ({
        word,
        definition: undefined as string | undefined,
        context: undefined as string | undefined,
      })),
    ];

    if (allWords.length === 0) {
      throw new Error('No words extracted from the vocabulary sheet');
    }

    // TODO: Future enhancement - Generate different test types
    // - Vocabulary words → definition/context-based tests (current implementation)
    // - Spelling words → spelling/fill-in-the-blank tests (to be implemented)
    // For now, only vocabulary words with definitions are used for test generation.
    // Spelling words are saved to database but not used in tests yet.

    // Only use vocabulary words (with definitions) for test generation
    const vocabularyWordsForTests = extractionResult.vocabulary.map((v) => ({
      word: v.word,
      definition: v.definition,
      context: v.context,
    }));

    if (vocabularyWordsForTests.length === 0) {
      throw new Error(
        'No vocabulary words with definitions found. Please upload a document with vocabulary words that include definitions or example sentences.'
      );
    }

    console.log(
      `[Job ${job.id}] Using ${vocabularyWordsForTests.length} vocabulary words for test generation` +
      (extractionResult.spelling.length > 0
        ? ` (${extractionResult.spelling.length} spelling words saved but not used in tests yet)`
        : '')
    );

    // Save all words to database (vocabulary + spelling)
    console.log(`[Job ${job.id}] Saving ${allWords.length} words to database`);
    await job.updateProgress(40);

    await prisma.vocabularyWord.createMany({
      data: allWords.map((word) => ({
        word: word.word,
        definition: word.definition,
        context: word.context,
        sheetId: sheet.id,
      })),
    });

    // Generate test variants using only vocabulary words
    const testsToGenerate = Math.min(sheet.testsToGenerate, TEST_VARIANTS.length);
    console.log(`[Job ${job.id}] Generating ${testsToGenerate} test variants`);

    for (let i = 0; i < testsToGenerate; i++) {
      const variant = TEST_VARIANTS[i];
      const progressPercent = 40 + ((i + 1) / testsToGenerate) * 50;
      await job.updateProgress(progressPercent);

      console.log(`[Job ${job.id}] Generating test variant ${variant}`);

      // Generate questions using Claude (2 questions per word)
      // Pass grade level for age-appropriate difficulty
      // Only use vocabulary words with definitions for test generation
      const questions = await generateTestQuestions(vocabularyWordsForTests, variant, sheet.gradeLevel);

      if (questions.length === 0) {
        console.warn(`[Job ${job.id}] No questions generated for variant ${variant}, skipping`);
        continue;
      }

      // Create test record
      const test = await prisma.test.create({
        data: {
          name: `${sheet.name} - Variant ${variant}`,
          variant,
          sheetId: sheet.id,
        },
      });

      // Get vocabulary word IDs for linking
      const vocabularyWords = await prisma.vocabularyWord.findMany({
        where: { sheetId: sheet.id },
        select: { id: true, word: true },
      });

      const wordMap = new Map(vocabularyWords.map((w) => [w.word.toLowerCase(), w.id]));

      // Save questions to database
      const questionsData = questions.map((q, index) => {
        // Find word ID by matching:
        // 1. For sentence completion: correctAnswer is the word
        // 2. For definition matching: extract word from question text
        let wordId = wordMap.get(q.correctAnswer.toLowerCase());

        if (!wordId) {
          // Try to extract word from question text for definition matching questions
          const match = q.questionText.match(/word ['"](.+?)['"]/i);
          if (match && match[1]) {
            wordId = wordMap.get(match[1].toLowerCase());
          }
        }

        // Fallback: use round-robin assignment
        if (!wordId) {
          wordId = vocabularyWords[Math.floor(index / 2) % vocabularyWords.length]?.id;
        }

        return {
          questionText: q.questionText,
          questionType: q.questionType,
          correctAnswer: q.correctAnswer,
          options: JSON.stringify(q.options), // Always has options now
          orderIndex: q.orderIndex || index,
          testId: test.id,
          wordId: wordId || vocabularyWords[0]!.id, // Final fallback to first word
        };
      });

      await prisma.testQuestion.createMany({
        data: questionsData,
      });

      console.log(`[Job ${job.id}] Created test variant ${variant} with ${questions.length} questions`);
    }

    // Update status to COMPLETED
    await prisma.vocabularySheet.update({
      where: { id: sheetId },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        processedS3Key,
      },
    });

    await job.updateProgress(100);
    console.log(`[Job ${job.id}] Successfully processed vocabulary sheet: ${sheetId}`);

    return { success: true, sheetId, wordsExtracted: allWords.length, testsGenerated: testsToGenerate };
  } catch (error) {
    console.error(`[Job ${job.id}] Error processing vocabulary sheet:`, error);

    // Update status to FAILED
    await prisma.vocabularySheet.update({
      where: { id: sheetId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
      },
    });

    throw error;
  }
}

/**
 * Create and start the vocabulary processing worker
 */
export function createVocabularyWorker() {
  const worker = new Worker<VocabularyProcessingJob>('vocabulary-processing', processVocabularySheet, {
    connection,
    concurrency: 2, // Process 2 sheets at a time
    limiter: {
      max: 10, // Max 10 jobs
      duration: 60000, // Per minute (rate limiting for Claude API)
    },
  });

  worker.on('completed', (job) => {
    console.log(`✓ Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`✗ Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  console.log('Vocabulary processing worker started');

  return worker;
}
