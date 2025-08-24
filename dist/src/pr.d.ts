import { Config } from './config';
import { ParsedCommit } from './semver';
export interface PRInfo {
    number: number;
    title: string;
    body: string | null;
    commits: ParsedCommit[];
}
export declare function generatePRBody(prInfo: PRInfo, config: Config, commits: ParsedCommit[]): Promise<string>;
export declare function updatePRDescription(prNumber: number, body: string, dryRun?: boolean): Promise<void>;
export declare function getPRInfo(): Promise<PRInfo | null>;
export declare function parseCommit(message: string, hash: string): ParsedCommit;
//# sourceMappingURL=pr.d.ts.map