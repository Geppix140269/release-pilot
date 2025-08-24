import { ParsedCommit } from './semver';
import { Config } from './config';
export declare function generateAISummary(commits: ParsedCommit[], config: Config): Promise<string | null>;
export declare function generateReleaseNotes(version: string, commits: ParsedCommit[], config: Config): Promise<string>;
//# sourceMappingURL=ai.d.ts.map