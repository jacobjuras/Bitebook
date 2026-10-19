import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';

import { BitebookStack } from '../lib/BitebookStack.js';

describe('BitebookStack', () => {
  it('synthesizes without resources', () => {
    const app = new App({ analyticsReporting: false });
    const stack = new BitebookStack(app, 'TestStack');
    const resources = Template.fromStack(stack).toJSON().Resources ?? {};

    expect(resources).toEqual({});
  });
});
