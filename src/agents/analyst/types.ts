export interface TechStackInfo {
  framework: string;
  frameworkVersion: string;
  bundler: string;
  bundlerVersion: string;
  typescript: boolean;
  packageManager: 'npm' | 'yarn' | 'pnpm';
}

export interface SecurityFinding {
  file: string;
  lineSnippet?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  description: string;
  remediation: string;
}

export interface TechnicalDebtFinding {
  file: string;
  type: 'DEPRECATED_DEPENDENCY' | 'MEMORY_LEAK' | 'ARCHITECTURAL_FLAW' | 'MISSING_TESTS';
  description: string;
  impact: string;
  remediation: string;
}

export interface InfrastructureRequirements {
  nodeEngine: string;
  buildCommand: string;
  buildOutputDirectory: string;
  port: number;
  environmentVariables: string[];
  requiresProxy: boolean;
}

export interface AuditReport {
  projectName: string;
  techStack: TechStackInfo;
  securityFindings: SecurityFinding[];
  technicalDebtFindings: TechnicalDebtFinding[];
  infrastructureRequirements: InfrastructureRequirements;
  overallHealthScore: number; // 0-100
  summary: string;
}
