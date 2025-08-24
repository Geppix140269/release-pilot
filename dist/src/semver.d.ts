import * as semver from 'semver';
export type ReleaseType = 'major' | 'minor' | 'patch';
export interface VersionInfo {
    current: string;
    next: string;
    releaseType: ReleaseType;
}
export declare function determineReleaseType(commits: ParsedCommit[]): ReleaseType;
export interface ParsedCommit {
    type: string | null;
    scope: string | null;
    subject: string;
    breaking: boolean;
    notes?: Array<{
        title: string;
        text: string;
    }>;
    footer?: string;
    hash: string;
    message: string;
}
export declare function getCurrentVersion(versionFile: string): Promise<string>;
export declare function updateVersion(versionFile: string, newVersion: string, dryRun?: boolean): Promise<void>;
export declare function bumpVersion(currentVersion: string, releaseType: ReleaseType | 'auto', commits?: ParsedCommit[]): string;
export declare function parseVersion(version: string): semver.SemVer | null;
export declare function isValidVersion(version: string): boolean;
export declare function compareVersions(v1: string, v2: string): number;
//# sourceMappingURL=semver.d.ts.map