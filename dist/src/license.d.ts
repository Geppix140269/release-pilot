export interface LicenseInfo {
    isValid: boolean;
    isDryRun: boolean;
    message?: string;
    expiresAt?: string;
}
export declare function validateLicense(): Promise<LicenseInfo>;
export declare function postDryRunComment(message: string): Promise<void>;
//# sourceMappingURL=license.d.ts.map