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
exports.handleDeployment = handleDeployment;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const exec = __importStar(require("@actions/exec"));
const notify_1 = require("./notify");
async function handleDeployment(config, version, isDryRun) {
    const startTime = Date.now();
    const context = github.context;
    const branch = context.ref.replace('refs/heads/', '');
    core.info(`🚀 Starting deployment for branch: ${branch}`);
    // Load deployment configuration
    const deployConfig = await loadDeploymentConfig(config, branch);
    if (!deployConfig) {
        core.info(`No deployment configuration found for branch: ${branch}`);
        return {
            success: false,
            environment: 'none',
            version,
            duration: Date.now() - startTime,
            error: 'No deployment configuration for this branch'
        };
    }
    // Check if deployment needs approval
    if (!deployConfig.autoApprove && deployConfig.approvers) {
        const approved = await checkDeploymentApproval(deployConfig.approvers);
        if (!approved) {
            core.warning('Deployment requires approval. Skipping...');
            return {
                success: false,
                environment: deployConfig.environment,
                version,
                duration: Date.now() - startTime,
                error: 'Deployment requires approval'
            };
        }
    }
    // Create GitHub deployment
    const deployment = await createGitHubDeployment(deployConfig.environment, version, isDryRun);
    try {
        // Run pre-deployment commands
        if (deployConfig.preDeployCommand) {
            core.info('Running pre-deployment commands...');
            await exec.exec(deployConfig.preDeployCommand);
        }
        // Execute deployment based on provider
        let result;
        switch (deployConfig.provider) {
            case 'aws':
                result = await deployToAWS(deployConfig, version, isDryRun);
                break;
            case 'azure':
                result = await deployToAzure(deployConfig, version, isDryRun);
                break;
            case 'gcp':
                result = await deployToGCP(deployConfig, version, isDryRun);
                break;
            case 'vercel':
                result = await deployToVercel(deployConfig, version, isDryRun);
                break;
            case 'netlify':
                result = await deployToNetlify(deployConfig, version, isDryRun);
                break;
            case 'heroku':
                result = await deployToHeroku(deployConfig, version, isDryRun);
                break;
            case 'kubernetes':
                result = await deployToKubernetes(deployConfig, version, isDryRun);
                break;
            case 'docker':
                result = await deployToDocker(deployConfig, version, isDryRun);
                break;
            default:
                throw new Error(`Unsupported deployment provider: ${deployConfig.provider}`);
        }
        // Run health check
        if (deployConfig.healthCheck && !isDryRun) {
            core.info('Running health check...');
            const healthy = await runHealthCheck(deployConfig.healthCheck);
            if (!healthy && deployConfig.rollbackOnFailure) {
                core.warning('Health check failed. Initiating rollback...');
                await rollbackDeployment(deployConfig, deployment?.id);
                result.success = false;
                result.error = 'Health check failed - deployment rolled back';
            }
        }
        // Run post-deployment commands
        if (deployConfig.postDeployCommand && result.success) {
            core.info('Running post-deployment commands...');
            await exec.exec(deployConfig.postDeployCommand);
        }
        // Update GitHub deployment status
        if (deployment) {
            await updateGitHubDeploymentStatus(deployment.id, result.success ? 'success' : 'failure', deployConfig.url);
        }
        // Send notifications
        await (0, notify_1.sendNotifications)(version, [], config);
        result.duration = Date.now() - startTime;
        return result;
    }
    catch (error) {
        core.error(`Deployment failed: ${error}`);
        // Rollback on failure if configured
        if (deployConfig.rollbackOnFailure && !isDryRun) {
            core.warning('Initiating rollback due to deployment failure...');
            await rollbackDeployment(deployConfig, deployment?.id);
        }
        // Update deployment status
        if (deployment) {
            await updateGitHubDeploymentStatus(deployment.id, 'failure');
        }
        return {
            success: false,
            environment: deployConfig.environment,
            version,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
async function loadDeploymentConfig(config, branch) {
    // Check if deployment configuration exists in .releasepilot.yml
    const deployments = config.deployments;
    if (!deployments) {
        return null;
    }
    // Map branch to environment
    for (const [env, deployConfig] of Object.entries(deployments)) {
        const deployment = deployConfig;
        if (deployment.branch === branch ||
            (typeof deployment.branch === 'string' && new RegExp(deployment.branch).test(branch))) {
            return {
                ...deployment,
                environment: env
            };
        }
    }
    return null;
}
async function deployToAWS(config, version, isDryRun) {
    core.info('Deploying to AWS...');
    if (isDryRun) {
        core.info('[DRY RUN] Would deploy to AWS');
        return {
            success: true,
            environment: config.environment,
            version,
            duration: 0
        };
    }
    // Set AWS credentials
    if (config.secrets?.AWS_ACCESS_KEY_ID) {
        await exec.exec(`aws configure set aws_access_key_id ${config.secrets.AWS_ACCESS_KEY_ID}`);
        await exec.exec(`aws configure set aws_secret_access_key ${config.secrets.AWS_SECRET_ACCESS_KEY}`);
    }
    const region = config.variables?.AWS_REGION || 'us-east-1';
    switch (config.strategy) {
        case 'blue-green':
            return deployAWSBlueGreen(config, version, region);
        case 'canary':
            return deployAWSCanary(config, version, region);
        case 'rolling':
            return deployAWSRolling(config, version, region);
        default:
            return deployAWSDirect(config, version, region);
    }
}
async function deployAWSDirect(config, version, region) {
    const appName = config.variables?.APP_NAME || 'releasepilot-app';
    // Deploy to Elastic Beanstalk
    if (config.variables?.SERVICE === 'elasticbeanstalk') {
        await exec.exec(`aws elasticbeanstalk create-application-version \
      --application-name ${appName} \
      --version-label ${version} \
      --source-bundle S3Bucket=${config.variables.S3_BUCKET},S3Key=${version}.zip \
      --region ${region}`);
        await exec.exec(`aws elasticbeanstalk update-environment \
      --application-name ${appName} \
      --environment-name ${config.environment} \
      --version-label ${version} \
      --region ${region}`);
    }
    // Deploy to ECS
    else if (config.variables?.SERVICE === 'ecs') {
        const cluster = config.variables.ECS_CLUSTER || 'default';
        const service = config.variables.ECS_SERVICE || appName;
        await exec.exec(`aws ecs update-service \
      --cluster ${cluster} \
      --service ${service} \
      --force-new-deployment \
      --region ${region}`);
    }
    // Deploy to Lambda
    else if (config.variables?.SERVICE === 'lambda') {
        const functionName = config.variables.LAMBDA_FUNCTION || appName;
        await exec.exec(`aws lambda update-function-code \
      --function-name ${functionName} \
      --s3-bucket ${config.variables.S3_BUCKET} \
      --s3-key ${version}.zip \
      --region ${region}`);
        await exec.exec(`aws lambda publish-version \
      --function-name ${functionName} \
      --description "Version ${version}" \
      --region ${region}`);
    }
    return {
        success: true,
        environment: config.environment,
        version,
        url: config.url,
        duration: 0
    };
}
async function deployAWSBlueGreen(config, version, region) {
    core.info('Executing Blue-Green deployment strategy...');
    const appName = config.variables?.APP_NAME || 'releasepilot-app';
    const targetGroup = config.variables?.TARGET_GROUP;
    // Create new environment (Green)
    await exec.exec(`aws elasticbeanstalk create-environment \
    --application-name ${appName} \
    --environment-name ${config.environment}-green \
    --version-label ${version} \
    --region ${region}`);
    // Wait for environment to be ready
    await exec.exec(`aws elasticbeanstalk wait environment-updated \
    --application-name ${appName} \
    --environment-name ${config.environment}-green \
    --region ${region}`);
    // Switch traffic to green environment
    if (targetGroup) {
        await exec.exec(`aws elbv2 modify-target-group \
      --target-group-arn ${targetGroup} \
      --health-check-path ${config.healthCheck || '/health'} \
      --region ${region}`);
    }
    // Swap URLs
    await exec.exec(`aws elasticbeanstalk swap-environment-cnames \
    --source-environment-name ${config.environment} \
    --destination-environment-name ${config.environment}-green \
    --region ${region}`);
    return {
        success: true,
        environment: config.environment,
        version,
        url: config.url,
        deploymentId: `${config.environment}-green`,
        duration: 0
    };
}
async function deployAWSCanary(config, version, region) {
    core.info('Executing Canary deployment strategy...');
    const functionName = config.variables?.LAMBDA_FUNCTION || 'releasepilot-function';
    const canaryPercentage = config.variables?.CANARY_PERCENTAGE || '10';
    // Create new Lambda version
    const { stdout } = await exec.getExecOutput(`aws lambda publish-version \
    --function-name ${functionName} \
    --description "Version ${version}" \
    --region ${region}`);
    const versionNumber = JSON.parse(stdout).Version;
    // Update alias with canary traffic
    await exec.exec(`aws lambda update-alias \
    --function-name ${functionName} \
    --name ${config.environment} \
    --function-version ${versionNumber} \
    --routing-config AdditionalVersionWeights={${versionNumber}=${canaryPercentage}} \
    --region ${region}`);
    // Wait and monitor metrics
    await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
    // Check CloudWatch metrics
    const metricsOk = await checkCanaryMetrics(functionName, region);
    if (metricsOk) {
        // Promote canary to 100%
        await exec.exec(`aws lambda update-alias \
      --function-name ${functionName} \
      --name ${config.environment} \
      --function-version ${versionNumber} \
      --region ${region}`);
    }
    return {
        success: metricsOk,
        environment: config.environment,
        version,
        url: config.url,
        duration: 0
    };
}
async function deployAWSRolling(config, version, region) {
    core.info('Executing Rolling deployment strategy...');
    const cluster = config.variables?.ECS_CLUSTER || 'default';
    const service = config.variables?.ECS_SERVICE || 'releasepilot-service';
    const batchSize = parseInt(config.variables?.BATCH_SIZE || '25');
    // Update ECS service with rolling update
    await exec.exec(`aws ecs update-service \
    --cluster ${cluster} \
    --service ${service} \
    --force-new-deployment \
    --deployment-configuration maximumPercent=200,minimumHealthyPercent=${100 - batchSize} \
    --region ${region}`);
    // Wait for service to stabilize
    await exec.exec(`aws ecs wait services-stable \
    --cluster ${cluster} \
    --services ${service} \
    --region ${region}`);
    return {
        success: true,
        environment: config.environment,
        version,
        url: config.url,
        duration: 0
    };
}
async function deployToKubernetes(config, version, isDryRun) {
    core.info('Deploying to Kubernetes...');
    if (isDryRun) {
        core.info('[DRY RUN] Would deploy to Kubernetes');
        return {
            success: true,
            environment: config.environment,
            version,
            duration: 0
        };
    }
    const namespace = config.variables?.K8S_NAMESPACE || 'default';
    const deployment = config.variables?.K8S_DEPLOYMENT || 'releasepilot';
    const image = `${config.variables?.REGISTRY}/${config.variables?.IMAGE}:${version}`;
    // Update deployment image
    await exec.exec(`kubectl set image deployment/${deployment} \
    ${deployment}=${image} \
    -n ${namespace} \
    --record`);
    // Apply deployment strategy
    switch (config.strategy) {
        case 'blue-green':
            return deployK8sBlueGreen(config, version, namespace, deployment);
        case 'canary':
            return deployK8sCanary(config, version, namespace, deployment);
        case 'rolling':
            return deployK8sRolling(config, version, namespace, deployment);
        default:
            // Wait for rollout to complete
            await exec.exec(`kubectl rollout status deployment/${deployment} -n ${namespace}`);
            return {
                success: true,
                environment: config.environment,
                version,
                url: config.url,
                duration: 0
            };
    }
}
async function deployK8sBlueGreen(config, version, namespace, deployment) {
    core.info('Executing Kubernetes Blue-Green deployment...');
    // Create green deployment
    await exec.exec(`kubectl create deployment ${deployment}-green \
    --image=${config.variables?.REGISTRY}/${config.variables?.IMAGE}:${version} \
    -n ${namespace}`);
    // Wait for green deployment to be ready
    await exec.exec(`kubectl wait --for=condition=available \
    --timeout=300s deployment/${deployment}-green \
    -n ${namespace}`);
    // Switch service to green deployment
    await exec.exec(`kubectl patch service ${deployment} \
    -p '{"spec":{"selector":{"version":"${version}"}}}' \
    -n ${namespace}`);
    // Delete old blue deployment
    await exec.exec(`kubectl delete deployment ${deployment} -n ${namespace}`);
    // Rename green to blue
    await exec.exec(`kubectl patch deployment ${deployment}-green \
    -p '{"metadata":{"name":"${deployment}"}}' \
    -n ${namespace}`);
    return {
        success: true,
        environment: config.environment,
        version,
        url: config.url,
        duration: 0
    };
}
async function deployK8sCanary(config, version, namespace, deployment) {
    core.info('Executing Kubernetes Canary deployment...');
    const canaryPercentage = parseInt(config.variables?.CANARY_PERCENTAGE || '10');
    // Create canary deployment with fewer replicas
    const { stdout } = await exec.getExecOutput(`kubectl get deployment ${deployment} \
    -n ${namespace} -o jsonpath='{.spec.replicas}'`);
    const totalReplicas = parseInt(stdout);
    const canaryReplicas = Math.max(1, Math.floor(totalReplicas * canaryPercentage / 100));
    await exec.exec(`kubectl create deployment ${deployment}-canary \
    --image=${config.variables?.REGISTRY}/${config.variables?.IMAGE}:${version} \
    --replicas=${canaryReplicas} \
    -n ${namespace}`);
    // Wait and monitor
    await new Promise(resolve => setTimeout(resolve, 60000));
    // Check metrics
    const metricsOk = await checkK8sCanaryMetrics(deployment, namespace);
    if (metricsOk) {
        // Scale up canary and scale down stable
        await exec.exec(`kubectl scale deployment ${deployment}-canary \
      --replicas=${totalReplicas} -n ${namespace}`);
        await exec.exec(`kubectl scale deployment ${deployment} \
      --replicas=0 -n ${namespace}`);
        // Rename canary to stable
        await exec.exec(`kubectl delete deployment ${deployment} -n ${namespace}`);
        await exec.exec(`kubectl patch deployment ${deployment}-canary \
      -p '{"metadata":{"name":"${deployment}"}}' \
      -n ${namespace}`);
    }
    else {
        // Rollback canary
        await exec.exec(`kubectl delete deployment ${deployment}-canary -n ${namespace}`);
    }
    return {
        success: metricsOk,
        environment: config.environment,
        version,
        url: config.url,
        duration: 0
    };
}
async function deployK8sRolling(config, version, namespace, deployment) {
    core.info('Executing Kubernetes Rolling deployment...');
    const maxSurge = config.variables?.MAX_SURGE || '25%';
    const maxUnavailable = config.variables?.MAX_UNAVAILABLE || '25%';
    // Update deployment strategy
    await exec.exec(`kubectl patch deployment ${deployment} \
    -p '{"spec":{"strategy":{"type":"RollingUpdate","rollingUpdate":{"maxSurge":"${maxSurge}","maxUnavailable":"${maxUnavailable}"}}}}' \
    -n ${namespace}`);
    // Update image
    await exec.exec(`kubectl set image deployment/${deployment} \
    ${deployment}=${config.variables?.REGISTRY}/${config.variables?.IMAGE}:${version} \
    -n ${namespace}`);
    // Wait for rollout
    await exec.exec(`kubectl rollout status deployment/${deployment} \
    -n ${namespace} --timeout=600s`);
    return {
        success: true,
        environment: config.environment,
        version,
        url: config.url,
        duration: 0
    };
}
async function deployToVercel(config, version, isDryRun) {
    core.info('Deploying to Vercel...');
    if (isDryRun) {
        core.info('[DRY RUN] Would deploy to Vercel');
        return {
            success: true,
            environment: config.environment,
            version,
            duration: 0
        };
    }
    const token = config.secrets?.VERCEL_TOKEN;
    const projectId = config.variables?.VERCEL_PROJECT_ID;
    const teamId = config.variables?.VERCEL_TEAM_ID;
    let command = `npx vercel --token ${token} --yes`;
    if (config.environment === 'production') {
        command += ' --prod';
    }
    if (projectId) {
        command += ` --project-id ${projectId}`;
    }
    if (teamId) {
        command += ` --team ${teamId}`;
    }
    const { stdout } = await exec.getExecOutput(command);
    const deploymentUrl = stdout.match(/https:\/\/[^\s]+/)?.[0];
    return {
        success: true,
        environment: config.environment,
        version,
        url: deploymentUrl || config.url,
        duration: 0
    };
}
async function deployToNetlify(config, version, isDryRun) {
    core.info('Deploying to Netlify...');
    if (isDryRun) {
        core.info('[DRY RUN] Would deploy to Netlify');
        return {
            success: true,
            environment: config.environment,
            version,
            duration: 0
        };
    }
    const token = config.secrets?.NETLIFY_AUTH_TOKEN;
    const siteId = config.variables?.NETLIFY_SITE_ID;
    let command = `npx netlify deploy --auth ${token} --site ${siteId}`;
    if (config.environment === 'production') {
        command += ' --prod';
    }
    const { stdout } = await exec.getExecOutput(command);
    const deploymentUrl = stdout.match(/https:\/\/[^\s]+/)?.[0];
    return {
        success: true,
        environment: config.environment,
        version,
        url: deploymentUrl || config.url,
        duration: 0
    };
}
async function deployToHeroku(config, version, isDryRun) {
    core.info('Deploying to Heroku...');
    if (isDryRun) {
        core.info('[DRY RUN] Would deploy to Heroku');
        return {
            success: true,
            environment: config.environment,
            version,
            duration: 0
        };
    }
    const apiKey = config.secrets?.HEROKU_API_KEY;
    const appName = config.variables?.HEROKU_APP_NAME;
    // Set Heroku credentials
    await exec.exec(`echo "${apiKey}" | heroku auth:token`);
    // Deploy
    await exec.exec(`git push heroku ${config.branch}:main --force`);
    // Set version tag
    await exec.exec(`heroku config:set VERSION=${version} -a ${appName}`);
    return {
        success: true,
        environment: config.environment,
        version,
        url: `https://${appName}.herokuapp.com`,
        duration: 0
    };
}
async function deployToDocker(config, version, isDryRun) {
    core.info('Deploying Docker container...');
    if (isDryRun) {
        core.info('[DRY RUN] Would deploy Docker container');
        return {
            success: true,
            environment: config.environment,
            version,
            duration: 0
        };
    }
    const registry = config.variables?.DOCKER_REGISTRY || 'docker.io';
    const image = config.variables?.DOCKER_IMAGE || 'releasepilot';
    const tag = `${registry}/${image}:${version}`;
    // Build Docker image
    await exec.exec(`docker build -t ${tag} .`);
    // Push to registry
    if (config.secrets?.DOCKER_USERNAME && config.secrets?.DOCKER_PASSWORD) {
        await exec.exec(`docker login -u ${config.secrets.DOCKER_USERNAME} -p ${config.secrets.DOCKER_PASSWORD} ${registry}`);
    }
    await exec.exec(`docker push ${tag}`);
    // Deploy to Docker Swarm or single host
    if (config.variables?.DOCKER_SWARM) {
        await exec.exec(`docker service update --image ${tag} ${config.variables.SERVICE_NAME}`);
    }
    else if (config.variables?.DOCKER_HOST) {
        await exec.exec(`docker -H ${config.variables.DOCKER_HOST} pull ${tag}`);
        await exec.exec(`docker -H ${config.variables.DOCKER_HOST} stop ${image} || true`);
        await exec.exec(`docker -H ${config.variables.DOCKER_HOST} run -d --name ${image} --rm ${tag}`);
    }
    return {
        success: true,
        environment: config.environment,
        version,
        url: config.url,
        duration: 0
    };
}
async function deployToAzure(config, version, isDryRun) {
    core.info('Deploying to Azure...');
    if (isDryRun) {
        core.info('[DRY RUN] Would deploy to Azure');
        return {
            success: true,
            environment: config.environment,
            version,
            duration: 0
        };
    }
    // Azure login
    if (config.secrets?.AZURE_CREDENTIALS) {
        await exec.exec(`az login --service-principal \
      -u ${config.secrets.AZURE_CLIENT_ID} \
      -p ${config.secrets.AZURE_CLIENT_SECRET} \
      --tenant ${config.secrets.AZURE_TENANT_ID}`);
    }
    const resourceGroup = config.variables?.AZURE_RESOURCE_GROUP;
    const appName = config.variables?.AZURE_APP_NAME;
    // Deploy to Azure App Service
    if (config.variables?.SERVICE === 'appservice') {
        await exec.exec(`az webapp deploy \
      --resource-group ${resourceGroup} \
      --name ${appName} \
      --src-path ./dist \
      --type zip`);
    }
    // Deploy to Azure Container Instances
    else if (config.variables?.SERVICE === 'container') {
        const image = `${config.variables.REGISTRY}/${config.variables.IMAGE}:${version}`;
        await exec.exec(`az container create \
      --resource-group ${resourceGroup} \
      --name ${appName} \
      --image ${image} \
      --dns-name-label ${appName} \
      --ports 80`);
    }
    // Deploy to Azure Functions
    else if (config.variables?.SERVICE === 'functions') {
        await exec.exec(`func azure functionapp publish ${appName}`);
    }
    return {
        success: true,
        environment: config.environment,
        version,
        url: `https://${appName}.azurewebsites.net`,
        duration: 0
    };
}
async function deployToGCP(config, version, isDryRun) {
    core.info('Deploying to Google Cloud Platform...');
    if (isDryRun) {
        core.info('[DRY RUN] Would deploy to GCP');
        return {
            success: true,
            environment: config.environment,
            version,
            duration: 0
        };
    }
    // GCP authentication
    if (config.secrets?.GCP_SA_KEY) {
        await exec.exec(`echo '${config.secrets.GCP_SA_KEY}' | gcloud auth activate-service-account --key-file=-`);
    }
    const project = config.variables?.GCP_PROJECT;
    const region = config.variables?.GCP_REGION || 'us-central1';
    // Set project
    await exec.exec(`gcloud config set project ${project}`);
    // Deploy to App Engine
    if (config.variables?.SERVICE === 'appengine') {
        await exec.exec(`gcloud app deploy --version=${version} --quiet`);
    }
    // Deploy to Cloud Run
    else if (config.variables?.SERVICE === 'cloudrun') {
        const service = config.variables?.SERVICE_NAME || 'releasepilot';
        const image = `gcr.io/${project}/${service}:${version}`;
        await exec.exec(`gcloud run deploy ${service} \
      --image ${image} \
      --region ${region} \
      --platform managed \
      --allow-unauthenticated`);
    }
    // Deploy to Cloud Functions
    else if (config.variables?.SERVICE === 'functions') {
        const functionName = config.variables?.FUNCTION_NAME || 'releasepilot';
        await exec.exec(`gcloud functions deploy ${functionName} \
      --runtime nodejs18 \
      --trigger-http \
      --allow-unauthenticated \
      --region ${region}`);
    }
    return {
        success: true,
        environment: config.environment,
        version,
        url: config.url,
        duration: 0
    };
}
async function createGitHubDeployment(environment, version, isDryRun) {
    if (isDryRun) {
        return null;
    }
    const token = core.getInput('github_token') || process.env.GITHUB_TOKEN;
    if (!token) {
        return null;
    }
    const octokit = github.getOctokit(token);
    const context = github.context;
    try {
        const { data: deployment } = await octokit.rest.repos.createDeployment({
            owner: context.repo.owner,
            repo: context.repo.repo,
            ref: context.sha,
            environment,
            description: `Deploy version ${version}`,
            auto_merge: false,
            required_contexts: [],
            production_environment: environment === 'production'
        });
        return deployment;
    }
    catch (error) {
        core.warning(`Failed to create GitHub deployment: ${error}`);
        return null;
    }
}
async function updateGitHubDeploymentStatus(deploymentId, state, url) {
    const token = core.getInput('github_token') || process.env.GITHUB_TOKEN;
    if (!token) {
        return;
    }
    const octokit = github.getOctokit(token);
    const context = github.context;
    try {
        await octokit.rest.repos.createDeploymentStatus({
            owner: context.repo.owner,
            repo: context.repo.repo,
            deployment_id: deploymentId,
            state,
            environment_url: url,
            description: state === 'success' ? 'Deployment completed' : 'Deployment failed'
        });
    }
    catch (error) {
        core.warning(`Failed to update deployment status: ${error}`);
    }
}
async function runHealthCheck(url) {
    core.info(`Running health check: ${url}`);
    const maxAttempts = 10;
    const delayMs = 5000;
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const { exitCode } = await exec.getExecOutput(`curl -f -s -o /dev/null -w "%{http_code}" ${url}`);
            if (exitCode === 0) {
                core.info('Health check passed');
                return true;
            }
        }
        catch (error) {
            core.info(`Health check attempt ${i + 1} failed`);
        }
        if (i < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    core.error('Health check failed after maximum attempts');
    return false;
}
async function rollbackDeployment(config, deploymentId) {
    core.info('Rolling back deployment...');
    switch (config.provider) {
        case 'kubernetes':
            await exec.exec(`kubectl rollout undo deployment/${config.variables?.K8S_DEPLOYMENT} \
        -n ${config.variables?.K8S_NAMESPACE || 'default'}`);
            break;
        case 'aws':
            if (config.variables?.SERVICE === 'elasticbeanstalk') {
                // Swap environments back
                await exec.exec(`aws elasticbeanstalk swap-environment-cnames \
          --source-environment-name ${config.environment}-green \
          --destination-environment-name ${config.environment}`);
            }
            break;
        case 'heroku':
            await exec.exec(`heroku rollback -a ${config.variables?.HEROKU_APP_NAME}`);
            break;
        default:
            core.warning(`Rollback not implemented for provider: ${config.provider}`);
    }
    if (deploymentId) {
        await updateGitHubDeploymentStatus(deploymentId, 'failure');
    }
}
async function checkDeploymentApproval(approvers) {
    // In a real implementation, this would check for approval via:
    // - GitHub PR reviews
    // - GitHub Issues
    // - External approval system
    // For now, we'll check if the current user is in the approvers list
    const context = github.context;
    const actor = context.actor;
    return approvers.includes(actor);
}
async function checkCanaryMetrics(functionName, region) {
    // Check CloudWatch metrics for errors
    const { stdout } = await exec.getExecOutput(`aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Errors \
    --dimensions Name=FunctionName,Value=${functionName} \
    --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 300 \
    --statistics Sum \
    --region ${region}`);
    const metrics = JSON.parse(stdout);
    const errors = metrics.Datapoints[0]?.Sum || 0;
    return errors < 5; // Threshold: less than 5 errors
}
async function checkK8sCanaryMetrics(deployment, namespace) {
    // Check pod status
    const { stdout } = await exec.getExecOutput(`kubectl get pods \
    -l app=${deployment}-canary \
    -n ${namespace} \
    -o jsonpath='{.items[*].status.phase}'`);
    const statuses = stdout.split(' ');
    const runningCount = statuses.filter(s => s === 'Running').length;
    return runningCount === statuses.length; // All pods should be running
}
//# sourceMappingURL=deploy.js.map