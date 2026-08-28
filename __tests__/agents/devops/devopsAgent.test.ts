import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import { DevOpsAgent } from '../../../src/agents/devops/devopsAgent.js';
import { TrajectoryLogger } from '../../../src/logger/trajectoryLogger.js';
import { AuditReport } from '../../../src/agents/analyst/types.js';
import * as resilientModule from '../../../src/utils/resilientGenAi.js';

describe('DevOpsAgent', () => {
  let logger: TrajectoryLogger;
  let devops: DevOpsAgent;

  const mockAuditReport: AuditReport = {
    projectName: 'sample-react-app',
    techStack: {
      framework: 'React',
      frameworkVersion: '16.14.0',
      bundler: 'Vite',
      bundlerVersion: '2.9.0',
      typescript: true,
      packageManager: 'npm'
    },
    securityFindings: [],
    technicalDebtFindings: [],
    infrastructureRequirements: {
      nodeEngine: '18-alpine',
      buildCommand: 'npm run build',
      buildOutputDirectory: 'dist',
      port: 80,
      environmentVariables: [],
      requiresProxy: true
    },
    overallHealthScore: 60,
    summary: 'Test summary'
  };

  beforeEach(() => {
    logger = new TrajectoryLogger('DevOps_Test', 'test-repos/sample-react-app', 'MULTI_AGENT');
    devops = new DevOpsAgent('fake-api-key', 'gemini-3.7-flash', logger);
  });

  afterEach(() => {
    const jsonPath = logger.getJsonFilePath();
    fs.rmSync(jsonPath, { force: true });
    const logPath = jsonPath.replace(/\.json$/, '.log');
    fs.rmSync(logPath, { force: true });
    vi.restoreAllMocks();
  });

  it('should generate complete infrastructure manifests from audit report', async () => {
    const mockInfra = {
      dockerfile: {
        relativePath: 'Dockerfile',
        description: 'Multi-stage Dockerfile',
        content: 'FROM node:18-alpine AS builder\n',
        purpose: 'CONTAINERIZATION'
      },
      nginxConfig: {
        relativePath: 'nginx.conf',
        description: 'NGINX SPA config',
        content: 'server { listen 80; }',
        purpose: 'PROXY_ROUTING'
      },
      dockerIgnore: {
        relativePath: '.dockerignore',
        description: 'Docker ignore',
        content: 'node_modules\n.git\n',
        purpose: 'SECURITY'
      },
      cloudDeployScript: {
        relativePath: 'scripts/deploy.sh',
        description: 'Deploy script',
        content: '#!/bin/bash\necho deploy\n',
        purpose: 'CLOUD_DEPLOYMENT'
      },
      dockerCompose: {
        relativePath: 'docker-compose.yml',
        description: 'Docker Compose preview',
        content: 'version: "3.8"\n',
        purpose: 'CONTAINERIZATION'
      },
      summary: 'Generated 5 assets'
    };

    vi.spyOn(resilientModule, 'generateWithRetry').mockResolvedValue({
      text: `\`\`\`json\n${JSON.stringify(mockInfra)}\n\`\`\``,
      modelUsed: 'gemini-3.7-flash',
      usageMetadata: { totalTokenCount: 600 }
    });

    const infra = await devops.generateInfrastructure(mockAuditReport);
    expect(infra.dockerfile.relativePath).toBe('Dockerfile');
    expect(infra.nginxConfig.relativePath).toBe('nginx.conf');
    expect(infra.dockerIgnore.relativePath).toBe('.dockerignore');
    expect(infra.cloudDeployScript.relativePath).toBe('scripts/deploy.sh');
    expect(infra.dockerCompose?.relativePath).toBe('docker-compose.yml');
  });

  it('should return robust fallback infrastructure when model returns non-json text', async () => {
    vi.spyOn(resilientModule, 'generateWithRetry').mockResolvedValue({
      text: 'Non-json raw response text',
      modelUsed: 'gemini-3.7-flash'
    });

    const infra = await devops.generateInfrastructure(mockAuditReport);
    expect(infra.dockerfile.content).toContain('FROM node:18-alpine AS builder');
    expect(infra.nginxConfig.content).toContain('gzip on;');
    expect(infra.dockerIgnore.content).toContain('node_modules');
  });

  it('should handle undefined response text by using default empty text and fallback infra', async () => {
    vi.spyOn(resilientModule, 'generateWithRetry').mockResolvedValue({
      text: undefined as unknown as string,
      modelUsed: 'gemini-3.7-flash'
    });

    const infra = await devops.generateInfrastructure(mockAuditReport);
    expect(infra.dockerfile.content).toContain('FROM node:18-alpine AS builder');
  });

  it('should fallback to dist when buildOutputDirectory is empty string', async () => {
    vi.spyOn(resilientModule, 'generateWithRetry').mockResolvedValue({
      text: 'Malformed',
      modelUsed: 'gemini-3.7-flash'
    });
    const emptyReport = {
      ...mockAuditReport,
      infrastructureRequirements: { ...mockAuditReport.infrastructureRequirements, buildOutputDirectory: '' }
    };
    const infra = await devops.generateInfrastructure(emptyReport);
    expect(infra.dockerfile.content).toContain('/app/dist');
  });

  it('should trigger fallback when parsed JSON lacks required fields', async () => {
    vi.spyOn(resilientModule, 'generateWithRetry').mockResolvedValue({
      text: JSON.stringify({ summary: 'Incomplete' }),
      modelUsed: 'gemini-3.7-flash'
    });

    const infra = await devops.generateInfrastructure(mockAuditReport);
    expect(infra.dockerfile.content).toContain('FROM node:18-alpine AS builder');
  });
});
