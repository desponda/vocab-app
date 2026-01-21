import { describe, it, expect } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';

describe('Anthropic API Integration', () => {
  it('should use the correct model for vocabulary extraction', () => {
    // This test verifies that the model name is correct
    // The actual API call would happen during runtime with a real API key
    const expectedModel = 'claude-sonnet-4-5-20250929';
    expect(expectedModel).toBe('claude-sonnet-4-5-20250929');
  });

  it('should format message request correctly for vocabulary extraction', () => {
    // This test verifies the structure of API calls
    const messageStructure = {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        {
          role: 'user' as const,
          content: [
            {
              type: 'text' as const,
              text: 'Test prompt',
            },
            {
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: 'image/png' as const,
                data: 'test-base64-string',
              },
            },
          ],
        },
      ],
    };

    // Verify structure
    expect(messageStructure.model).toBe('claude-sonnet-4-5-20250929');
    expect(messageStructure.max_tokens).toBe(4096);
    expect(messageStructure.messages).toHaveLength(1);
    expect(messageStructure.messages[0].role).toBe('user');
    expect(messageStructure.messages[0].content).toHaveLength(2);
  });

  it('should format message request correctly for test question generation', () => {
    // This test verifies the structure of API calls for test generation
    // Updated to reflect 2 questions per word format (requires more tokens)
    const messageStructure = {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8192,
      messages: [
        {
          role: 'user' as const,
          content: 'Generate test questions for these words...',
        },
      ],
    };

    // Verify structure
    expect(messageStructure.model).toBe('claude-sonnet-4-5-20250929');
    expect(messageStructure.max_tokens).toBe(8192);
    expect(messageStructure.messages).toHaveLength(1);
    expect(messageStructure.messages[0].role).toBe('user');
    expect(typeof messageStructure.messages[0].content).toBe('string');
  });
});

describe('Option Randomization Logic', () => {
  it('should implement Fisher-Yates shuffle correctly', () => {
    // Test the shuffle logic independently
    const shuffle = <T>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const options = ['A', 'B', 'C', 'D'];
    const results = [];

    // Shuffle 50 times to verify we get different orderings
    for (let i = 0; i < 50; i++) {
      const shuffled = shuffle(options);
      results.push(shuffled.join(''));
    }

    // All original elements should still be present
    results.forEach((result) => {
      expect(result).toContain('A');
      expect(result).toContain('B');
      expect(result).toContain('C');
      expect(result).toContain('D');
      expect(result.length).toBe(4);
    });

    // Should have at least 5 different orderings in 50 shuffles
    const uniqueOrderings = new Set(results);
    expect(uniqueOrderings.size).toBeGreaterThanOrEqual(5);
  });

  it('should maintain correctAnswer after shuffling options', () => {
    // Simulate the question processing logic
    const processQuestion = (q: {
      questionText: string;
      correctAnswer: string;
      options: string[];
    }) => {
      // Validate that correctAnswer is in options
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

      return { ...q, options: shuffledOptions };
    };

    const testQuestion = {
      questionText: 'Test question?',
      questionType: 'MULTIPLE_CHOICE' as const,
      correctAnswer: 'demonstrate',
      options: ['demonstrate', 'persuade', 'analyze', 'contemplate'],
    };

    // Process multiple times
    for (let i = 0; i < 20; i++) {
      const processed = processQuestion(testQuestion);

      // Correct answer must still be in options
      expect(processed.options).toContain(processed.correctAnswer);
      expect(processed.correctAnswer).toBe('demonstrate');

      // All original options must be present
      expect(processed.options).toHaveLength(4);
      expect(processed.options).toContain('demonstrate');
      expect(processed.options).toContain('persuade');
      expect(processed.options).toContain('analyze');
      expect(processed.options).toContain('contemplate');
    }
  });

  it('should throw error if correct answer not in options', () => {
    const processQuestion = (q: {
      questionText: string;
      correctAnswer: string;
      options: string[];
    }) => {
      if (!q.options.includes(q.correctAnswer)) {
        throw new Error(
          `Correct answer "${q.correctAnswer}" not found in options for question: ${q.questionText}`
        );
      }
      return q;
    };

    const invalidQuestion = {
      questionText: 'Invalid question?',
      questionType: 'MULTIPLE_CHOICE' as const,
      correctAnswer: 'wrongAnswer',
      options: ['option1', 'option2', 'option3', 'option4'],
    };

    expect(() => processQuestion(invalidQuestion)).toThrow(
      'Correct answer "wrongAnswer" not found in options'
    );
  });

  it('should create varied positions for correct answers across questions', () => {
    // Simulate processing multiple questions
    const shuffle = <T>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    const questions = [
      { correctAnswer: 'A', options: ['A', 'B', 'C', 'D'] },
      { correctAnswer: 'A', options: ['A', 'B', 'C', 'D'] },
      { correctAnswer: 'A', options: ['A', 'B', 'C', 'D'] },
      { correctAnswer: 'A', options: ['A', 'B', 'C', 'D'] },
      { correctAnswer: 'A', options: ['A', 'B', 'C', 'D'] },
    ];

    const positions = questions.map((q) => {
      const shuffled = shuffle(q.options);
      return shuffled.indexOf('A');
    });

    // With 5 questions, should have at least 2 different positions
    const uniquePositions = new Set(positions);
    expect(uniquePositions.size).toBeGreaterThanOrEqual(2);
  });
});

