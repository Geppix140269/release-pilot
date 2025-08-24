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
exports.loadConfig = loadConfig;
exports.getInputOrConfig = getInputOrConfig;
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
const defaultConfig = {
    projectName: path.basename(process.cwd()),
    releaseSections: ['feat', 'fix', 'perf', 'refactor'],
    excludedScopes: ['ci', 'chore'],
    prChecklist: [
        'Tests added/updated',
        'Documentation updated',
        'Breaking changes documented'
    ],
    versionFile: 'package.json'
};
async function loadConfig() {
    const configPath = path.join(process.cwd(), '.releasepilot.yml');
    if (!fs.existsSync(configPath)) {
        core.info('No .releasepilot.yml found, using default configuration');
        return defaultConfig;
    }
    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const userConfig = yaml.load(configContent);
        const config = {
            ...defaultConfig,
            ...userConfig,
            projectName: userConfig.projectName || defaultConfig.projectName,
            releaseSections: userConfig.releaseSections || defaultConfig.releaseSections,
            excludedScopes: userConfig.excludedScopes || defaultConfig.excludedScopes,
            prChecklist: userConfig.prChecklist || defaultConfig.prChecklist,
            versionFile: userConfig.versionFile || defaultConfig.versionFile
        };
        if (config.notificationChannels?.slack?.webhookUrl) {
            config.notificationChannels.slack.webhookUrl = expandEnvVars(config.notificationChannels.slack.webhookUrl);
        }
        if (config.notificationChannels?.teams?.webhookUrl) {
            config.notificationChannels.teams.webhookUrl = expandEnvVars(config.notificationChannels.teams.webhookUrl);
        }
        return config;
    }
    catch (error) {
        core.warning(`Failed to load .releasepilot.yml: ${error}`);
        return defaultConfig;
    }
}
function expandEnvVars(str) {
    return str.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
        return process.env[envVar] || '';
    });
}
function getInputOrConfig(inputName, configValue, defaultValue) {
    const inputValue = core.getInput(inputName);
    if (inputValue && inputValue !== '') {
        return inputValue;
    }
    return configValue !== undefined ? configValue : defaultValue;
}
//# sourceMappingURL=config.js.map