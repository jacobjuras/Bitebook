import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';

import {
  BitebookApplicationStage,
  parseDeploymentStage,
} from '../lib/BitebookApplicationStage.js';

describe('BitebookApplicationStage', () => {
  it.each([
    ['beta', 'Beta', 'Bitebook-Beta', 'bitebook-beta-492683309774'],
    [
      'production',
      'Production',
      'Bitebook-Production',
      'bitebook-production-805982516567',
    ],
  ] as const)(
    'creates the %s application stage',
    (deploymentStage, stageLabel, stackName, cognitoDomainPrefix) => {
      const stage = new BitebookApplicationStage(new App(), stageLabel, {
        deploymentStage,
      });

      expect(stage.stageName).toBe(stageLabel);
      expect(stage.applicationStack.stackName).toBe(stackName);
      Template.fromStack(stage.applicationStack).hasResourceProperties(
        'AWS::Cognito::UserPoolDomain',
        { Domain: cognitoDomainPrefix },
      );
      expect(stage.applicationStack.tags.tagValues()).toEqual({
        DeploymentStage: stageLabel,
      });
    },
  );

  it('propagates the target account and region to the application stack', () => {
    const stage = new BitebookApplicationStage(new App(), 'Beta', {
      deploymentStage: 'beta',
      env: { account: '111111111111', region: 'us-east-1' },
    });

    expect(stage.applicationStack.account).toBe('111111111111');
    expect(stage.applicationStack.region).toBe('us-east-1');
  });
});

describe('parseDeploymentStage', () => {
  it.each(['beta', 'production'] as const)('accepts %s', (stage) => {
    expect(parseDeploymentStage(stage)).toBe(stage);
  });

  it.each([undefined, 'dev', 'prod'])('rejects %s', (stage) => {
    expect(() => parseDeploymentStage(stage)).toThrow(
      'CDK context "stage" must be "beta" or "production"',
    );
  });
});
