import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { CodePipeline } from 'aws-cdk-lib/pipelines';
import { describe, expect, it, vi } from 'vitest';

import {
  BETA_ENVIRONMENT,
  BitebookPipelineStack,
  PRODUCTION_ENVIRONMENT,
} from '../BitebookPipelineStack.js';

describe('BitebookPipelineStack', () => {
  const stack = new BitebookPipelineStack(new App(), 'Pipeline', {
    env: BETA_ENVIRONMENT,
  });
  const template = Template.fromStack(stack);

  it('records the deployment environments', () => {
    expect(BETA_ENVIRONMENT).toEqual({
      account: '492683309774',
      region: 'us-west-2',
    });
    expect(PRODUCTION_ENVIRONMENT).toEqual({
      account: '805982516567',
      region: 'us-west-2',
    });
  });

  it('accepts only the Beta account GitHub connection', () => {
    template.hasParameter('GitHubConnectionArn', {
      AllowedPattern: '^arn:aws:(?:codeconnections|codestar-connections):us-west-2:492683309774:connection/[0-9a-f-]+$',
      Type: 'String',
    });
  });

  it('grants the GitHub App source role access to its connection', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'codeconnections:UseConnection',
            Resource: { Ref: 'GitHubConnectionArn' },
          }),
        ]),
      },
    });
  });

  it('deploys main through Beta and Production in queued executions', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      ExecutionMode: 'QUEUED',
      Name: 'Bitebook',
      PipelineType: 'V2',
      Stages: Match.arrayWith([
        Match.objectLike({
          Actions: Match.arrayWith([
            Match.objectLike({
              Configuration: Match.objectLike({
                BranchName: 'main',
                FullRepositoryId: 'jacobjuras/Bitebook',
              }),
            }),
          ]),
          Name: 'Source',
        }),
        Match.objectLike({
          Name: 'Beta',
          OnFailure: { Result: 'ROLLBACK' },
        }),
        Match.objectLike({
          Name: 'Production',
          OnFailure: { Result: 'ROLLBACK' },
        }),
      ]),
    });
  });

  it('tests the deployed Beta API before promotion', () => {
    template.hasResourceProperties('AWS::CodeBuild::Project', {
      Description: Match.stringLikeRegexp('DeployedApiTests'),
      Source: {
        BuildSpec: Match.stringLikeRegexp(
          'nodejs[\\s\\S]*24[\\s\\S]*test:deployed',
        ),
        Type: 'CODEPIPELINE',
      },
      TimeoutInMinutes: 10,
    });

    const pipelines = template.findResources('AWS::CodePipeline::Pipeline');
    const renderedPipeline = JSON.stringify(pipelines);
    expect(renderedPipeline).toContain('DeployedApiTests');
    expect(renderedPipeline).toContain('BITEBOOK_API_URL');
    expect(renderedPipeline).toContain('.ApiUrl}');
  });

  it('skips mobile UI tests until their runner is configured', () => {
    template.hasResourceProperties('AWS::CodeBuild::Project', {
      Description: Match.stringLikeRegexp('MobileUiTests'),
      Source: {
        BuildSpec: Match.stringLikeRegexp(
          'Mobile UI tests skipped: runner is not configured',
        ),
        Type: 'CODEPIPELINE',
      },
      TimeoutInMinutes: 5,
    });

    const pipelines = template.findResources('AWS::CodePipeline::Pipeline');
    expect(JSON.stringify(pipelines)).toContain('MobileUiTests');
  });

  it('smoke tests Production after both Beta gates pass', () => {
    template.hasResourceProperties('AWS::CodeBuild::Project', {
      Description: Match.stringLikeRegexp('ProductionSmokeTests'),
      Source: {
        BuildSpec: Match.stringLikeRegexp(
          'nodejs[\\s\\S]*24[\\s\\S]*test:smoke',
        ),
        Type: 'CODEPIPELINE',
      },
      TimeoutInMinutes: 10,
    });

    const pipelines = template.findResources('AWS::CodePipeline::Pipeline');
    const renderedPipeline = JSON.stringify(pipelines);
    expect(renderedPipeline).toContain('ProductionSmokeTests');
    expect(renderedPipeline).toContain('BITEBOOK_API_URL');
    expect(renderedPipeline).toContain('.ApiUrl}');
  });

  it('protects pipeline artifacts and their access logs', () => {
    template.resourceCountIs('AWS::S3::Bucket', 2);
    template.allResourcesProperties('AWS::S3::Bucket', {
      OwnershipControls: {
        Rules: [{ ObjectOwnership: 'BucketOwnerEnforced' }],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      VersioningConfiguration: { Status: 'Enabled' },
    });
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [Match.objectLike({
          ServerSideEncryptionByDefault: {
            KMSMasterKeyID: Match.anyValue(),
            SSEAlgorithm: 'aws:kms',
          },
        })],
      },
      LoggingConfiguration: {
        DestinationBucketName: Match.anyValue(),
        LogFilePrefix: 'artifact-access/',
      },
    });
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:PutObject',
            Principal: { Service: 'logging.s3.amazonaws.com' },
          }),
        ]),
      },
    });
  });

  it('retains the artifact key and build logs', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
    template.hasResource('AWS::KMS::Key', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 3653,
    });
    template.hasResource('AWS::Logs::LogGroup', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
  });

  it('fails when CDK does not generate the source action role', () => {
    const buildPipeline = vi.spyOn(CodePipeline.prototype, 'buildPipeline')
      .mockImplementation(function buildWithoutSourceRole(this: CodePipeline) {
        Object.defineProperty(this, 'pipeline', {
          configurable: true,
          value: {
            node: {
              defaultChild: {
                addPropertyOverride: vi.fn(),
              },
            },
          },
        });
      });

    try {
      expect(() => new BitebookPipelineStack(new App(), 'MissingSourceRole', {
        env: BETA_ENVIRONMENT,
      })).toThrow('Pipeline source action role was not generated');
    } finally {
      buildPipeline.mockRestore();
    }
  });

  it('keeps every generated build private and non-privileged', () => {
    template.resourceCountIs('AWS::CodeBuild::Project', 6);
    template.allResourcesProperties('AWS::CodeBuild::Project', {
      Environment: Match.objectLike({ PrivilegedMode: false }),
      LogsConfig: {
        CloudWatchLogs: {
          GroupName: Match.anyValue(),
          Status: 'ENABLED',
        },
      },
      Visibility: 'PRIVATE',
    });
    template.resourceCountIs('AWS::IAM::User', 0);
  });
});
