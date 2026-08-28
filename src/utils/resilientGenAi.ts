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
 * Robust execution wrapper that handles temporary 503 (High Demand) / 429 (Rate Limit) / 404 (Model not found)
 * with exponential backoff and automatic model fallback.
 */
export async function generateWithRetry(
  ai: GoogleGenAI,
  primaryModel: string,
  prompt: string,
  fallbackModels: string[] = [
    'gemini-3.7-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite'
  ],
  maxRetries: number = 3
): Promise<GenerationResult> {
  // Combine primary and fallbacks without duplicates
  const candidateModels: string[] = Array.from(new Set([primaryModel, ...fallbackModels]));

  let lastError: unknown = null;

  for (const model of candidateModels) {
    console.log(chalk.cyan(`  🚀 Invoking model: '${model}'`));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(chalk.gray(`  🔄 Retrying '${model}' (Attempt ${attempt}/${maxRetries})...`));
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
        const errorStr: string = getErrorMessage(error);
        const is503or429: boolean =
          errorStr.includes('503') ||
          errorStr.includes('429') ||
          errorStr.includes('high demand') ||
          errorStr.includes('UNAVAILABLE') ||
          errorStr.includes('RESOURCE_EXHAUSTED');
        const is404NotFound: boolean =
          errorStr.includes('404') || errorStr.includes('NOT_FOUND') || errorStr.includes('is not found');

        if (is404NotFound) {
          console.log(chalk.red(`  ❌ Model '${model}' was not found (404 NOT_FOUND). Switching to next candidate...`));
          break; // Don't retry a non-existent model name, move immediately to next candidate
        }

        if (is503or429 && attempt < maxRetries) {
          const waitMs: number = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
          console.log(chalk.yellow(`  ⚠️ Model '${model}' high demand (503/429). Retrying in ${waitMs / 1000}s...`));
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        } else {
          console.log(chalk.gray(`  ⚠️ Model '${model}' failed. Trying next available model in fallback list...`));
          break;
        }
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  const fallbackMsg = lastError ? getErrorMessage(lastError) : 'All model candidates exhausted.';
  throw new Error(fallbackMsg);
}
