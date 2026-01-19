import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import { config } from './config';

if (!config.anthropicApiKey) {
  console.warn('ANTHROPIC_API_KEY not configured. Claude Vision API features will be disabled.');
}

const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey || 'dummy-key',
});

/**
 * Supported image formats for Claude Vision API
 */
const SUPPORTED_IMAGE_FORMATS = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/**
 * Convert buffer to a format supported by Claude Vision API
 */
async function ensureSupportedFormat(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  if (SUPPORTED_IMAGE_FORMATS.includes(mimeType)) {
    return { buffer, mimeType };
  }

  // Convert to PNG if not in supported format
  const convertedBuffer = await sharp(buffer).png().toBuffer();
  return { buffer: convertedBuffer, mimeType: 'image/png' };
}

/**
 * Compress image to stay under Claude API's 5MB limit
 * Target 4MB to leave buffer for base64 encoding overhead
 */
async function compressImageIfNeeded(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const MAX_SIZE = 4 * 1024 * 1024; // 4MB target (Claude limit is 5MB)

  if (buffer.length <= MAX_SIZE) {
    return { buffer, mimeType };
  }

  console.log(`Image size ${(buffer.length / 1024 / 1024).toFixed(2)}MB exceeds 4MB, compressing...`);

  // Start with original image metadata
  const image = sharp(buffer);
  const metadata = await image.metadata();

  let quality = 85;
  let width = metadata.width;
  let compressedBuffer = buffer;

  // Iteratively compress until under limit
  while (compressedBuffer.length > MAX_SIZE && quality > 20) {
    // Try reducing quality first
    if (quality > 50) {
      quality -= 15;
    } else if (quality > 30) {
      quality -= 10;
    } else {
      quality -= 5;
    }

    // If still too large and quality is getting low, also resize
    if (compressedBuffer.length > MAX_SIZE && quality < 60 && width && width > 1920) {
      width = Math.floor(width * 0.8);
    }

    // Apply compression
    const compressor = sharp(buffer);

    if (width && width !== metadata.width) {
      compressor.resize(width, null, { withoutEnlargement: true });
    }

    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      compressedBuffer = await compressor.jpeg({ quality }).toBuffer();
    } else {
      // Convert to JPEG for better compression
      compressedBuffer = await compressor.jpeg({ quality }).toBuffer();
      mimeType = 'image/jpeg';
    }

    console.log(`Compressed to ${(compressedBuffer.length / 1024 / 1024).toFixed(2)}MB (quality: ${quality}${width !== metadata.width ? `, width: ${width}px` : ''})`);
  }

  if (compressedBuffer.length > MAX_SIZE) {
    console.warn(`Warning: Could not compress image below 4MB. Final size: ${(compressedBuffer.length / 1024 / 1024).toFixed(2)}MB`);
  }

  return { buffer: compressedBuffer, mimeType };
}

/**
 * Convert PDF to image (first page only)
 * For now, we'll use sharp to handle PDFs if possible
 * In production, consider using pdf-poppler or similar
 */
