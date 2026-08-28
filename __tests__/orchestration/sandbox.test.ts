import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { SandboxGate } from '../../src/orchestration/sandbox.js';
import { TrajectoryLogger } from '../../src/logger/trajectoryLogger.js';

vi.mock('node:readline');

describe('SandboxGate', () => {
  const testOutputDir = path.resolve(process.cwd(), 'temp-test-sandbox');
  let logger: TrajectoryLogger;
  let sandbox: SandboxGate;

  beforeEach(() => {
    logger = new TrajectoryLogger('Sandbox_Test_Session', 'test-repos/sample-react-app', 'MULTI_AGENT');
    sandbox = new SandboxGate(logger);
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up created files
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
    const jsonPath = logger.getJsonFilePath();
    if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
    const logPath = jsonPath.replace(/\.json$/, '.log');
    if (fs.existsSync(logPath)) fs.unlinkSync(logPath);
    vi.restoreAllMocks();
  });

  it('should write file when user approves via terminal (typing y)', async () => {
    const mockRl = {
      question: vi.fn((_q: string, cb: (ans: string) => void) => cb('y')),
      close: vi.fn()
    };
    vi.spyOn(readline, 'createInterface').mockReturnValue(mockRl as unknown as readline.Interface);

    const targetFile = path.join(testOutputDir, 'Dockerfile');
    const written = await sandbox.writeApprovedFile({
      targetPath: targetFile,
      relativePath: 'Dockerfile',
      content: 'FROM node:18-alpine\nRUN echo hi\n',
      description: 'Test Dockerfile'
    });

    expect(written).toBe(true);
    expect(fs.existsSync(targetFile)).toBe(true);
    expect(fs.readFileSync(targetFile, 'utf-8')).toContain('FROM node:18-alpine');
  });

  it('should skip writing file when user rejects via terminal (typing n)', async () => {
    const mockRl = {
      question: vi.fn((_q: string, cb: (ans: string) => void) => cb('n')),
      close: vi.fn()
    };
    vi.spyOn(readline, 'createInterface').mockReturnValue(mockRl as unknown as readline.Interface);

    const targetFile = path.join(testOutputDir, 'nginx.conf');
    const written = await sandbox.writeApprovedFile({
      targetPath: targetFile,
      relativePath: 'nginx.conf',
      content: 'server { listen 80; }',
      description: 'Test Nginx'
    });

    expect(written).toBe(false);
    expect(fs.existsSync(targetFile)).toBe(false);
  });

  it('should handle large multi-line preview formatting properly', async () => {
    const mockRl = {
      question: vi.fn((_q: string, cb: (ans: string) => void) => cb('yes')),
      close: vi.fn()
    };
    vi.spyOn(readline, 'createInterface').mockReturnValue(mockRl as unknown as readline.Interface);

    const longContent = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join('\n');
    const targetFile = path.join(testOutputDir, 'subdir/long.txt');

    const approved = await sandbox.requestApproval({
      targetPath: targetFile,
      relativePath: 'subdir/long.txt',
      content: longContent,
      description: 'Long file preview test'
    });

    expect(approved).toBe(true);
  });
});
