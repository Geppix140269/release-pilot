import { ParsedCommit } from './semver';
import { Config } from './config';
export interface ChangelogEntry {
    version: string;
    date: string;
    changes: string;
    compareUrl?: string;
}
export declare function updateChangelog(version: string, commits: ParsedCommit[], config: Config, dryRun?: boolean): Promise<string>;
export declare function parseChangelog(content: string): ChangelogEntry[];
//# sourceMappingURL=changelog.d.ts.map