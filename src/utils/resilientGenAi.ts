import { GoogleGenAI } from '@google/genai';
import chalk from 'chalk';

export interface GenerationOptions {
  apiKey: string;
  primaryModel: string;
  fallbackModels?: string[];
  maxRetries?: number;
}

export interface ModelUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export interface GenerationResult {
  text: string;
  usageMetadata?: ModelUsageMetadata;
  modelUsed: string;
}

/**
 * Helper to safely extract error message from unknown error types.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    return JSON.stringify(error);
  }
  return String(error);
}

/**
 * Robust execution wrapper that handles temporary 503 (High Demand) / 429 (Rate Limit) errors
 * with exponential backoff and automatic model fallback.
 */
export async function generateWithRetry(
  ai: GoogleGenAI,
  primaryModel: string,
  prompt: string,
  fallbackModels: string[] = ['gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.5-flash-lite'],
  maxRetries: number = 3
): Promise<GenerationResult> {
  // Combine primary and fallbacks without duplicates
  const candidateModels: string[] = Array.from(new Set([primaryModel, ...fallbackModels]));

  let lastError: unknown = null;

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1 || model !== primaryModel) {
          console.log(chalk.gray(`  🔄 Requesting with model '${model}' (Attempt ${attempt}/${maxRetries})...`));
        }

        const response = await ai.models.generateContent({
          model,
          contents: prompt
        });

        return {
          text: response.text || '',
          usageMetadata: response.usageMetadata as ModelUsageMetadata | undefined,
          modelUsed: model
        };
      } catch (error: unknown) {
        lastError = error;
        const errorStr = getErrorMessage(error);
        const is503or429 =
          errorStr.includes('503') ||
          errorStr.includes('429') ||
          errorStr.includes('high demand') ||
          errorStr.includes('UNAVAILABLE') ||
          errorStr.includes('RESOURCE_EXHAUSTED');

        if (is503or429 && attempt < maxRetries) {
          const waitMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
          console.log(chalk.yellow(`  ⚠️ Model '${model}' high demand (503/429). Retrying in ${waitMs / 1000}s...`));
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        } else {
          // Break to next candidate model if available
          break;
        }
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error(getErrorMessage(lastError) || 'All model candidates exhausted.');
}
