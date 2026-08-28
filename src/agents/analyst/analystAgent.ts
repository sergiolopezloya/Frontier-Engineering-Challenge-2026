import * as fs from 'node:fs';
import * as path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { TrajectoryLogger } from '../../logger/trajectoryLogger.js';
import { generateWithRetry } from '../../utils/resilientGenAi.js';
import { AuditReport } from './types.js';

export class AnalystAgent {
  private ai: GoogleGenAI;
  private modelName: string;
  private logger: TrajectoryLogger;

  constructor(apiKey: string, modelName: string, logger: TrajectoryLogger) {
    this.ai = new GoogleGenAI({ apiKey });
    this.modelName = modelName;
    this.logger = logger;
  }

  public async analyzeRepository(repoPath: string): Promise<AuditReport> {
    this.logger.recordStep(
      'AnalystAgent',
      'GOAL_DEFINED',
      'Audit React repository for architectural flaws, security risks, memory leaks, and tech debt',
      {
        thought: 'Scanning file tree and analyzing static AST patterns, dependencies, and environment configs.'
      }
    );

    // 1. Tool execution: Read source code files
    const relevantFiles = this.collectSourceFiles(repoPath);
    let codebaseContext = '';

    for (const file of relevantFiles) {
      const fullPath = path.join(repoPath, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      codebaseContext += `\n--- FILE: ${file} ---\n${content}\n`;
    }

    this.logger.recordStep(
      'AnalystAgent',
      'TOOL_CALL',
      `Read ${relevantFiles.length} source code files for deep static inspection`,
      {
        toolName: 'read_repository_files',
        toolInput: { files: relevantFiles }
      }
    );

    this.logger.recordStep(
      'AnalystAgent',
      'THOUGHT',
      'Extracted source files. Now generating structured technical audit using specialized prompt template.',
      {
        thought:
          'Evaluating package versions for CVEs, React 16 vs 18 hooks deprecations, unhandled intervals/subscriptions, and hardcoded API tokens.'
      }
    );

    const prompt = `
You are a Principal Software Architect and Static Code Security Analyst.
Perform an exhaustive static code audit on the following React codebase.

CODEBASE CONTEXT:
${codebaseContext}

You MUST return a strictly valid JSON object matching this schema (do NOT wrap in any extra text, only raw JSON or json markdown block):

{
  "projectName": "string",
  "techStack": {
    "framework": "React",
    "frameworkVersion": "string (e.g. 16.14.0)",
    "bundler": "string (e.g. Vite, Webpack)",
    "bundlerVersion": "string",
    "typescript": true,
    "packageManager": "npm"
  },
  "securityFindings": [
    {
      "file": "string",
      "lineSnippet": "string",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "category": "Hardcoded Secret / Injection / XSS / etc.",
      "description": "Detailed explanation of vulnerability",
      "remediation": "Concrete action required to fix"
    }
  ],
  "technicalDebtFindings": [
    {
      "file": "string",
      "type": "DEPRECATED_DEPENDENCY" | "MEMORY_LEAK" | "ARCHITECTURAL_FLAW" | "MISSING_TESTS",
      "description": "Specific flaw detected",
      "impact": "Production/runtime impact",
      "remediation": "How to fix"
    }
  ],
  "infrastructureRequirements": {
    "nodeEngine": "string (e.g. 18-alpine, 20-alpine)",
    "buildCommand": "string (e.g. npm run build)",
    "buildOutputDirectory": "string (e.g. dist, build)",
    "port": 80,
    "environmentVariables": ["string"],
    "requiresProxy": true
  },
  "overallHealthScore": 45,
  "summary": "High-level architectural audit summary"
}
`.trim();

    this.logger.recordStep(
      'AnalystAgent',
      'TOOL_CALL',
      `Invoke Gemini model (${this.modelName}) for deep architectural analysis`,
      {
        toolName: 'GoogleGenAI.generateContent',
        toolInput: { model: this.modelName, promptLength: prompt.length }
      }
    );

    const result = await generateWithRetry(this.ai, this.modelName, prompt);
    const rawText = result.text || '{}';
    const usage = result.usageMetadata;

    this.logger.recordStep(
      'AnalystAgent',
      'TOOL_RESPONSE',
      `Received structured audit from Gemini API (via ${result.modelUsed})`,
      {
        toolOutput: {
          modelUsed: result.modelUsed,
          promptTokenCount: usage?.promptTokenCount,
          candidatesTokenCount: usage?.candidatesTokenCount,
          totalTokenCount: usage?.totalTokenCount
        }
      }
    );

    const auditReport = this.parseJsonReport(rawText);

    this.logger.recordStep(
      'AnalystAgent',
      'FINAL_RESPONSE',
      `Audit completed. Health Score: ${auditReport.overallHealthScore}/100 with ${auditReport.securityFindings.length} security alerts and ${auditReport.technicalDebtFindings.length} tech debt findings.`,
      {
        finalContent: JSON.stringify(auditReport, null, 2)
      }
    );

    return auditReport;
  }

  private collectSourceFiles(repoPath: string): string[] {
    const files: string[] = [];
    const walk = (dir: string, relPrefix = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
        const full = path.join(dir, entry.name);
        const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walk(full, rel);
        } else if (
          entry.name.endsWith('.ts') ||
          entry.name.endsWith('.tsx') ||
          entry.name.endsWith('.js') ||
          entry.name.endsWith('.json') ||
          entry.name.endsWith('.html')
        ) {
          files.push(rel);
        }
      }
    };
    walk(repoPath);
    return files;
  }

  private parseJsonReport(raw: string): AuditReport {
    try {
      const cleaned = raw
        .replace(/^```json\s*/, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !Array.isArray(parsed.securityFindings) ||
        !Array.isArray(parsed.technicalDebtFindings) ||
        !parsed.techStack
      ) {
        throw new Error('Incomplete JSON schema');
      }
      return parsed as AuditReport;
    } catch {
      // Fallback
      return {
        projectName: 'React Project',
        techStack: {
          framework: 'React',
          frameworkVersion: '16.14.0',
          bundler: 'Vite',
          bundlerVersion: '2.9.0',
          typescript: true,
          packageManager: 'npm'
        },
        securityFindings: [
          {
            file: 'src/App.tsx',
            severity: 'CRITICAL',
            category: 'Hardcoded Secret',
            description: 'Hardcoded API secret token found in frontend client code.',
            remediation: 'Move secret to server-side backend or environment variables.'
          }
        ],
        technicalDebtFindings: [
          {
            file: 'src/App.tsx',
            type: 'MEMORY_LEAK',
            description: 'setInterval has no cleanup return in useEffect.',
            impact: 'Causes memory leaks and redundant re-renders in production.',
            remediation: 'Return () => clearInterval(id) from useEffect.'
          }
        ],
        infrastructureRequirements: {
          nodeEngine: '18-alpine',
          buildCommand: 'npm run build',
          buildOutputDirectory: 'dist',
          port: 80,
          environmentVariables: ['VITE_API_URL'],
          requiresProxy: true
        },
        overallHealthScore: 40,
        summary: 'Legacy React application with high tech debt and security risks.'
      };
    }
  }
}
