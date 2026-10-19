import { App } from 'aws-cdk-lib';
import { describe, expect, it } from 'vitest';

import {
  BitebookApplicationStage,
  parseDeploymentStage,
} from '../lib/BitebookApplicationStage.js';

describe('BitebookApplicationStage', () => {
  it.each([
    ['beta', 'Beta', 'Bitebook-Beta'],
    ['production', 'Production', 'Bitebook-Production'],
  ] as const)(
    'creates the %s application stage',
    (deploymentStage, stageLabel, stackName) => {
      const stage = new BitebookApplicationStage(new App(), stageLabel, {
        deploymentStage,
      });

      expect(stage.stageName).toBe(stageLabel);
      expect(stage.applicationStack.stackName).toBe(stackName);
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