async function convertPdfToImage(pdfBuffer: Buffer): Promise<Buffer> {
  try {
    // Sharp can handle some PDFs directly
    const imageBuffer = await sharp(pdfBuffer, { density: 200 }).png().toBuffer();
    return imageBuffer;
  } catch (error) {
    throw new Error(
      `Failed to convert PDF to image. PDFs may require additional dependencies. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

interface VocabularyExtractionResult {
  vocabulary: Array<{
    word: string;
    definition: string;
    context?: string;
  }>;
  spelling: string[];
}

/**
 * Extract vocabulary from image using Claude Vision API
 * Handles photos, PDFs (converted to images), screenshots - any format
 */
export async function extractVocabulary(
  imageBuffer: Buffer,
  mimeType: string
): Promise<VocabularyExtractionResult> {
  if (!config.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Handle PDF conversion
  let processedBuffer = imageBuffer;
  let processedMimeType = mimeType;

  if (mimeType === 'application/pdf') {
    processedBuffer = await convertPdfToImage(imageBuffer);
    processedMimeType = 'image/png';
  }

  // Ensure image is in supported format
  const { buffer: formattedBuffer, mimeType: formattedMimeType } = await ensureSupportedFormat(
    processedBuffer,
    processedMimeType
  );

  // Compress if needed to stay under Claude API's 5MB limit
  const { buffer: finalBuffer, mimeType: finalMimeType } = await compressImageIfNeeded(
    formattedBuffer,
    formattedMimeType
  );

  const base64Image = finalBuffer.toString('base64');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: finalMimeType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `Analyze this vocabulary/spelling sheet image.

TASK: Extract all words, identifying which are vocabulary (with definitions) and which are spelling words.

INSTRUCTIONS:
1. Look for visual section markers: "Vocab", "Vocabulary", "Spelling", headers, boxes, etc.
2. Vocabulary words typically have definitions or example sentences
3. Spelling words are typically just word lists
4. Extract definitions and context where available
5. Handle handwritten and printed text
6. Preserve the distinction between vocab and spelling sections
7. If you see numbered/lettered words with explanations, those are vocabulary
8. If you see plain word lists, those are spelling words

Return ONLY valid JSON (no markdown code blocks, no explanation):
{
  "vocabulary": [
    {"word": "example", "definition": "a thing characteristic of its kind", "context": "optional example sentence"}
  ],
  "spelling": ["word1", "word2"]
}`,
          },
        ],
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse JSON response (Claude might wrap it in markdown code blocks)
  let jsonText = textContent.text.trim();

  // Remove markdown code blocks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  try {
    const result = JSON.parse(jsonText);

    // Validate the structure
    if (!result.vocabulary || !Array.isArray(result.vocabulary)) {
      result.vocabulary = [];
    }
    if (!result.spelling || !Array.isArray(result.spelling)) {
      result.spelling = [];
    }

    return result;
  } catch (parseError) {
    console.error('Failed to parse Claude response:', jsonText);
    throw new Error(`Failed to parse vocabulary extraction result: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
}

interface TestQuestion {
  questionText: string;
  questionType: 'MULTIPLE_CHOICE';
  correctAnswer: string;
  options: string[]; // Always 4 options for multiple choice
  orderIndex: number;
}

/**
 * Generate test questions from vocabulary words
 * Creates exactly 2 multiple choice questions per word:
 * 1. Sentence completion: "Which word best fits in this sentence: ___?"
 * 2. Definition matching: "Which definition best matches the word ___?"
 * Questions are randomized in order.
 *
 * @param words - Array of vocabulary words with definitions and context
 * @param testVariant - Test variant identifier (A, B, C, etc.)
 * @param gradeLevel - Optional grade level (1-12) for age-appropriate difficulty
 */
export async function generateTestQuestions(
  words: Array<{ word: string; definition?: string; context?: string }>,
  testVariant: string,
  gradeLevel?: number | null
): Promise<TestQuestion[]> {
  if (!config.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  if (words.length === 0) {
    return [];
  }

  // Format words for Claude
  const wordsText = words
    .map((w, i) => `${i + 1}. ${w.word}${w.definition ? ` - ${w.definition}` : ''}${w.context ? ` (Context: ${w.context})` : ''}`)
    .join('\n');

  // Build grade level guidance
  const gradeLevelGuidance = gradeLevel
    ? `
TARGET GRADE LEVEL: ${gradeLevel}
Adjust question difficulty and language complexity for grade ${gradeLevel} students:
${gradeLevel <= 3 ? '- Use simple, short sentences (under 10 words)\n- Use very common, everyday vocabulary\n- Avoid complex sentence structures\n- Use concrete examples' : ''}${gradeLevel >= 4 && gradeLevel <= 6 ? '- Use clear, straightforward language\n- Moderate sentence length (10-15 words)\n- Use grade-appropriate vocabulary\n- Include some context clues' : ''}${gradeLevel >= 7 && gradeLevel <= 9 ? '- Use more sophisticated vocabulary\n- Longer, more complex sentences (15-20 words)\n- Include abstract concepts where appropriate\n- Require deeper comprehension' : ''}${gradeLevel >= 10 ? '- Use advanced academic language\n- Complex sentence structures\n- Sophisticated vocabulary and concepts\n- Require critical thinking and nuanced understanding' : ''}
`
    : '';

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: `Generate test questions from these vocabulary words for Test Variant ${testVariant}.

VOCABULARY WORDS:
${wordsText}
${gradeLevelGuidance}
CRITICAL REQUIREMENTS:
1. Create EXACTLY 2 multiple choice questions per vocabulary word
2. Question Type 1: SENTENCE COMPLETION
   - Format: "Which word best fits in this sentence: [sentence with blank]?"
   - Create a natural sentence using the word's definition/context
   - The sentence should make the correct answer clear to students who know the word
   - Example: "Which word best fits in this sentence: The scientist had to _____ her theory with evidence?"

3. Question Type 2: DEFINITION MATCHING
   - Format: "Which definition best matches the word '[word]'?"
   - Provide 4 definitions, one correct and 3 plausible but incorrect
   - Make distractors believable but clearly wrong for students who studied
   - Example: "Which definition best matches the word 'demonstrate'?"

4. For ALL questions:
   - Include exactly 4 options (1 correct + 3 distractors)
   - Make distractors plausible (use other words from the list when possible)
   - Ensure questions are age-appropriate and clear
   - Use varied sentence structures across questions
   - Correct answer must always be included in options array

5. Each test variant should have different sentences/distractors
6. DO NOT include orderIndex - we'll randomize after generation

Return ONLY valid JSON (no markdown, no explanation):
{
  "questions": [
    {
      "questionText": "Which word best fits in this sentence: The teacher asked students to _____ their understanding by explaining the concept?",
      "questionType": "MULTIPLE_CHOICE",
      "correctAnswer": "demonstrate",
      "options": ["demonstrate", "persuade", "analyze", "contemplate"]
    },
    {
      "questionText": "Which definition best matches the word 'demonstrate'?",
      "questionType": "MULTIPLE_CHOICE",
      "correctAnswer": "to show clearly or prove",
      "options": ["to show clearly or prove", "to convince someone of something", "to examine in detail", "to think deeply about"]
    }
  ]
}`,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse JSON response
  let jsonText = textContent.text.trim();

  // Remove markdown code blocks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }

  try {
    const result = JSON.parse(jsonText);

    if (!result.questions || !Array.isArray(result.questions)) {
      throw new Error('Invalid response format: missing questions array');
    }

    // Validate we have exactly 2 questions per word
    const expectedQuestionCount = words.length * 2;
    if (result.questions.length !== expectedQuestionCount) {
      console.warn(
        `Expected ${expectedQuestionCount} questions (2 per word), got ${result.questions.length}. Proceeding anyway.`
      );
    }

    // Randomize question order AND shuffle options for each question
    const shuffledQuestions = result.questions
      .map((q: any) => {
        // Validate that correctAnswer is in options
        if (!q.options || !Array.isArray(q.options)) {
          throw new Error(`Question missing options array: ${q.questionText}`);
        }
        if (!q.options.includes(q.correctAnswer)) {
          throw new Error(
            `Correct answer "${q.correctAnswer}" not found in options for question: ${q.questionText}`
          );
        }

        // Shuffle the options array using Fisher-Yates algorithm
        const shuffledOptions = [...q.options];
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
        }

        return { ...q, options: shuffledOptions, sort: Math.random() };
      })
      .sort((a: any, b: any) => a.sort - b.sort)
      .map((q: any, index: number) => {
        const { sort, ...question } = q;
        return { ...question, orderIndex: index };
      });

    return shuffledQuestions;
  } catch (parseError) {
    console.error('Failed to parse Claude test generation response:', jsonText);
    throw new Error(`Failed to parse test generation result: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
}
