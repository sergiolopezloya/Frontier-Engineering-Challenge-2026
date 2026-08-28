import { GoogleGenAI } from '@google/genai';
import { TrajectoryLogger } from '../../logger/trajectoryLogger.js';
import { generateWithRetry } from '../../utils/resilientGenAi.js';
import { AuditReport } from '../analyst/types.js';
import { GeneratedInfra } from './types.js';

export class DevOpsAgent {
  private ai: GoogleGenAI;
  private modelName: string;
  private logger: TrajectoryLogger;

  constructor(apiKey: string, modelName: string, logger: TrajectoryLogger) {
    this.ai = new GoogleGenAI({ apiKey });
    this.modelName = modelName;
    this.logger = logger;
  }

  public async generateInfrastructure(auditReport: AuditReport): Promise<GeneratedInfra> {
    this.logger.recordStep(
      'DevOpsAgent',
      'GOAL_DEFINED',
      'Synthesize production-grade containerization and cloud deployment infrastructure based on Analyst findings',
      {
        thought:
          'Designing multi-stage Dockerfile, NGINX SPA reverse proxy, security ignore rules, and automated cloud deploy manifests.'
      }
    );

    const prompt = `
You are a Principal DevOps and Cloud Infrastructure Architect.
Design a production-grade containerization and deployment infrastructure for this React application based on the technical audit report below.

ANALYST AUDIT REPORT:
${JSON.stringify(auditReport, null, 2)}

REQUIREMENTS:
1. Multi-stage Dockerfile:
   - Stage 1 (Builder): Node.js alpine (${auditReport.infrastructureRequirements.nodeEngine}), clean dependency install, run "${auditReport.infrastructureRequirements.buildCommand}".
   - Stage 2 (Runner): Nginx alpine, copy built assets from builder to /usr/share/nginx/html, apply custom nginx.conf, run as non-root unprivileged user if possible, expose port 80.
2. nginx.conf:
   - Enable gzip compression for JS, CSS, JSON, SVG.
   - SPA fallback: "try_files $uri $uri/ /index.html;".
   - Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Content-Security-Policy.
3. .dockerignore:
   - Exclude node_modules, .git, .env*, dist, build, coverage, logs, *.md.
4. cloud-deploy.sh:
   - Production deployment script with support for AWS ECS (ECR build/push/deploy) and GCP Cloud Run.
5. docker-compose.yml:
   - Local simulation service with port mapping and healthcheck.

You MUST return a strictly valid JSON object matching this schema (do NOT wrap in any extra markdown text except json code block):

{
  "dockerfile": {
    "relativePath": "Dockerfile",
    "description": "Multi-stage production Dockerfile with Node builder and Nginx Alpine runner",
    "content": "string",
    "purpose": "CONTAINERIZATION"
  },
  "nginxConfig": {
    "relativePath": "nginx.conf",
    "description": "Production NGINX SPA reverse-proxy configuration with gzip and security headers",
    "content": "string",
    "purpose": "PROXY_ROUTING"
  },
  "dockerIgnore": {
    "relativePath": ".dockerignore",
    "description": "Docker build context ignore rules for secrets and build artifacts",
    "content": "string",
    "purpose": "SECURITY"
  },
  "cloudDeployScript": {
    "relativePath": "scripts/deploy.sh",
    "description": "Production automated deployment script for AWS ECS and GCP Cloud Run",
    "content": "string",
    "purpose": "CLOUD_DEPLOYMENT"
  },
  "dockerCompose": {
    "relativePath": "docker-compose.yml",
    "description": "Docker Compose configuration for local staging preview and testing",
    "content": "string",
    "purpose": "CONTAINERIZATION"
  },
  "summary": "High-level summary of generated infrastructure"
}
`.trim();

    this.logger.recordStep(
      'DevOpsAgent',
      'TOOL_CALL',
      `Invoke Gemini model (${this.modelName}) to synthesize full infrastructure suite`,
      {
        toolName: 'GoogleGenAI.generateContent',
        toolInput: { model: this.modelName, promptLength: prompt.length }
      }
    );

    const result = await generateWithRetry(this.ai, this.modelName, prompt);
    const rawText = result.text || '{}';
    const usage = result.usageMetadata;

    this.logger.recordStep(
      'DevOpsAgent',
      'TOOL_RESPONSE',
      `Received infrastructure manifests from Gemini API (via ${result.modelUsed})`,
      {
        toolOutput: {
          modelUsed: result.modelUsed,
          promptTokenCount: usage?.promptTokenCount,
          candidatesTokenCount: usage?.candidatesTokenCount,
          totalTokenCount: usage?.totalTokenCount
        }
      }
    );

    const infra = this.parseJsonInfra(rawText, auditReport);

    this.logger.recordStep(
      'DevOpsAgent',
      'FINAL_RESPONSE',
      `Generated 5 infrastructure assets: Dockerfile, nginx.conf, .dockerignore, deploy.sh, docker-compose.yml`,
      {
        finalContent: JSON.stringify(infra, null, 2)
      }
    );

    return infra;
  }

