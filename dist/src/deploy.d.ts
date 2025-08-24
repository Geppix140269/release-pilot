import { Config } from './config';
export interface DeploymentConfig {
    environment: string;
    branch: string;
    provider: 'aws' | 'azure' | 'gcp' | 'vercel' | 'netlify' | 'heroku' | 'kubernetes' | 'docker';
    strategy: 'direct' | 'blue-green' | 'canary' | 'rolling';
    url?: string;
    healthCheck?: string;
    rollbackOnFailure: boolean;
    preDeployCommand?: string;
    postDeployCommand?: string;
    secrets?: Record<string, string>;
    autoApprove?: boolean;
    approvers?: string[];
    variables?: Record<string, string>;
}
export interface DeploymentResult {
    success: boolean;
    environment: string;
    version: string;
    url?: string;
    deploymentId?: string;
    duration: number;
    error?: string;
}
export declare function handleDeployment(config: Config, version: string, isDryRun: boolean): Promise<DeploymentResult>;
//# sourceMappingURL=deploy.d.ts.map