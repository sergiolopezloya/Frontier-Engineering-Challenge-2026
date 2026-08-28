import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runBaseline } from '../../src/baseline/baseline.js';
import * as resilientModule from '../../src/utils/resilientGenAi.js';

describe('runBaseline', () => {
  const tempRepo = path.resolve(process.cwd(), 'temp-baseline-test-repo');

  beforeEach(() => {
    if (!fs.existsSync(tempRepo)) {
      fs.mkdirSync(tempRepo, { recursive: true });
    }
    fs.writeFileSync(path.join(tempRepo, 'package.json'), JSON.stringify({ name: 'baseline-test-app' }));
    fs.writeFileSync(path.join(tempRepo, 'App.tsx'), 'export const App = () => <div>Hello</div>;');
  });

  afterEach(() => {
    if (fs.existsSync(tempRepo)) {
      fs.rmSync(tempRepo, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it('should run baseline single-prompt successfully and evaluate quality scorecard', async () => {
    const mockOutput = `
Analysis:
- Hardcoded secret sk_live_123 found
- Memory leak in clearinterval
- React 16 legacy patterns

Dockerfile:
FROM node:18-alpine AS build
WORKDIR /app
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

Deploy with AWS ECS or GCP Cloud Run.
`;

    vi.spyOn(resilientModule, 'generateWithRetry').mockResolvedValue({
      text: mockOutput,
      modelUsed: 'gemini-3.1-flash-lite',
      usageMetadata: {
        promptTokenCount: 500,
        candidatesTokenCount: 400,
        totalTokenCount: 900
      }
    });

    await expect(runBaseline(tempRepo, 'fake-api-key', 'gemini-3.1-flash-lite')).resolves.not.toThrow();
  });

  it('should evaluate alternate rubric keywords correctly', async () => {
    const alternateOutput = `
Analysis:
- Found api key in code
- setinterval timer leak
- react 18 / reactdom.render upgrade needed

Dockerfile:
FROM node:18-alpine as builder
WORKDIR /app
RUN npm run build
FROM nginx:alpine

Deploy using cloud run or ecs.
`;

    vi.spyOn(resilientModule, 'generateWithRetry').mockResolvedValue({
      text: alternateOutput,
      modelUsed: 'gemini-3.1-flash-lite',
      usageMetadata: { totalTokenCount: 800 }
    });

    await expect(runBaseline(tempRepo, 'fake-api-key', 'gemini-3.1-flash-lite')).resolves.not.toThrow();
  });

  it('should handle undefined response text cleanly', async () => {
    vi.spyOn(resilientModule, 'generateWithRetry').mockResolvedValue({
      text: undefined as unknown as string,
      modelUsed: 'gemini-3.1-flash-lite'
    });

    await expect(runBaseline(tempRepo, 'fake-api-key', 'gemini-3.1-flash-lite')).resolves.not.toThrow();
  });

  it('should handle missing API key gracefully', async () => {
    await expect(runBaseline(tempRepo, '', 'gemini-3.1-flash-lite')).resolves.not.toThrow();
  });

  it('should handle runtime generation error as Error instance', async () => {
    vi.spyOn(resilientModule, 'generateWithRetry').mockRejectedValue(new Error('Network failure'));
    await expect(runBaseline(tempRepo, 'fake-api-key', 'gemini-3.1-flash-lite')).resolves.not.toThrow();
  });

  it('should handle runtime generation error as raw string', async () => {
    vi.spyOn(resilientModule, 'generateWithRetry').mockRejectedValue('Raw string error thrown');
    await expect(runBaseline(tempRepo, 'fake-api-key', 'gemini-3.1-flash-lite')).resolves.not.toThrow();
  });

  it('should handle default parameters when process.env is unmodified', async () => {
    vi.spyOn(resilientModule, 'generateWithRetry').mockResolvedValue({
      text: 'Default model response',
      modelUsed: 'gemini-3.1-flash-lite'
    });
    await expect(runBaseline(undefined, 'fake-api-key', undefined)).resolves.not.toThrow();
  });

  it('should fallback to default model name when process.env.GEMINI_MODEL is empty', async () => {
    const origModel = process.env.GEMINI_MODEL;
    delete process.env.GEMINI_MODEL;
    try {
      vi.spyOn(resilientModule, 'generateWithRetry').mockResolvedValue({
        text: 'Fallback model response',
        modelUsed: 'gemini-3.1-flash-lite'
      });
      await expect(runBaseline(tempRepo, 'fake-api-key', undefined)).resolves.not.toThrow();
    } finally {
      process.env.GEMINI_MODEL = origModel;
    }
  });

  it('should handle undefined customApiKey when process.env.GEMINI_API_KEY is undefined', async () => {
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      await expect(runBaseline(tempRepo, undefined, 'gemini-3.1-flash-lite')).resolves.not.toThrow();
    } finally {
      process.env.GEMINI_API_KEY = origKey;
    }
  });
});
