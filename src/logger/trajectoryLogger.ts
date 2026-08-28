import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';

export type StepAction =
  | 'GOAL_DEFINED'
  | 'THOUGHT'
  | 'TOOL_CALL'
  | 'TOOL_RESPONSE'
  | 'HUMAN_APPROVAL_REQUEST'
  | 'HUMAN_APPROVAL_RESPONSE'
  | 'FINAL_RESPONSE'
  | 'ERROR';

export interface TrajectoryStep {
  stepIndex: number;
  timestamp: string;
  agentName: string;
  action: StepAction;
  summary: string;
  details: {
    thought?: string;
    toolName?: string;
    toolInput?: Record<string, unknown>;
    toolOutput?: string | Record<string, unknown>;
    humanApproved?: boolean;
    feedback?: string;
    finalContent?: string;
    error?: string;
  };
}

export interface TrajectorySession {
  sessionId: string;
  sessionName: string;
  targetRepo: string;
  mode: 'BASELINE' | 'MULTI_AGENT';
  startTime: string;
  endTime?: string;
  metrics: {
    durationMs?: number;
    totalPromptTokens?: number;
    totalCandidatesTokens?: number;
    totalTokens?: number;
    humanInterventions: number;
  };
  steps: TrajectoryStep[];
  outcomeSummary?: string;
}

export class TrajectoryLogger {
  private session: TrajectorySession;
  private logsDir: string;

  constructor(
    sessionName: string,
    targetRepo: string,
    mode: 'BASELINE' | 'MULTI_AGENT' = 'BASELINE',
    customLogsDir?: string
  ) {
    this.logsDir = customLogsDir || path.resolve(process.cwd(), 'trajectories');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    const sessionId = `${mode.toLowerCase()}_${Date.now()}`;
    this.session = {
      sessionId,
      sessionName,
      targetRepo,
      mode,
      startTime: new Date().toISOString(),
      steps: [],
      metrics: {
        humanInterventions: 0
      }
    };
  }

  public recordStep(
    agentName: string,
    action: StepAction,
    summary: string,
    details: TrajectoryStep['details'] = {}
  ): TrajectoryStep {
    const step: TrajectoryStep = {
      stepIndex: this.session.steps.length + 1,
      timestamp: new Date().toISOString(),
      agentName,
      action,
      summary,
      details
    };

    if (action === 'HUMAN_APPROVAL_REQUEST' || action === 'HUMAN_APPROVAL_RESPONSE') {
      this.session.metrics.humanInterventions++;
    }

    this.session.steps.push(step);
    this.printConsoleStep(step);
    this.persist();
    return step;
  }

  public finalize(outcomeSummary: string, metrics?: Partial<TrajectorySession['metrics']>) {
    this.session.endTime = new Date().toISOString();
    this.session.outcomeSummary = outcomeSummary;

    const start = new Date(this.session.startTime).getTime();
    const end = new Date(this.session.endTime).getTime();

    this.session.metrics = {
      ...this.session.metrics,
      durationMs: end - start,
      ...metrics
    };

    this.persist();
    console.log(chalk.bold.green(`\n✔ Trajectory logged successfully to: ${this.getJsonFilePath()}`));
  }

  private printConsoleStep(step: TrajectoryStep) {
    const tag = `[${step.agentName}] [${step.action}]`;
    switch (step.action) {
      case 'GOAL_DEFINED':
        console.log(chalk.cyan.bold(`\n🎯 ${tag} ${step.summary}`));
        break;
      case 'THOUGHT':
        console.log(chalk.gray(`💭 ${tag} ${step.details.thought || step.summary}`));
        break;
      case 'TOOL_CALL':
        console.log(chalk.yellow(`🛠 ${tag} Using ${step.details.toolName}: ${JSON.stringify(step.details.toolInput)}`));
        break;
      case 'TOOL_RESPONSE':
        console.log(chalk.magenta(`📥 ${tag} Response received`));
        break;
      case 'HUMAN_APPROVAL_REQUEST':
        console.log(chalk.bold.blue(`🛡️ ${tag} Human approval requested for sandbox action`));
        break;
      case 'HUMAN_APPROVAL_RESPONSE':
        console.log(
          step.details.humanApproved
            ? chalk.bold.green(`✅ ${tag} Action approved by user`)
            : chalk.bold.red(`❌ ${tag} Action rejected by user: ${step.details.feedback}`)
        );
        break;
      case 'FINAL_RESPONSE':
        console.log(chalk.bold.green(`\n🏁 ${tag} Final Output Delivered`));
        break;
      case 'ERROR':
        console.log(chalk.bold.red(`\n💥 ${tag} Error: ${step.details.error || step.summary}`));
        break;
    }
  }

  private persist() {
    const jsonPath = this.getJsonFilePath();
    fs.writeFileSync(jsonPath, JSON.stringify(this.session, null, 2), 'utf-8');

    // Also write readable .log file
    const logPath = path.resolve(this.logsDir, `${this.session.sessionId}.log`);
    const logContent = this.generateReadableLog();
    fs.writeFileSync(logPath, logContent, 'utf-8');
  }

  public getJsonFilePath(): string {
    return path.resolve(this.logsDir, `${this.session.sessionId}.json`);
  }

  private generateReadableLog(): string {
    const s = this.session;
    let out = `================================================================================\n`;
    out += `AGENT TRAJECTORY: ${s.sessionName} (${s.sessionId})\n`;
    out += `Target Repository: ${s.targetRepo}\n`;
    out += `Execution Mode: ${s.mode}\n`;
    out += `Start Time: ${s.startTime}\n`;
    if (s.endTime) out += `End Time: ${s.endTime}\n`;
    if (s.metrics?.durationMs) out += `Duration: ${(s.metrics.durationMs / 1000).toFixed(2)}s\n`;
    if (s.metrics?.totalTokens) out += `Total Tokens: ${s.metrics.totalTokens}\n`;
    out += `================================================================================\n\n`;

    for (const step of s.steps) {
      out += `[#${step.stepIndex} | ${step.timestamp}] [${step.agentName}] [${step.action}]\n`;
      out += `Summary: ${step.summary}\n`;
      if (step.details.thought) out += `Thought: ${step.details.thought}\n`;
      if (step.details.toolName) out += `Tool: ${step.details.toolName}(${JSON.stringify(step.details.toolInput)})\n`;
      if (step.details.humanApproved !== undefined) out += `Approved: ${step.details.humanApproved ? 'YES' : 'NO'}\n`;
      if (step.details.feedback) out += `Feedback: ${step.details.feedback}\n`;
      if (step.details.finalContent) out += `--- CONTENT ---\n${step.details.finalContent}\n---------------\n`;
      if (step.details.error) out += `Error: ${step.details.error}\n`;
      out += `\n`;
    }

    if (s.outcomeSummary) {
      out += `\nFINAL OUTCOME:\n${s.outcomeSummary}\n`;
    }

    return out;
  }
}
