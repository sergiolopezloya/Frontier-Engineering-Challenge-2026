import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import { AnalystAgent } from '../../../src/agents/analyst/analystAgent.js';
import { TrajectoryLogger } from '../../../src/logger/trajectoryLogger.js';
import * as resilientModule from '../../../src/utils/resilientGenAi.js';

describe('AnalystAgent', () => {
  let logger: TrajectoryLogger;
  let analyst: AnalystAgent;

  beforeEach(() => {
    logger = new TrajectoryLogger('Analyst_Test', 'test-repos/sample-react-app', 'MULTI_AGENT');
    analyst = new AnalystAgent('fake-api-key', 'gemini-3.7-flash', logger);
  });

  afterEach(() => {
    const jsonPath = logger.getJsonFilePath();
    fs.rmSync(jsonPath, { force: true });
    const logPath = jsonPath.replace(/\.json$/, '.log');
    fs.rmSync(logPath, { force: true });
    vi.restoreAllMocks();
  });

  it('should analyze repository and parse structured JSON audit report', async () => {
    const mockReport = {
      projectName: 'sample-react-app',
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
          description: 'Found hardcoded secret key',
          remediation: 'Move to env'
        }
      ],
      technicalDebtFindings: [
        {
          file: 'src/App.tsx',
          type: 'MEMORY_LEAK',
          description: 'Uncleaned interval',
          impact: 'Memory leak',
          remediation: 'Clean in useEffect'
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
      overallHealthScore: 45,
      summary: 'Legacy React app'
    };

    vi.spyOn(resilientModule, 'generateWithRetry').mockResolvedValue({
      text: `\`\`\`json\n${JSON.stringify(mockReport)}\n\`\`\``,
      modelUsed: 'gemini-3.7-flash',
      usageMetadata: { totalTokenCount: 500 }
    });

    const report = await analyst.analyzeRepository('test-repos/sample-react-app');
    expect(report.projectName).toBe('sample-react-app');
    expect(report.overallHealthScore).toBe(45);
    expect(report.securityFindings.length).toBe(1);
    expect(report.technicalDebtFindings.length).toBe(1);
  });

  it('should handle malformed JSON gracefully and return fallback report', async () => {
    vi.spyOn(resilientModule, 'generateWithRetry').mockResolvedValue({
      text: 'Invalid non-json response string',
      modelUsed: 'gemini-3.7-flash'
    });

    const report = await analyst.analyzeRepository('test-repos/sample-react-app');
    expect(report.projectName).toBe('React Project');
    expect(report.overallHealthScore).toBe(40);
    expect(report.securityFindings.length).toBeGreaterThan(0);
  });

  it('should handle undefined response text by defaulting to empty JSON', async () => {
    vi.spyOn(resilientModule, 'generateWithRetry').mockResolvedValue({
      text: undefined as unknown as string,
      modelUsed: 'gemini-3.7-flash'
    });

    const report = await analyst.analyzeRepository('test-repos/sample-react-app');
    expect(report.projectName).toBe('React Project');
    expect(report.overallHealthScore).toBe(40);
  });

  it('should traverse nested folders and skip ignored directories', async () => {
    const tempScanDir = 'temp-scan-test-dir';
    if (!fs.existsSync(tempScanDir)) fs.mkdirSync(tempScanDir, { recursive: true });
    fs.mkdirSync(`${tempScanDir}/node_modules`, { recursive: true });
    fs.writeFileSync(`${tempScanDir}/node_modules/ignored.js`, 'ignored');
    fs.mkdirSync(`${tempScanDir}/subdir`, { recursive: true });
    fs.writeFileSync(`${tempScanDir}/subdir/valid.tsx`, 'export const X = 1;');
    fs.writeFileSync(`${tempScanDir}/ignored.txt`, 'text');

    vi.spyOn(resilientModule, 'generateWithRetry').mockResolvedValue({
      text: '{}',
      modelUsed: 'gemini-3.7-flash'
    });

    await analyst.analyzeRepository(tempScanDir);
    fs.rmSync(tempScanDir, { recursive: true, force: true });
  });
});
