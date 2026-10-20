#!/usr/bin/env node
import { App } from 'aws-cdk-lib';

import {
  BitebookApplicationStage,
  DEPLOYMENT_STAGES,
  parseDeploymentStage,
} from '../lib/BitebookApplicationStage.js';
import {
  BETA_ENVIRONMENT,
  BitebookPipelineStack,
} from '../lib/BitebookPipelineStack.js';

const app = new App({ analyticsReporting: false });

if (app.node.tryGetContext('pipeline') === 'true') {
  new BitebookPipelineStack(app, 'BitebookPipeline', {
    env: BETA_ENVIRONMENT,
    stackName: 'Bitebook-Pipeline',
    terminationProtection: true,
  });
} else {
  const deploymentStage = parseDeploymentStage(app.node.tryGetContext('stage'));
  const { label } = DEPLOYMENT_STAGES[deploymentStage];

  new BitebookApplicationStage(app, label, { deploymentStage });
}
