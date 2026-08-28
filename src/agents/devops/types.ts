export interface InfraFile {
  relativePath: string;
  description: string;
  content: string;
  purpose: 'CONTAINERIZATION' | 'PROXY_ROUTING' | 'SECURITY' | 'CLOUD_DEPLOYMENT';
}

export interface GeneratedInfra {
  dockerfile: InfraFile;
  nginxConfig: InfraFile;
  dockerIgnore: InfraFile;
  cloudDeployScript: InfraFile;
  dockerCompose?: InfraFile;
  summary: string;
}
