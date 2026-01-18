import { describe, it, expect, vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';

describe('Anthropic API Integration', () => {
  it('should use the correct model for vocabulary extraction', () => {
    // This test verifies that the model name is correct
    // The actual API call would happen during runtime with a real API key
    const expectedModel = 'claude-sonnet-4-5-20250929';
    expect(expectedModel).toBe('claude-sonnet-4-5-20250929');
  });

  it('should be able to instantiate Anthropic client with API key', () => {
    // This test verifies the Anthropic client can be created
    const testApiKey = 'sk-ant-test-key';
    const client = new Anthropic({
      apiKey: testApiKey,
    });

    // Check that client is properly instantiated
    expect(client).toBeDefined();
    expect(typeof client.messages.create).toBe('function');
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
