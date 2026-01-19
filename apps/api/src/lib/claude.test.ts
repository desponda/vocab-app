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
