import { Config } from './config';
import { ParsedCommit } from './semver';
export declare function createRelease(version: string, commits: ParsedCommit[], config: Config, dryRun?: boolean): Promise<void>;
export declare function getCommitsSinceLastTag(): Promise<ParsedCommit[]>;
export declare function createTag(version: string, dryRun?: boolean): Promise<void>;
//# sourceMappingURL=release.d.ts.map