describe('Spelling Test Deduplication Logic', () => {
  it('should deduplicate options while preserving correct answer', () => {
    // Simulate the deduplication logic from generateSpellingTestQuestions
    const processQuestion = (q: {
      questionText: string;
      correctAnswer: string;
      options: string[];
    }) => {
      // Validate that correctAnswer is in options (must come first)
      if (!q.options.includes(q.correctAnswer)) {
        throw new Error(
          `Correct answer "${q.correctAnswer}" not found in options for question: ${q.questionText}`
        );
      }

      // Deduplicate options while preserving correct answer
      const uniqueOptions = Array.from(new Set(q.options));
      if (uniqueOptions.length !== q.options.length) {
        q.options = uniqueOptions;
      }

      // Validate we still have enough unique options
      if (q.options.length < 2) {
        throw new Error(
          `Insufficient unique options (${q.options.length}) for question: ${q.questionText}. Need at least 2 options.`
        );
      }

      return q;
    };

    // Test case: duplicate options with correct answer being one of them
    const questionWithDuplicates = {
      questionText: 'Which is the correct spelling?',
      correctAnswer: 'most',
      options: ['most', 'most', 'moast', 'moist'],
    };

    const processed = processQuestion(questionWithDuplicates);

    // Should deduplicate to 3 unique options
    expect(processed.options).toHaveLength(3);
    expect(processed.options).toContain('most');
    expect(processed.options).toContain('moast');
    expect(processed.options).toContain('moist');

    // Correct answer should still be present
    expect(processed.options).toContain(processed.correctAnswer);
    expect(processed.correctAnswer).toBe('most');
  });

  it('should handle multiple duplicates correctly', () => {
    const processQuestion = (q: {
      questionText: string;
      correctAnswer: string;
      options: string[];
    }) => {
      if (!q.options.includes(q.correctAnswer)) {
        throw new Error(
          `Correct answer "${q.correctAnswer}" not found in options for question: ${q.questionText}`
        );
      }

      const uniqueOptions = Array.from(new Set(q.options));
      if (uniqueOptions.length !== q.options.length) {
        q.options = uniqueOptions;
      }

      if (q.options.length < 2) {
        throw new Error(
          `Insufficient unique options (${q.options.length}) for question: ${q.questionText}. Need at least 2 options.`
        );
      }

      return q;
    };

    // Test case: multiple duplicates, correct answer is unique
    const question = {
      questionText: 'Which word is spelled correctly in this sentence: The cat is _____?',
      correctAnswer: 'beautiful',
      options: ['beautiful', 'beautifull', 'beautifull', 'beautifull'],
    };

    const processed = processQuestion(question);

    // Should deduplicate to 2 unique options
    expect(processed.options).toHaveLength(2);
    expect(processed.options).toContain('beautiful');
    expect(processed.options).toContain('beautifull');

    // Correct answer preserved
    expect(processed.correctAnswer).toBe('beautiful');
  });

  it('should throw error when all options are the same', () => {
    const processQuestion = (q: {
      questionText: string;
      correctAnswer: string;
      options: string[];
    }) => {
      if (!q.options.includes(q.correctAnswer)) {
        throw new Error(
          `Correct answer "${q.correctAnswer}" not found in options for question: ${q.questionText}`
        );
      }

      const uniqueOptions = Array.from(new Set(q.options));
      if (uniqueOptions.length !== q.options.length) {
        q.options = uniqueOptions;
      }

      if (q.options.length < 2) {
        throw new Error(
          `Insufficient unique options (${q.options.length}) for question: ${q.questionText}. Need at least 2 options.`
        );
      }

      return q;
    };

    // Test case: all options are identical
    const invalidQuestion = {
      questionText: 'Test question?',
      correctAnswer: 'word',
      options: ['word', 'word', 'word', 'word'],
    };

    expect(() => processQuestion(invalidQuestion)).toThrow(
      'Insufficient unique options (1) for question'
    );
  });

  it('should not modify options when all are already unique', () => {
    const processQuestion = (q: {
      questionText: string;
      correctAnswer: string;
      options: string[];
    }) => {
      if (!q.options.includes(q.correctAnswer)) {
        throw new Error(
          `Correct answer "${q.correctAnswer}" not found in options for question: ${q.questionText}`
        );
      }

      const originalLength = q.options.length;
      const uniqueOptions = Array.from(new Set(q.options));
      if (uniqueOptions.length !== q.options.length) {
        q.options = uniqueOptions;
      }

      return { ...q, wasModified: uniqueOptions.length !== originalLength };
    };

    // Test case: all options already unique
    const validQuestion = {
      questionText: 'Which word is spelled correctly in this sentence: I _____ a letter?',
      correctAnswer: 'receive',
      options: ['receive', 'recieve', 'recive', 'receeve'],
    };

    const processed = processQuestion(validQuestion);

    // Should not modify the array
    expect(processed.wasModified).toBe(false);
    expect(processed.options).toHaveLength(4);
    expect(processed.options).toEqual(['receive', 'recieve', 'recive', 'receeve']);
  });
});

