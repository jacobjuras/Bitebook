import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  extractPipelineStructure,
  serializePipelineStructure,
} from '../pipeline-structure.mjs';

function template(properties = {}) {
  return {
    Resources: {
      Pipeline123: {
        Properties: {
          RestartExecutionOnUpdate: true,
          Stages: [{ Name: 'Source' }],
          Tags: [{ Key: 'Owner', Value: 'Bitebook' }],
          ...properties,
        },
        Type: 'AWS::CodePipeline::Pipeline',
      },
    },
  };
}

describe('pipeline structure snapshot', () => {
  it('keeps pipeline API fields and excludes CloudFormation-only controls', () => {
    assert.deepEqual(extractPipelineStructure(template({
      DisableInboundStageTransitions: [{ StageName: 'Production' }],
      ExecutionMode: 'SUPERSEDED',
      Name: 'Bitebook',
    })), {
      LogicalId: 'Pipeline123',
      Properties: {
        ExecutionMode: 'SUPERSEDED',
        Name: 'Bitebook',
        Stages: [{ Name: 'Source' }],
      },
    });
  });

  it('sorts object keys while preserving meaningful array order', () => {
    const first = template({
      RoleArn: { 'Fn::GetAtt': ['Role', 'Arn'] },
      Stages: [{ Name: 'Source' }, { Name: 'Beta' }],
    });
    const second = {
      Resources: {
        Pipeline123: {
          Type: 'AWS::CodePipeline::Pipeline',
          Properties: {
            Stages: [{ Name: 'Source' }, { Name: 'Beta' }],
            RestartExecutionOnUpdate: true,
            RoleArn: { 'Fn::GetAtt': ['Role', 'Arn'] },
            Tags: [{ Value: 'Bitebook', Key: 'Owner' }],
          },
        },
      },
    };

    assert.equal(
      serializePipelineStructure(first),
      serializePipelineStructure(second),
    );
  });

  it('changes the snapshot for pipeline stages but not excluded controls', () => {
    const baseline = serializePipelineStructure(template());
    const changedControl = serializePipelineStructure(template({
      RestartExecutionOnUpdate: false,
      Tags: [{ Key: 'Owner', Value: 'AnotherTeam' }],
    }));
    const changedStage = serializePipelineStructure(template({
      Stages: [{ Name: 'Source' }, { Name: 'Beta' }],
    }));

    assert.equal(changedControl, baseline);
    assert.notEqual(changedStage, baseline);
  });

  it('requires exactly one pipeline resource', () => {
    assert.throws(
      () => extractPipelineStructure({ Resources: {} }),
      /Expected exactly one.*found 0/,
    );
    assert.throws(
      () => extractPipelineStructure({
        Resources: {
          First: { Type: 'AWS::CodePipeline::Pipeline' },
          Second: { Type: 'AWS::CodePipeline::Pipeline' },
        },
      }),
      /Expected exactly one.*found 2/,
    );
  });
});