  private parseJsonInfra(raw: string, audit: AuditReport): GeneratedInfra {
    try {
      const cleaned = raw
        .replace(/^```json\s*/, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')
        .trim();
      const parsed = JSON.parse(cleaned);
      if (!parsed || typeof parsed !== 'object' || !parsed.dockerfile || !parsed.nginxConfig || !parsed.dockerIgnore) {
        throw new Error('Incomplete GeneratedInfra schema');
      }
      return parsed as GeneratedInfra;
    } catch {
      // Fallback robust infrastructure
      const outDir = audit.infrastructureRequirements.buildOutputDirectory || 'dist';
      return {
        dockerfile: {
          relativePath: 'Dockerfile',
          description: 'Multi-stage production Dockerfile',
          content: `# Build Stage\nFROM node:18-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\n# Production Stage\nFROM nginx:alpine\nCOPY --from=builder /app/${outDir} /usr/share/nginx/html\nCOPY nginx.conf /etc/nginx/conf.d/default.conf\nEXPOSE 80\nCMD ["nginx", "-g", "daemon off;"]\n`,
          purpose: 'CONTAINERIZATION'
        },
        nginxConfig: {
          relativePath: 'nginx.conf',
          description: 'NGINX SPA configuration',
          content: `server {\n    listen 80;\n    server_name localhost;\n\n    gzip on;\n    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;\n\n    location / {\n        root /usr/share/nginx/html;\n        index index.html;\n        try_files $uri $uri/ /index.html;\n    }\n}\n`,
          purpose: 'PROXY_ROUTING'
        },
        dockerIgnore: {
          relativePath: '.dockerignore',
          description: 'Docker ignore rules',
          content: `node_modules\n.git\n.env\n.env.*\ndist\nbuild\n*.log\n`,
          purpose: 'SECURITY'
        },
        cloudDeployScript: {
          relativePath: 'scripts/deploy.sh',
          description: 'AWS / GCP Cloud deployment script',
          content: `#!/usr/bin/env bash\nset -euo pipefail\n\necho "=== Deploying React Production App ==="\n# GCP Cloud Run deployment example\n# gcloud run deploy sample-react-app --source . --platform managed --region us-central1 --allow-unauthenticated\n`,
          purpose: 'CLOUD_DEPLOYMENT'
        },
        dockerCompose: {
          relativePath: 'docker-compose.yml',
          description: 'Docker Compose for local staging preview',
          content: `version: '3.8'\nservices:\n  react-app:\n    build: .\n    ports:\n      - "8080:80"\n    restart: always\n`,
          purpose: 'CONTAINERIZATION'
        },
        summary: 'Production infrastructure generated for React SPA application.'
      };
    }
  }
}
