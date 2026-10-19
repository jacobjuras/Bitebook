#!/usr/bin/env node
import { App } from 'aws-cdk-lib';

import {
  BitebookApplicationStage,
  DEPLOYMENT_STAGES,
  parseDeploymentStage,
} from '../lib/BitebookApplicationStage.js';

const app = new App({ analyticsReporting: false });
const deploymentStage = parseDeploymentStage(app.node.tryGetContext('stage'));
const { label } = DEPLOYMENT_STAGES[deploymentStage];

new BitebookApplicationStage(app, label, { deploymentStage });
