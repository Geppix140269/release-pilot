export interface Config {
    projectName: string;
    releaseSections: string[];
    excludedScopes: string[];
    prChecklist: string[];
    versionFile: string;
    notificationChannels?: {
        slack?: {
            enabled: boolean;
            webhookUrl?: string;
        };
        teams?: {
            enabled: boolean;
            webhookUrl?: string;
        };
    };
    aiProvider?: 'openai' | 'anthropic';
    customReleaseTemplate?: string;
}
export declare function loadConfig(): Promise<Config>;
export declare function getInputOrConfig<T>(inputName: string, configValue: T | undefined, defaultValue: T): T;
//# sourceMappingURL=config.d.ts.map