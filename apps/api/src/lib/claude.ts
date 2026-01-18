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
  const { buffer: finalBuffer, mimeType: finalMimeType } = await ensureSupportedFormat(
    processedBuffer,
    processedMimeType
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
  questionType: 'SPELLING' | 'DEFINITION' | 'FILL_BLANK' | 'MULTIPLE_CHOICE';
  correctAnswer: string;
  options?: string[]; // For multiple choice
  orderIndex: number;
}

/**
 * Generate test questions from vocabulary words
 * Creates varied question types for engaging tests
 */
export async function generateTestQuestions(
  words: Array<{ word: string; definition?: string; context?: string }>,
  testVariant: string,
  questionCount: number = 10
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

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Generate ${questionCount} test questions from these vocabulary words for Test Variant ${testVariant}.

VOCABULARY WORDS:
${wordsText}

INSTRUCTIONS:
1. Create a mix of question types:
   - SPELLING: "Spell the word that means: [definition]"
   - DEFINITION: "What does [word] mean?"
   - FILL_BLANK: "Complete the sentence: The [blank] was magnificent."
   - MULTIPLE_CHOICE: "Which word means [definition]?" with 4 options

2. Ensure questions are age-appropriate and clear
3. For MULTIPLE_CHOICE, include 3 plausible distractors
4. Vary the question types for engagement
5. Each variant should have different questions

Return ONLY valid JSON (no markdown, no explanation):
{
  "questions": [
    {
      "questionText": "Spell the word that means: very impressive",
      "questionType": "SPELLING",
      "correctAnswer": "magnificent",
      "orderIndex": 0
    },
    {
      "questionText": "What does 'demonstrate' mean?",
      "questionType": "DEFINITION",
      "correctAnswer": "to show clearly",
      "orderIndex": 1
    },
    {
      "questionText": "Which word means 'to convince someone'?",
      "questionType": "MULTIPLE_CHOICE",
      "correctAnswer": "persuade",
      "options": ["persuade", "analyze", "explore", "demonstrate"],
      "orderIndex": 2
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

    return result.questions;
  } catch (parseError) {
    console.error('Failed to parse Claude test generation response:', jsonText);
    throw new Error(`Failed to parse test generation result: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
  }
}
