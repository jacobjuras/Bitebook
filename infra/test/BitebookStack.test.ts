import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, it } from 'vitest';

import { BitebookStack } from '../lib/BitebookStack.js';

describe('BitebookStack', () => {
  const app = new App({ analyticsReporting: false });
  const template = Template.fromStack(new BitebookStack(app, 'TestStack'));

  it('creates a protected user data table', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'entityKey', AttributeType: 'S' },
      ],
      BillingMode: 'PAY_PER_REQUEST',
      DeletionProtectionEnabled: true,
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
        { AttributeName: 'entityKey', KeyType: 'RANGE' },
      ],
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true,
      },
      SSESpecification: {
        KMSMasterKeyId: Match.anyValue(),
        SSEEnabled: true,
        SSEType: 'KMS',
      },
    });

    template.hasResource('AWS::DynamoDB::Table', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
  });

  it('protects the table encryption key', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
    template.hasResource('AWS::KMS::Key', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
  });

  it('packages the fail-closed API as a private Lambda', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          USER_DATA_TABLE_NAME: Match.anyValue(),
        },
      },
      Handler: 'index.handler',
      LoggingConfig: {
        LogFormat: 'JSON',
        LogGroup: Match.anyValue(),
        SystemLogLevel: 'INFO',
      },
      Runtime: 'nodejs24.x',
    });
    template.resourceCountIs('AWS::Lambda::Url', 0);
    template.resourceCountIs('AWS::Lambda::Permission', 0);
  });

  it('grants only required log and Food write access', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 3653,
    });
    template.hasResource('AWS::Logs::LogGroup', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
            Effect: 'Allow',
            Resource: Match.anyValue(),
          },
          {
            Action: [
              'dynamodb:DeleteItem',
              'dynamodb:GetItem',
              'dynamodb:PutItem',
              'dynamodb:Query',
              'dynamodb:TransactWriteItems',
              'dynamodb:UpdateItem',
            ],
            Effect: 'Allow',
            Resource: [Match.anyValue()],
          },
        ],
      },
    });
  });
});
