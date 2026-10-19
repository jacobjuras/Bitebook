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

  it('creates a protected email User Pool', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      AccountRecoverySetting: {
        RecoveryMechanisms: [{ Name: 'verified_email', Priority: 1 }],
      },
      AdminCreateUserConfig: { AllowAdminCreateUserOnly: true },
      AutoVerifiedAttributes: ['email'],
      DeletionProtection: 'ACTIVE',
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          PasswordHistorySize: 1,
          RequireLowercase: false,
          RequireNumbers: false,
          RequireSymbols: false,
          RequireUppercase: false,
          TemporaryPasswordValidityDays: 3,
        },
      },
      UserPoolTier: 'ESSENTIALS',
      UsernameAttributes: ['email'],
      UsernameConfiguration: { CaseSensitive: false },
    });
    template.hasResource('AWS::Cognito::UserPool', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
    template.resourceCountIs('AWS::Cognito::IdentityPool', 0);
  });

  it('creates a secretless mobile User Pool client', () => {
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      AccessTokenValidity: 60,
      AllowedOAuthFlowsUserPoolClient: false,
      EnableTokenRevocation: true,
      ExplicitAuthFlows: ['ALLOW_USER_SRP_AUTH'],
      GenerateSecret: false,
      IdTokenValidity: 60,
      PreventUserExistenceErrors: 'ENABLED',
      RefreshTokenRotation: {
        Feature: 'ENABLED',
        RetryGracePeriodSeconds: 10,
      },
      RefreshTokenValidity: 525_600,
      SupportedIdentityProviders: ['COGNITO'],
    });
  });

  it('creates a JWT-protected HTTP API', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      DisableExecuteApiEndpoint: false,
      ProtocolType: 'HTTP',
    });
    template.hasResourceProperties('AWS::ApiGatewayV2::Authorizer', {
      AuthorizerType: 'JWT',
      IdentitySource: ['$request.header.Authorization'],
      JwtConfiguration: {
        Audience: [Match.anyValue()],
        Issuer: Match.anyValue(),
      },
    });
    template.resourceCountIs('AWS::ApiGatewayV2::Route', 15);
    template.allResourcesProperties('AWS::ApiGatewayV2::Route', {
      AuthorizationType: 'JWT',
      AuthorizerId: Match.anyValue(),
    });
  });

  it('scopes Lambda invocation to authenticated API routes', () => {
    template.resourceCountIs('AWS::Lambda::Permission', 15);
    template.allResourcesProperties('AWS::Lambda::Permission', {
      Action: 'lambda:InvokeFunction',
      Principal: 'apigateway.amazonaws.com',
      SourceArn: Match.anyValue(),
    });
  });

  it('retains structured API access logs', () => {
    template.resourceCountIs('AWS::Logs::LogGroup', 2);
    template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
      AccessLogSettings: {
        DestinationArn: Match.anyValue(),
        Format: Match.stringLikeRegexp('requestId'),
      },
      AutoDeploy: true,
      StageName: '$default',
    });
  });
});
