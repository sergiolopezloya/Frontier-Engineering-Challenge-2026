import * as fs from 'node:fs';
import * as path from 'node:path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import chalk from 'chalk';
import { TrajectoryLogger } from '../logger/trajectoryLogger.js';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

async function runBaseline() {
  console.log(chalk.bold.blue('======================================================'));
  console.log(chalk.bold.blue('  🚀 RUNNING HACKATHON BASELINE (SINGLE PROMPT PIPELINE)'));
  console.log(chalk.bold.blue('======================================================\n'));

  const targetRepo = path.resolve(process.cwd(), 'test-repos/sample-react-app');
  const logger = new TrajectoryLogger('Baseline_Single_Prompt_Run', targetRepo, 'BASELINE');

  logger.recordStep(
    'BaselineRunner',
    'GOAL_DEFINED',
    'Execute rudimentary single-prompt baseline on sample React app',
    { thought: 'Evaluating simple 1-shot LLM capability without specialized tools or multi-agent orchestration.' }
  );

  // 1. Gather repository context
  const filesToRead = [
    'package.json',
    'src/App.tsx',
    'src/index.tsx',
    'vite.config.ts'
  ];

  let codebaseContext = '';
  for (const relPath of filesToRead) {
    const fullPath = path.join(targetRepo, relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      codebaseContext += `\n--- FILE: ${relPath} ---\n${content}\n`;
    }
  }

  logger.recordStep(
    'BaselineRunner',
    'THOUGHT',
    'Concatenated all raw source code files into a single prompt string',
    { thought: 'Naive context stuffing into a single request without indexing, AST, or separation of concerns.' }
  );

  // 2. Rudimentary Baseline Prompt
  const baselinePrompt = `
You are a coding assistant. Analyze this React codebase and provide a Dockerfile for production:

${codebaseContext}

Provide your analysis and the Dockerfile.
`.trim();

  logger.recordStep(
    'BaselineRunner',
    'TOOL_CALL',
    `Call Gemini API (${MODEL_NAME}) with single unrefined prompt`,
    {
      toolName: 'GoogleGenAI.generateContent',
      toolInput: { model: MODEL_NAME, promptLength: baselinePrompt.length }
    }
  );

  if (!API_KEY) {
    const errorMsg = 'GEMINI_API_KEY environment variable is missing. Please set it in .env file.';
    logger.recordStep('BaselineRunner', 'ERROR', errorMsg, { error: errorMsg });
    logger.finalize('FAILED: Missing GEMINI_API_KEY', { durationMs: 0 });
    console.error(chalk.red.bold(`\n❌ Error: ${errorMsg}`));
    process.exit(1);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const startTime = Date.now();

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: baselinePrompt
    });

    const duration = Date.now() - startTime;
    const rawOutput = response.text || '';
    const usage = response.usageMetadata;

    logger.recordStep(
      'BaselineRunner',
      'TOOL_RESPONSE',
      'Received single-shot response from Gemini API',
      {
        toolOutput: {
          promptTokenCount: usage?.promptTokenCount,
          candidatesTokenCount: usage?.candidatesTokenCount,
          totalTokenCount: usage?.totalTokenCount
        }
      }
    );

    // 3. Automated Rubric Evaluation Checklist
    const evaluationChecklist = {
      detectedHardcodedSecret: rawOutput.toLowerCase().includes('sk_live') || rawOutput.toLowerCase().includes('secret') || rawOutput.toLowerCase().includes('api key'),
      detectedMemoryLeak: rawOutput.toLowerCase().includes('clearinterval') || rawOutput.toLowerCase().includes('memory leak') || rawOutput.toLowerCase().includes('setinterval'),
      detectedLegacyReact16: rawOutput.toLowerCase().includes('react 16') || rawOutput.toLowerCase().includes('react 18') || rawOutput.toLowerCase().includes('reactdom.render'),
      providedMultiStageDockerfile: rawOutput.includes('AS build') || rawOutput.includes('as builder') || rawOutput.includes('as build-stage'),
      providedNginxConfig: rawOutput.toLowerCase().includes('nginx.conf') || rawOutput.includes('nginx:alpine'),
      providedCloudDeploymentScripts: rawOutput.toLowerCase().includes('aws') || rawOutput.toLowerCase().includes('gcp') || rawOutput.toLowerCase().includes('cloud run') || rawOutput.toLowerCase().includes('ecs')
    };

    const passedChecks = Object.values(evaluationChecklist).filter(Boolean).length;
    const totalChecks = Object.keys(evaluationChecklist).length;
    const scorePct = Math.round((passedChecks / totalChecks) * 100);

    const outcomeSummary = `Baseline single-shot run completed. Passed ${passedChecks}/${totalChecks} quality criteria (${scorePct}%). Latency: ${duration}ms.`;

    logger.recordStep(
      'BaselineRunner',
      'FINAL_RESPONSE',
      outcomeSummary,
      {
        finalContent: rawOutput,
        feedback: JSON.stringify(evaluationChecklist, null, 2)
      }
    );

    logger.finalize(outcomeSummary, {
      durationMs: duration,
      totalPromptTokens: usage?.promptTokenCount,
      totalCandidatesTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount
    });

    console.log(chalk.bold.yellow('\n--- BASELINE EVALUATION SCORECARD ---'));
    console.log(`⏱ Latency: ${duration}ms`);
    console.log(`📊 Tokens: ${usage?.totalTokenCount || 'N/A'}`);
    console.log(`🎯 Quality Score: ${passedChecks}/${totalChecks} (${scorePct}%)`);
    console.table(evaluationChecklist);

    console.log(chalk.cyan('\n--- GENERATED BASELINE OUTPUT PREVIEW ---'));
    console.log(rawOutput.slice(0, 500) + '...\n');

  } catch (error: any) {
    const errorMsg = error.message || String(error);
    logger.recordStep('BaselineRunner', 'ERROR', errorMsg, { error: errorMsg });
    logger.finalize(`FAILED: ${errorMsg}`);
    console.error(chalk.red.bold(`\n❌ Execution failed: ${errorMsg}`));
  }
}

runBaseline();
