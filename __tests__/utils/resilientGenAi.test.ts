import { describe, it, expect, vi } from 'vitest';
import { GoogleGenAI } from '@google/genai';
import { generateWithRetry } from '../../src/utils/resilientGenAi.js';

describe('resilientGenAi', () => {
  it('should return generation response directly if primary model succeeds', async () => {
    const mockAi = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: 'Hello world',
          usageMetadata: { totalTokenCount: 100 }
        })
      }
    } as unknown as GoogleGenAI;

    const result = await generateWithRetry(mockAi, 'gemini-3.7-flash', 'Test prompt');
    expect(result.text).toBe('Hello world');
    expect(result.modelUsed).toBe('gemini-3.7-flash');
    expect(result.usageMetadata?.totalTokenCount).toBe(100);
  });

  it('should handle undefined response.text by defaulting to empty string', async () => {
    const mockAi = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: undefined,
          usageMetadata: { totalTokenCount: 50 }
        })
      }
    } as unknown as GoogleGenAI;

    const result = await generateWithRetry(mockAi, 'gemini-3.7-flash', 'Test prompt');
    expect(result.text).toBe('');
  });

  it('should retry on 503 high demand and succeed on second attempt', async () => {
    const mockAi = {
      models: {
        generateContent: vi
          .fn()
          .mockRejectedValueOnce({ message: '503 UNAVAILABLE: high demand' })
          .mockResolvedValueOnce({
            text: 'Recovered response',
            usageMetadata: { totalTokenCount: 150 }
          })
      }
    } as unknown as GoogleGenAI;

    const result = await generateWithRetry(mockAi, 'gemini-3.7-flash', 'Test prompt', [], 2);
    expect(result.text).toBe('Recovered response');
    expect(result.modelUsed).toBe('gemini-3.7-flash');
  });

  it('should handle 503 error on final retry attempt and move to fallback', async () => {
    const mockAi = {
      models: {
        generateContent: vi.fn().mockRejectedValue({ message: '503 UNAVAILABLE: high demand' })
      }
    } as unknown as GoogleGenAI;

    await expect(generateWithRetry(mockAi, 'model-503', 'Prompt', [], 1)).rejects.toThrow('503 UNAVAILABLE');
  });

  it('should immediately switch to fallback on 404 NOT_FOUND without retry', async () => {
    const mockAi = {
      models: {
        generateContent: vi.fn().mockImplementation(({ model }) => {
          if (model === 'invalid-model') {
            return Promise.reject(new Error('404 NOT_FOUND: model is not found'));
          }
          return Promise.resolve({
            text: 'Fallback success',
            usageMetadata: { totalTokenCount: 200 }
          });
        })
      }
    } as unknown as GoogleGenAI;

    const result = await generateWithRetry(mockAi, 'invalid-model', 'Test prompt', ['gemini-3.7-flash']);
    expect(result.text).toBe('Fallback success');
    expect(result.modelUsed).toBe('gemini-3.7-flash');
  });

  it('should throw error when all candidate models are exhausted', async () => {
    const mockAi = {
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error('Fatal API Error'))
      }
    } as unknown as GoogleGenAI;

    await expect(generateWithRetry(mockAi, 'model-a', 'Prompt', ['model-b'], 1)).rejects.toThrow('Fatal API Error');
  });

  it('should handle non-Error thrown objects correctly', async () => {
    const mockAi = {
      models: {
        generateContent: vi.fn().mockRejectedValue('String error thrown')
      }
    } as unknown as GoogleGenAI;

    await expect(generateWithRetry(mockAi, 'model-a', 'Prompt', [], 1)).rejects.toThrow('String error thrown');
  });

  it('should handle empty candidate list with fallback error message', async () => {
    const mockAi = {
      models: {
        generateContent: vi.fn()
      }
    } as unknown as GoogleGenAI;

    // Passing empty model name and empty candidates
    await expect(generateWithRetry(mockAi, '', 'Prompt', [], 0)).rejects.toThrow('All model candidates exhausted.');
  });
});
