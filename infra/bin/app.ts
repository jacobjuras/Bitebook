#!/usr/bin/env node
import { App } from 'aws-cdk-lib';

import { BitebookStack } from '../lib/BitebookStack.js';

const app = new App({ analyticsReporting: false });

new BitebookStack(app, 'BitebookStack');
