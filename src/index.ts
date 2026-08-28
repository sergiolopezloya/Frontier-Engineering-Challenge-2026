import * as path from 'node:path';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { MultiAgentOrchestrator } from './orchestration/workflow.js';

dotenv.config();

const API_KEY: string | undefined = process.env.GEMINI_API_KEY;
const MODEL_NAME: string = process.env.GEMINI_MODEL || 'gemini-3.7-flash';

async function main(): Promise<void> {
  if (!API_KEY) {
    console.error(chalk.red.bold('\n❌ Error: GEMINI_API_KEY environment variable is not set in .env'));
    process.exit(1);
  }

  // Target repository path (default: sample-react-app)
  const targetRepo: string = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.resolve(process.cwd(), 'test-repos/sample-react-app');

  const orchestrator: MultiAgentOrchestrator = new MultiAgentOrchestrator({
    targetRepoPath: targetRepo,
    apiKey: API_KEY,
    modelName: MODEL_NAME
  });

  try {
    await orchestrator.run();
  } catch (error: unknown) {
    const errorMsg: string = error instanceof Error ? error.message : String(error);
    console.error(chalk.red.bold(`\n💥 Fatal Pipeline Error: ${errorMsg}`));
    process.exit(1);
  }
}

main();
