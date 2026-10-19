import { Stage, type StageProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';

import { BitebookStack } from './BitebookStack.js';

export const DEPLOYMENT_STAGES = {
  beta: { label: 'Beta' },
  production: { label: 'Production' },
} as const;

export type DeploymentStage = keyof typeof DEPLOYMENT_STAGES;

export interface BitebookApplicationStageProps
  extends Omit<StageProps, 'stageName'> {
  deploymentStage: DeploymentStage;
}

/** Models one isolated deployment of the Bitebook application. */
export class BitebookApplicationStage extends Stage {
  readonly applicationStack: BitebookStack;

  constructor(
    scope: Construct,
    id: string,
    props: BitebookApplicationStageProps,
  ) {
    const { deploymentStage, ...stageProps } = props;
    const { label } = DEPLOYMENT_STAGES[deploymentStage];

    super(scope, id, { ...stageProps, stageName: label });

    // @secure_recommendation: Label each deployment so production and non-production resources remain distinguishable.
    this.applicationStack = new BitebookStack(this, 'Application', {
      stackName: `Bitebook-${label}`,
      tags: { DeploymentStage: label },
    });
  }
}

/** Validates the deployment stage selected through CDK context. */
export function parseDeploymentStage(value: unknown): DeploymentStage {
  if (
    typeof value === 'string'
    && Object.hasOwn(DEPLOYMENT_STAGES, value)
  ) {
    return value as DeploymentStage;
  }

  throw new Error('CDK context "stage" must be "beta" or "production"');
}
