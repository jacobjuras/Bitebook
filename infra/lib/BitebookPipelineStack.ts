import { CfnParameter, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import { BuildSpec, CfnProject, LinuxBuildImage, Project } from 'aws-cdk-lib/aws-codebuild';
import {
  CfnPipeline,
  ExecutionMode,
  PipelineType,
} from 'aws-cdk-lib/aws-codepipeline';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { BlockPublicAccess, Bucket, BucketEncryption, CfnBucket, ObjectOwnership } from 'aws-cdk-lib/aws-s3';
import {
  CodeBuildStep,
  CodePipeline,
  CodePipelineSource,
} from 'aws-cdk-lib/pipelines';
import type { Construct } from 'constructs';

import { BitebookApplicationStage } from './BitebookApplicationStage.js';

export const BETA_ENVIRONMENT = {
  account: '492683309774',
  region: 'us-west-2',
} as const;

export const PRODUCTION_ENVIRONMENT = {
  account: '805982516567',
  region: 'us-west-2',
} as const;

/** Defines the self-updating pipeline that promotes Bitebook through Beta and Production. */
export class BitebookPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const connectionArn = new CfnParameter(this, 'GitHubConnectionArn', {
      allowedPattern: '^arn:aws:(?:codeconnections|codestar-connections):us-west-2:492683309774:connection/[0-9a-f-]+$',
      description: 'ARN of the GitHub connection authorized for jacobjuras/Bitebook',
    });

    // @secure_recommendation: Retain private build logs for security investigations.
    const buildLogGroup = new LogGroup(this, 'BuildLogGroup', {
      removalPolicy: RemovalPolicy.RETAIN,
      retention: RetentionDays.TEN_YEARS,
    });

    // @secure_recommendation: Keep artifact access logs private, encrypted, versioned, and ACL-free.
    const accessLogsBucket = new Bucket(this, 'ArtifactAccessLogs', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [{ expiration: Duration.days(3650) }],
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.RETAIN,
      versioned: true,
    });

    // @secure_recommendation: Encrypt cross-account pipeline artifacts with a dedicated symmetric KMS key.
    const artifactKey = new Key(this, 'ArtifactKey', {
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const artifactBucket = new Bucket(this, 'ArtifactBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      bucketKeyEnabled: true,
      encryption: BucketEncryption.KMS,
      encryptionKey: artifactKey,
      enforceSSL: true,
      lifecycleRules: [{
        abortIncompleteMultipartUploadAfter: Duration.days(7),
        expiration: Duration.days(30),
        noncurrentVersionExpiration: Duration.days(30),
      }],
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.RETAIN,
      versioned: true,
    });

    const artifactBucketResource = artifactBucket.node.defaultChild as CfnBucket;
    artifactBucketResource.loggingConfiguration = {
      destinationBucketName: accessLogsBucket.bucketName,
      logFilePrefix: 'artifact-access/',
    };
    accessLogsBucket.addToResourcePolicy(new PolicyStatement({
      actions: ['s3:PutObject'],
      conditions: {
        ArnLike: { 'aws:SourceArn': artifactBucket.bucketArn },
        StringEquals: { 'aws:SourceAccount': this.account },
      },
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal('logging.s3.amazonaws.com')],
      resources: [accessLogsBucket.arnForObjects('artifact-access/*')],
    }));

    const source = CodePipelineSource.connection(
      'jacobjuras/Bitebook',
      'main',
      { connectionArn: connectionArn.valueAsString },
    );
    const pipeline = new CodePipeline(this, 'Pipeline', {
      artifactBucket,
      executionMode: ExecutionMode.QUEUED,
      pipelineName: 'Bitebook',
      pipelineType: PipelineType.V2,
      synth: new CodeBuildStep('Synth', {
        buildEnvironment: {
          buildImage: LinuxBuildImage.STANDARD_7_0,
          privileged: false,
        },
        commands: [
          'npm ci',
          'npm run build',
          'cd infra && npx cdk synth -c pipeline=true',
        ],
        input: source,
        logging: { cloudWatch: { logGroup: buildLogGroup } },
        partialBuildSpec: BuildSpec.fromObject({
          phases: { install: { 'runtime-versions': { nodejs: 24 } } },
        }),
        primaryOutputDirectory: 'infra/cdk.out',
        timeout: Duration.minutes(20),
      }),
    });

    const beta = new BitebookApplicationStage(this, 'Beta', {
      deploymentStage: 'beta',
      env: BETA_ENVIRONMENT,
    });
    const deployedApiTests = new CodeBuildStep('DeployedApiTests', {
      buildEnvironment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
        privileged: false,
      },
      commands: [
        'npm ci',
        'npm run test:deployed --workspace @bitebook/integration-tests',
      ],
      envFromCfnOutputs: {
        BITEBOOK_API_URL: beta.applicationStack.apiUrl,
      },
      input: source,
      logging: { cloudWatch: { logGroup: buildLogGroup } },
      partialBuildSpec: BuildSpec.fromObject({
        phases: { install: { 'runtime-versions': { nodejs: 24 } } },
      }),
      timeout: Duration.minutes(10),
    });
    const mobileUiTests = new CodeBuildStep('MobileUiTests', {
      buildEnvironment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
        privileged: false,
      },
      commands: [
        'echo "Mobile UI tests skipped: runner is not configured"',
      ],
      logging: { cloudWatch: { logGroup: buildLogGroup } },
      timeout: Duration.minutes(5),
    });
    pipeline.addStage(beta, {
      post: [deployedApiTests, mobileUiTests],
    });

    const production = new BitebookApplicationStage(this, 'Production', {
      deploymentStage: 'production',
      env: PRODUCTION_ENVIRONMENT,
    });
    pipeline.addStage(production, {
      post: [new CodeBuildStep('ProductionSmokeTests', {
        buildEnvironment: {
          buildImage: LinuxBuildImage.STANDARD_7_0,
          privileged: false,
        },
        commands: [
          'npm ci',
          'npm run test:smoke --workspace @bitebook/integration-tests',
        ],
        envFromCfnOutputs: {
          BITEBOOK_API_URL: production.applicationStack.apiUrl,
        },
        input: source,
        logging: { cloudWatch: { logGroup: buildLogGroup } },
        partialBuildSpec: BuildSpec.fromObject({
          phases: { install: { 'runtime-versions': { nodejs: 24 } } },
        }),
        timeout: Duration.minutes(10),
      })],
    });

    // @secure_recommendation: Keep every generated build private and write logs only to the retained log group.
    pipeline.buildPipeline();
    const pipelineResource = pipeline.pipeline.node.defaultChild as CfnPipeline;
    pipelineResource.addPropertyOverride(
      'Stages.4.OnFailure.Result',
      'ROLLBACK',
    );
    pipelineResource.addPropertyOverride(
      'Stages.5.OnFailure.Result',
      'ROLLBACK',
    );
    for (const node of this.node.findAll()) {
      if (node instanceof Project) {
        buildLogGroup.grantWrite(node);
        const projectResource = node.node.defaultChild as CfnProject;
        projectResource.logsConfig = {
          cloudWatchLogs: {
            groupName: buildLogGroup.logGroupName,
            status: 'ENABLED',
          },
        };
        projectResource.visibility = 'PRIVATE';
      }
    }
  }
}
