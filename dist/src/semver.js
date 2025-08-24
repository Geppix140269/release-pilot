"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineReleaseType = determineReleaseType;
exports.getCurrentVersion = getCurrentVersion;
exports.updateVersion = updateVersion;
exports.bumpVersion = bumpVersion;
exports.parseVersion = parseVersion;
exports.isValidVersion = isValidVersion;
exports.compareVersions = compareVersions;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const semver = __importStar(require("semver"));
const toml = __importStar(require("toml"));
function determineReleaseType(commits) {
    const hasBreakingChange = commits.some(c => c.breaking ||
        c.notes?.some(n => n.title === 'BREAKING CHANGE') ||
        c.footer?.includes('BREAKING CHANGE'));
    if (hasBreakingChange) {
        return 'major';
    }
    const hasFeature = commits.some(c => c.type === 'feat');
    if (hasFeature) {
        return 'minor';
    }
    return 'patch';
}
async function getCurrentVersion(versionFile) {
    const filePath = path.join(process.cwd(), versionFile);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Version file not found: ${versionFile}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(versionFile).toLowerCase();
    let version;
    switch (ext) {
        case '.json': {
            const json = JSON.parse(content);
            version = json.version;
            break;
        }
        case '.toml': {
            const tomlContent = toml.parse(content);
            if (versionFile.includes('pyproject.toml')) {
                version = tomlContent.project?.version || tomlContent.tool?.poetry?.version;
            }
            else if (versionFile.includes('Cargo.toml')) {
                version = tomlContent.package?.version;
            }
            break;
        }
        case '.yaml':
        case '.yml': {
            const yaml = require('js-yaml');
            const yamlContent = yaml.load(content);
            version = yamlContent.version;
            break;
        }
        default:
            throw new Error(`Unsupported version file format: ${ext}`);
    }
    if (!version) {
        throw new Error(`No version found in ${versionFile}`);
    }
    if (!semver.valid(version)) {
        throw new Error(`Invalid semver version: ${version}`);
    }
    return version;
}
async function updateVersion(versionFile, newVersion, dryRun = false) {
    const filePath = path.join(process.cwd(), versionFile);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Version file not found: ${versionFile}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(versionFile).toLowerCase();
    let updatedContent;
    switch (ext) {
        case '.json': {
            const json = JSON.parse(content);
            json.version = newVersion;
            updatedContent = JSON.stringify(json, null, 2) + '\n';
            break;
        }
        case '.toml': {
            if (versionFile.includes('pyproject.toml')) {
                updatedContent = content.replace(/version\s*=\s*["'][\d.]+["']/, `version = "${newVersion}"`);
            }
            else if (versionFile.includes('Cargo.toml')) {
                updatedContent = content.replace(/version\s*=\s*["'][\d.]+["']/, `version = "${newVersion}"`);
            }
            else {
                updatedContent = content.replace(/version\s*=\s*["'][\d.]+["']/, `version = "${newVersion}"`);
            }
            break;
        }
        case '.yaml':
        case '.yml': {
            updatedContent = content.replace(/version:\s*["']?[\d.]+["']?/, `version: "${newVersion}"`);
            break;
        }
        default:
            throw new Error(`Unsupported version file format: ${ext}`);
    }
    if (dryRun) {
        core.info(`[DRY RUN] Would update ${versionFile} to version ${newVersion}`);
        return;
    }
    fs.writeFileSync(filePath, updatedContent);
    core.info(`Updated ${versionFile} to version ${newVersion}`);
}
function bumpVersion(currentVersion, releaseType, commits) {
    const actualReleaseType = releaseType === 'auto'
        ? determineReleaseType(commits || [])
        : releaseType;
    const newVersion = semver.inc(currentVersion, actualReleaseType);
    if (!newVersion) {
        throw new Error(`Failed to bump version ${currentVersion} with release type ${actualReleaseType}`);
    }
    return newVersion;
}
function parseVersion(version) {
    return semver.parse(version);
}
function isValidVersion(version) {
    return semver.valid(version) !== null;
}
function compareVersions(v1, v2) {
    return semver.compare(v1, v2);
}
//# sourceMappingURL=semver.js.map