import { Config } from './config';
import { ParsedCommit } from './semver';
export interface NotificationPayload {
    version: string;
    repository: string;
    compareUrl: string;
    changes: string[];
    releaseUrl?: string;
}
export declare function sendNotifications(version: string, commits: ParsedCommit[], config: Config, releaseUrl?: string): Promise<void>;
export declare function sendDryRunNotification(version: string, commits: ParsedCommit[], config: Config): Promise<void>;
//# sourceMappingURL=notify.d.ts.map