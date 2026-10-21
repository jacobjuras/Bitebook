import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  applicationStage: vi.fn(),
  context: new Map<string, unknown>(),
  pipelineStack: vi.fn(),
}));

vi.mock('aws-cdk-lib', () => ({
  App: class {
    readonly node = {
      tryGetContext: (key: string) => mocks.context.get(key),
    };
  },
}));

vi.mock('../../lib/BitebookApplicationStage.js', () => ({
  BitebookApplicationStage: mocks.applicationStage,
  DEPLOYMENT_STAGES: {
    beta: { label: 'Beta' },
    production: { label: 'Production' },
  },
  parseDeploymentStage: (value: unknown) => {
    if (value === 'beta' || value === 'production') {
      return value;
    }

    throw new Error('CDK context "stage" must be "beta" or "production"');
  },
}));

vi.mock('../../lib/BitebookPipelineStack.js', () => ({
  BETA_ENVIRONMENT: {
    account: '492683309774',
    region: 'us-west-2',
  },
  BitebookPipelineStack: mocks.pipelineStack,
}));

async function runApp(): Promise<void> {
  await import('../app.js');
}

describe('app', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.applicationStage.mockClear();
    mocks.context.clear();
    mocks.pipelineStack.mockClear();
  });

  it('creates the deployment pipeline when pipeline context is true', async () => {
    mocks.context.set('pipeline', 'true');

    await runApp();

    expect(mocks.pipelineStack).toHaveBeenCalledOnce();
    expect(mocks.pipelineStack).toHaveBeenCalledWith(
      expect.anything(),
      'BitebookPipeline',
      {
        env: { account: '492683309774', region: 'us-west-2' },
        stackName: 'Bitebook-Pipeline',
        terminationProtection: true,
      },
    );
    expect(mocks.applicationStage).not.toHaveBeenCalled();
  });

  it.each([
    ['beta', 'Beta'],
    ['production', 'Production'],
  ] as const)('creates the %s application stage', async (stage, label) => {
    mocks.context.set('stage', stage);

    await runApp();

    expect(mocks.applicationStage).toHaveBeenCalledOnce();
    expect(mocks.applicationStage).toHaveBeenCalledWith(
      expect.anything(),
      label,
      { deploymentStage: stage },
    );
    expect(mocks.pipelineStack).not.toHaveBeenCalled();
  });

  it('rejects an invalid application stage', async () => {
    mocks.context.set('stage', 'development');

    await expect(runApp()).rejects.toThrow(
      'CDK context "stage" must be "beta" or "production"',
    );
    expect(mocks.applicationStage).not.toHaveBeenCalled();
    expect(mocks.pipelineStack).not.toHaveBeenCalled();
  });
});
