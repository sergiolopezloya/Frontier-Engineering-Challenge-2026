import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TrajectoryLogger } from '../../src/logger/trajectoryLogger.js';

describe('TrajectoryLogger', () => {
  const testDir = path.resolve(process.cwd(), 'trajectories');
  let logger: TrajectoryLogger;

  beforeEach(() => {
    logger = new TrajectoryLogger('Test_Session', 'test-repos/sample-react-app', 'BASELINE');
  });

  afterEach(() => {
    // Clean up created test session files
    const jsonPath = logger.getJsonFilePath();
    fs.rmSync(jsonPath, { force: true });
    const logPath = jsonPath.replace(/\.json$/, '.log');
    fs.rmSync(logPath, { force: true });
    vi.restoreAllMocks();
  });

  it('should initialize session with proper structure and directory', () => {
    expect(fs.existsSync(testDir)).toBe(true);
    expect(logger.getJsonFilePath()).toContain('baseline_');
  });

  it('should create trajectories directory if it does not exist', () => {
    const nonExistentDir = path.resolve(process.cwd(), `temp_test_traj_dir_${Date.now()}`);
    expect(fs.existsSync(nonExistentDir)).toBe(false);
    new TrajectoryLogger('Auto_Create_Session', 'test-repo', 'MULTI_AGENT', nonExistentDir);
    expect(fs.existsSync(nonExistentDir)).toBe(true);
    fs.rmSync(nonExistentDir, { recursive: true, force: true });
  });

  it('should record all types of steps properly and persist to disk', () => {
    logger.recordStep('TestAgent', 'GOAL_DEFINED', 'Test Goal', { thought: 'Initial thought' });
    logger.recordStep('TestAgent', 'THOUGHT', 'Thinking step', { thought: 'Evaluating AST' });
    logger.recordStep('TestAgent', 'THOUGHT', 'Thinking step without thought prop', {});
    logger.recordStep('TestAgent', 'TOOL_CALL', 'Calling Tool', { toolName: 'read_file', toolInput: { path: 'a.ts' } });
    logger.recordStep('TestAgent', 'TOOL_RESPONSE', 'Tool Result', { toolOutput: { status: 'ok' } });
    logger.recordStep('TestAgent', 'HUMAN_APPROVAL_REQUEST', 'Requesting approval');
    logger.recordStep('TestAgent', 'HUMAN_APPROVAL_RESPONSE', 'Approved', { humanApproved: true });
    logger.recordStep('TestAgent', 'HUMAN_APPROVAL_RESPONSE', 'Rejected', { humanApproved: false, feedback: 'Denied' });
    logger.recordStep('TestAgent', 'ERROR', 'Failure occurred', { error: 'Test error' });
    logger.recordStep('TestAgent', 'ERROR', 'Failure occurred without error prop', {});
    logger.recordStep('TestAgent', 'FINAL_RESPONSE', 'Completed', { finalContent: 'All done' });

    const jsonPath = logger.getJsonFilePath();
    expect(fs.existsSync(jsonPath)).toBe(true);

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(data.steps.length).toBe(11);
    expect(data.metrics.humanInterventions).toBe(3);
  });

  it('should finalize session with duration, outcome summary, and token metrics', () => {
    logger.recordStep('TestAgent', 'GOAL_DEFINED', 'Starting');
    logger.finalize('Successful test run', {
      totalTokens: 1500,
      totalPromptTokens: 500,
      totalCandidatesTokens: 1000
    });

    const jsonPath = logger.getJsonFilePath();
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    expect(data.outcomeSummary).toBe('Successful test run');
    expect(data.metrics.totalTokens).toBe(1500);
    expect(data.metrics.durationMs).toBeGreaterThanOrEqual(0);
    expect(data.endTime).toBeDefined();

    const logPath = jsonPath.replace(/\.json$/, '.log');
    expect(fs.existsSync(logPath)).toBe(true);
    const logContent = fs.readFileSync(logPath, 'utf-8');
    expect(logContent).toContain('AGENT TRAJECTORY: Test_Session');
    expect(logContent).toContain('Total Tokens: 1500');
  });

  it('should handle finalize without optional metrics or end times', () => {
    logger.finalize('Minimal outcome');
    const jsonPath = logger.getJsonFilePath();
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(data.outcomeSummary).toBe('Minimal outcome');
  });
});
