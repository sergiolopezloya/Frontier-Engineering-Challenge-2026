import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import { TrajectoryLogger } from '../logger/trajectoryLogger.js';

export interface SandboxWriteRequest {
  targetPath: string;
  relativePath: string;
  content: string;
  description: string;
}

export class SandboxGate {
  private logger: TrajectoryLogger;

  constructor(logger: TrajectoryLogger) {
    this.logger = logger;
  }

  /**
   * Prompts the user in terminal to approve or reject a proposed file creation or modification.
   * Enforces Hackathon Ground Rule 04: Human approval for consequential actions.
   */
  public async requestApproval(request: SandboxWriteRequest): Promise<boolean> {
    console.log(chalk.bold.yellow('\n──────────────────────────────────────────────────────────────'));
    console.log(chalk.bold.cyan('🛡️  SANDBOX APPROVAL GATE (HUMAN-IN-THE-LOOP)'));
    console.log(chalk.bold.yellow('──────────────────────────────────────────────────────────────'));
    console.log(`Action: ${chalk.bold.white('Write/Modify File')}`);
    console.log(`Target: ${chalk.green.bold(request.relativePath)}`);
    console.log(`Description: ${request.description}`);
    console.log(chalk.gray('Preview of content to be written:'));
    console.log(chalk.gray('┌─────────────────────────────────────────────────────────────'));
    
    // Print preview lines
    const lines = request.content.split('\n');
    const previewLines = lines.slice(0, 15);
    for (const line of previewLines) {
      console.log(chalk.gray('│ ') + line);
    }
    if (lines.length > 15) {
      console.log(chalk.gray(`│ ... [${lines.length - 15} more lines hidden]`));
    }
    console.log(chalk.gray('└─────────────────────────────────────────────────────────────'));

    this.logger.recordStep(
      'SandboxGate',
      'HUMAN_APPROVAL_REQUEST',
      `Requested human approval to write ${request.relativePath}`,
      {
        toolName: 'sandbox_file_writer',
        toolInput: {
          file: request.relativePath,
          description: request.description,
          contentLength: request.content.length
        }
      }
    );

    const approved = await this.promptYesNo(
      chalk.bold.yellow(`\n👉 Do you approve creating/modifying '${request.relativePath}'? (y/N): `)
    );

    this.logger.recordStep(
      'SandboxGate',
      'HUMAN_APPROVAL_RESPONSE',
      approved ? `User approved writing ${request.relativePath}` : `User rejected writing ${request.relativePath}`,
      {
        humanApproved: approved,
        feedback: approved ? 'Approved by user via terminal CLI' : 'Rejected by user via terminal CLI'
      }
    );

    return approved;
  }

  /**
   * Writes the file only if human approved.
   */
  public async writeApprovedFile(request: SandboxWriteRequest): Promise<boolean> {
    const approved = await this.requestApproval(request);

    if (!approved) {
      console.log(chalk.bold.red(`❌ Action rejected by user. Skipped writing '${request.relativePath}'.\n`));
      return false;
    }

    const dir = path.dirname(request.targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(request.targetPath, request.content, 'utf-8');
    console.log(chalk.bold.green(`✔ File successfully written to: ${request.relativePath}\n`));
    return true;
  }

  private promptYesNo(question: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        const trimmed = answer.trim().toLowerCase();
        resolve(trimmed === 'y' || trimmed === 'yes');
      });
    });
  }
}
