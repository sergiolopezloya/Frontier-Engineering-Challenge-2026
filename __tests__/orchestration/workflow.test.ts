import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { MultiAgentOrchestrator } from '../../src/orchestration/workflow.js';
import * as resilientModule from '../../src/utils/resilientGenAi.js';

vi.mock('node:readline');

describe('MultiAgentOrchestrator', () => {
  const tempTargetDir = path.resolve(process.cwd(), 'temp-workflow-test-repo');

  beforeEach(() => {
    if (!fs.existsSync(tempTargetDir)) {
      fs.mkdirSync(tempTargetDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(tempTargetDir, 'package.json'),
      JSON.stringify({ name: 'test-app', dependencies: { react: '16.14.0' } })
    );
    fs.writeFileSync(path.join(tempTargetDir, 'App.tsx'), 'export const App = () => <div>Hi</div>;');
  });

  afterEach(() => {
    if (fs.existsSync(tempTargetDir)) {
      fs.rmSync(tempTargetDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it('should run end-to-end pipeline and write approved infrastructure files', async () => {
    // Mock user approving all files
    const mockRl = {
      question: vi.fn((_q: string, cb: (ans: string) => void) => cb('y')),
      close: vi.fn()
    };
    vi.spyOn(readline, 'createInterface').mockReturnValue(mockRl as unknown as readline.Interface);

    // Mock Analyst and DevOps outputs
    const mockAudit = {
      projectName: 'test-app',
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
          file: 'App.tsx',
          severity: 'CRITICAL',
          category: 'Secret Leak',
          description: 'Hardcoded secret token',
          remediation: 'Use env'
        }
      ],
      technicalDebtFindings: [
        {
          file: 'App.tsx',
          type: 'MEMORY_LEAK',
          description: 'Uncleaned interval leak',
          impact: 'Memory degradation',
          remediation: 'Cleanup'
        }
      ],
      infrastructureRequirements: {
        nodeEngine: '18-alpine',
        buildCommand: 'npm run build',
        buildOutputDirectory: 'dist',
        port: 80,
        environmentVariables: [],
        requiresProxy: true
      },
      overallHealthScore: 50,
      summary: 'Legacy React 16 project'
    };

    const mockInfra = {
      dockerfile: {
        relativePath: 'Dockerfile',
        description: 'Multi-stage Dockerfile',
        content:
          'FROM node:18-alpine AS builder\nRUN echo build\nFROM nginx:alpine\nCOPY --from=builder /app/dist /usr/share/nginx/html\n',
        purpose: 'CONTAINERIZATION'
      },
      nginxConfig: {
        relativePath: 'nginx.conf',
        description: 'NGINX Config',
        content: 'server {\n listen 80;\n try_files $uri /index.html;\n gzip on;\n}\n',
        purpose: 'PROXY_ROUTING'
      },
      dockerIgnore: {
        relativePath: '.dockerignore',
        description: 'Ignore rules',
        content: 'node_modules\n.git\n',
        purpose: 'SECURITY'
      },
      cloudDeployScript: {
        relativePath: 'scripts/deploy.sh',
        description: 'Deploy script',
        content: '#!/usr/bin/env bash\necho "Deploying to AWS/GCP"\n',
        purpose: 'CLOUD_DEPLOYMENT'
      },
      dockerCompose: {
        relativePath: 'docker-compose.yml',
        description: 'Compose file',
        content: 'version: "3.8"\n',
        purpose: 'CONTAINERIZATION'
      },
      summary: 'Full infrastructure'
    };

    let callCount = 0;
    vi.spyOn(resilientModule, 'generateWithRetry').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { text: JSON.stringify(mockAudit), modelUsed: 'gemini-3.7-flash' };
      }
      return { text: JSON.stringify(mockInfra), modelUsed: 'gemini-3.7-flash' };
    });

    const orchestrator = new MultiAgentOrchestrator({
      targetRepoPath: tempTargetDir,
      apiKey: 'test-api-key',
      modelName: 'gemini-3.7-flash'
    });

    await orchestrator.run();

    // Verify all 5 files were created in target repo
    expect(fs.existsSync(path.join(tempTargetDir, 'Dockerfile'))).toBe(true);
    expect(fs.existsSync(path.join(tempTargetDir, 'nginx.conf'))).toBe(true);
    expect(fs.existsSync(path.join(tempTargetDir, '.dockerignore'))).toBe(true);
    expect(fs.existsSync(path.join(tempTargetDir, 'scripts/deploy.sh'))).toBe(true);
    expect(fs.existsSync(path.join(tempTargetDir, 'docker-compose.yml'))).toBe(true);
  });

  it('should evaluate scorecard with alternative keywords in findings', async () => {
    const mockRl = {
      question: vi.fn((_q: string, cb: (ans: string) => void) => cb('y')),
      close: vi.fn()
    };
    vi.spyOn(readline, 'createInterface').mockReturnValue(mockRl as unknown as readline.Interface);

    const alternativeAudit = {
      projectName: 'test-keywords',
      techStack: {
        framework: 'React',
        frameworkVersion: '18.0.0',
        bundler: 'Vite',
        bundlerVersion: '4.0.0',
        typescript: true,
        packageManager: 'npm'
      },
      securityFindings: [
        {
          file: 'App.tsx',
          severity: 'HIGH',
          category: 'Auth Error',
          description: 'API key exposed in code',
          remediation: 'Use env'
        }
      ],
      technicalDebtFindings: [
        {
          file: 'App.tsx',
          type: 'PERFORMANCE',
          description: 'Timer unhandled causes resource leak',
          impact: 'Degradation',
          remediation: 'Clear leak'
        }
      ],
      infrastructureRequirements: {
        nodeEngine: '18-alpine',
        buildCommand: 'npm run build',
        buildOutputDirectory: 'dist',
        port: 80,
        environmentVariables: [],
        requiresProxy: false
      },
      overallHealthScore: 70,
      summary: 'Legacy version 16 migration needed'
    };

    const minimalInfra = {
      dockerfile: {
        relativePath: 'Dockerfile',
        description: 'Dockerfile',
        content: 'FROM node:18 AS build\n',
        purpose: 'CONTAINERIZATION'
      },
      nginxConfig: {
        relativePath: 'nginx.conf',
        description: 'NGINX',
        content: 'server { try_files $uri /index.html; gzip on; }\n',
        purpose: 'PROXY_ROUTING'
      },
      dockerIgnore: {
        relativePath: '.dockerignore',
        description: 'Ignore',
        content: 'node_modules\n',
        purpose: 'SECURITY'
      },
      cloudDeployScript: {
        relativePath: 'scripts/deploy.sh',
        description: 'Deploy',
        content: '#!/bin/bash\necho "Long script content exceeding 20 chars"\n',
        purpose: 'CLOUD_DEPLOYMENT'
      },
      summary: 'Infra'
    };

    let callCount = 0;
    vi.spyOn(resilientModule, 'generateWithRetry').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return { text: JSON.stringify(alternativeAudit), modelUsed: 'gemini-3.7-flash' };
      return { text: JSON.stringify(minimalInfra), modelUsed: 'gemini-3.7-flash' };
    });

    const orchestrator = new MultiAgentOrchestrator({
      targetRepoPath: tempTargetDir,
      apiKey: 'test-api-key',
      modelName: 'gemini-3.7-flash'
    });

    await expect(orchestrator.run()).resolves.not.toThrow();
  });

  it('should handle clean audit with zero findings and rejected files', async () => {
    // User rejects writes
    const mockRl = {
      question: vi.fn((_q: string, cb: (ans: string) => void) => cb('n')),
      close: vi.fn()
    };
    vi.spyOn(readline, 'createInterface').mockReturnValue(mockRl as unknown as readline.Interface);

    const cleanAudit = {
      projectName: 'clean-app',
      techStack: {
        framework: 'React',
        frameworkVersion: '18.2.0',
        bundler: 'Vite',
        bundlerVersion: '5.0.0',
        typescript: true,
        packageManager: 'npm'
      },
      securityFindings: [],
      technicalDebtFindings: [],
      infrastructureRequirements: {
        nodeEngine: '20-alpine',
        buildCommand: 'npm run build',
        buildOutputDirectory: 'dist',
        port: 80,
        environmentVariables: [],
        requiresProxy: false
      },
      overallHealthScore: 95,
      summary: 'Clean modern app'
    };

    const cleanInfra = {
      dockerfile: {
        relativePath: 'Dockerfile',
        description: 'Dockerfile',
        content: 'FROM node:20\n',
        purpose: 'CONTAINERIZATION'
      },
      nginxConfig: {
        relativePath: 'nginx.conf',
        description: 'Config',
        content: 'server {}\n',
        purpose: 'PROXY_ROUTING'
      },
      dockerIgnore: {
        relativePath: '.dockerignore',
        description: 'Ignore',
        content: 'node_modules\n',
        purpose: 'SECURITY'
      },
      cloudDeployScript: {
        relativePath: 'scripts/deploy.sh',
        description: 'Script',
        content: '#!/bin/bash\n',
        purpose: 'CLOUD_DEPLOYMENT'
      },
      summary: 'Minimal infra'
    };

    let callCount = 0;
    vi.spyOn(resilientModule, 'generateWithRetry').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return { text: JSON.stringify(cleanAudit), modelUsed: 'gemini-3.7-flash' };
      return { text: JSON.stringify(cleanInfra), modelUsed: 'gemini-3.7-flash' };
    });

    const orchestrator = new MultiAgentOrchestrator({
      targetRepoPath: tempTargetDir,
      apiKey: 'test-api-key',
      modelName: 'gemini-3.7-flash'
    });

    await expect(orchestrator.run()).resolves.not.toThrow();
  });
});