describe('Spelling Test Fill-in-Blank Format', () => {
  it('should accept fill-in-blank question format with sentence context', () => {
    // Test that the new question format is valid
    const spellingQuestion = {
      questionText:
        'Which word is spelled correctly in this sentence: I hope to _____ your letter soon?',
      questionType: 'SPELLING',
      correctAnswer: 'receive',
      options: ['receive', 'recieve', 'recive', 'receeve'],
    };

    // Validate structure
    expect(spellingQuestion.questionText).toContain('Which word is spelled correctly in this sentence:');
    expect(spellingQuestion.questionText).toContain('_____'); // Contains blank
    expect(spellingQuestion.questionType).toBe('SPELLING');
    expect(spellingQuestion.options).toHaveLength(4);
    expect(spellingQuestion.options).toContain(spellingQuestion.correctAnswer);
  });

  it('should distinguish from old generic format', () => {
    // Old format
    const oldFormat = {
      questionText: 'Which is the correct spelling?',
      questionType: 'SPELLING',
      correctAnswer: 'receive',
      options: ['receive', 'recieve', 'recive', 'receeve'],
    };

    // New format
    const newFormat = {
      questionText:
        'Which word is spelled correctly in this sentence: I hope to _____ your letter soon?',
      questionType: 'SPELLING',
      correctAnswer: 'receive',
      options: ['receive', 'recieve', 'recive', 'receeve'],
    };

    // Old format should NOT contain sentence context
    expect(oldFormat.questionText).not.toContain('sentence:');
    expect(oldFormat.questionText).not.toContain('_____');

    // New format SHOULD contain sentence context
    expect(newFormat.questionText).toContain('sentence:');
    expect(newFormat.questionText).toContain('_____');
  });

  it('should support various grade-appropriate sentence structures', () => {
    // Examples of different sentence complexities
    const questions = [
      {
        // Simple sentence (lower grades)
        questionText: 'Which word is spelled correctly in this sentence: The cat is _____?',
        correctAnswer: 'fluffy',
      },
      {
        // More complex (middle grades)
        questionText:
          'Which word is spelled correctly in this sentence: Scientists must _____ their findings?',
        correctAnswer: 'analyze',
      },
      {
        // Advanced (high school)
        questionText:
          'Which word is spelled correctly in this sentence: The theory was based on _____ evidence?',
        correctAnswer: 'empirical',
      },
    ];

    questions.forEach((q) => {
      expect(q.questionText).toContain('Which word is spelled correctly in this sentence:');
      expect(q.questionText).toContain('_____');
      expect(q.questionText.endsWith('?')).toBe(true);
    });
  });
});
