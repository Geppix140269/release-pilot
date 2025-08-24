import { Config } from './config';
import { ParsedCommit } from './semver';
export interface MergeResult {
    version: string;
    changelogEntry: string;
    commitsSince: ParsedCommit[];
    releaseType: 'major' | 'minor' | 'patch';
}
/**
 * Handles merge to main branch events, performing version bumping,
 * changelog updates, and tag creation.
 */
export declare function handleMergeToMain(config: Config, isDryRun?: boolean): Promise<MergeResult | null>;
/**
 * Validates that required files exist for the merge process
 */
export declare function validateMergePrerequisites(config: Config): void;
/**
 * Gets merge-related statistics for reporting
 */
export declare function getMergeStats(commits: ParsedCommit[]): {
    totalCommits: number;
    conventionalCommits: number;
    features: number;
    fixes: number;
    breakingChanges: number;
};
//# sourceMappingURL=merge.d.ts.map