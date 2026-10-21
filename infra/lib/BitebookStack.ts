import { MIN_PASSWORD_LENGTH } from '@bitebook/domain/authentication';
import {
  Aws,
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from 'aws-cdk-lib';
import { AccessLogFormat } from 'aws-cdk-lib/aws-apigateway';
import {
  HttpApi,
  HttpMethod,
  HttpStage,
  LogGroupLogDestination,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import {
  AccountRecovery,
  FeaturePlan,
  OAuthScope,
  UserPool,
  UserPoolClientIdentityProvider,
} from 'aws-cdk-lib/aws-cognito';
import {
  AttributeType,
  BillingMode,
  Table,
  TableEncryption,
} from 'aws-cdk-lib/aws-dynamodb';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import {
  LoggingFormat,
  Runtime,
  SystemLogLevel,
} from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import type { Construct } from 'constructs';

export interface BitebookStackProps extends StackProps {
  cognitoDomainPrefix: string;
}

export class BitebookStack extends Stack {
  readonly apiUrl: CfnOutput;

  constructor(scope: Construct, id: string, props: BitebookStackProps) {
    super(scope, id, props);

    // @secure_recommendation: Protect stored user data with a service-owned KMS key.
    const userDataKey = new Key(this, 'UserDataKey', {
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // @secure_recommendation: Preserve data through accidental deletion and support point-in-time recovery.
    const userDataTable = new Table(this, 'UserDataTable', {
      billingMode: BillingMode.PAY_PER_REQUEST,
      deletionProtection: true,
      encryption: TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: userDataKey,
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: RemovalPolicy.RETAIN,
      sortKey: { name: 'entityKey', type: AttributeType.STRING },
    });

    // @secure_recommendation: Retain structured Lambda logs for security investigations.
    const apiLogGroup = new LogGroup(this, 'ApiFunctionLogGroup', {
      removalPolicy: RemovalPolicy.RETAIN,
      retention: RetentionDays.TEN_YEARS,
    });

    // @secure_recommendation: Start the API execution role with only required log access.
    const apiFunctionRole = new Role(this, 'ApiFunctionRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    apiLogGroup.grantWrite(apiFunctionRole);

    // @secure_recommendation: Keep the Lambda private with only its required logging permissions.
    const apiFunction = new NodejsFunction(this, 'ApiFunction', {
      entry: '../services/api/src/index.ts',
      environment: {
        USER_DATA_TABLE_NAME: userDataTable.tableName,
      },
      handler: 'handler',
      logGroup: apiLogGroup,
      loggingFormat: LoggingFormat.JSON,
      role: apiFunctionRole,
      runtime: Runtime.NODEJS_24_X,
      systemLogLevelV2: SystemLogLevel.INFO,
    });

    // @secure_recommendation: Grant only the table operations used by Food APIs.
    userDataTable.grant(
      apiFunctionRole,
      'dynamodb:DeleteItem',
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:Query',
      'dynamodb:TransactWriteItems',
      'dynamodb:UpdateItem',
    );

    // @secure_recommendation: Protect accounts with verified, case-insensitive email identities.
    const userPool = new UserPool(this, 'UserPool', {
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      autoVerify: { email: true },
      deletionProtection: true,
      featurePlan: FeaturePlan.LITE,
      passwordPolicy: {
        minLength: MIN_PASSWORD_LENGTH,
        requireDigits: false,
        requireLowercase: false,
        requireSymbols: false,
        requireUppercase: false,
        tempPasswordValidity: Duration.days(3),
      },
      removalPolicy: RemovalPolicy.RETAIN,
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      signInCaseSensitive: false,
      standardAttributes: {
        email: { mutable: true, required: true },
      },
    });

    const userPoolDomain = userPool.addDomain('Domain', {
      cognitoDomain: { domainPrefix: props.cognitoDomainPrefix },
    });

    // @secure_recommendation: Native applications cannot safely hold client secrets.
    const mobileAppClient = userPool.addClient('MobileAppClient', {
      accessTokenValidity: Duration.hours(1),
      authFlows: { userPassword: true },
      enableTokenRevocation: true,
      generateSecret: false,
      idTokenValidity: Duration.hours(1),
      oAuth: {
        callbackUrls: ['bitebook://auth/callback'],
        flows: { authorizationCodeGrant: true },
        logoutUrls: ['bitebook://auth/signout'],
        scopes: [OAuthScope.EMAIL, OAuthScope.OPENID],
      },
      preventUserExistenceErrors: true,
      refreshTokenRotationGracePeriod: Duration.seconds(10),
      refreshTokenValidity: Duration.days(90),
      supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],
    });

    const apiAuthorizer = new HttpUserPoolAuthorizer(
      'ApiAuthorizer',
      userPool,
      { userPoolClients: [mobileAppClient] },
    );
    const apiIntegration = new HttpLambdaIntegration(
      'ApiIntegration',
      apiFunction,
    );

    // @secure_recommendation: The mobile app requires public ingress; every route remains JWT-authenticated.
    const api = new HttpApi(this, 'HttpApi', {
      createDefaultStage: false,
      defaultAuthorizer: apiAuthorizer,
      disableExecuteApiEndpoint: false,
    });
    const routes: [string, HttpMethod[]][] = [
      ['/foods', [HttpMethod.GET, HttpMethod.POST]],
      ['/foods/{foodId}', [HttpMethod.DELETE, HttpMethod.GET, HttpMethod.PATCH]],
      ['/foods/{foodId}/stock-adjustments', [HttpMethod.POST]],
      ['/meals', [HttpMethod.GET, HttpMethod.POST]],
      ['/meals/{mealId}', [HttpMethod.DELETE, HttpMethod.GET, HttpMethod.PATCH]],
      ['/nutrition-goals', [HttpMethod.POST]],
      ['/nutrition-goals/{effectiveFrom}', [HttpMethod.DELETE, HttpMethod.PUT]],
      ['/nutrition-goals/effective', [HttpMethod.GET]],
      ['/profile', [HttpMethod.GET, HttpMethod.PUT]],
    ];
    for (const [path, methods] of routes) {
      api.addRoutes({
        authorizer: apiAuthorizer,
        integration: apiIntegration,
        methods,
        path,
      });
    }

    // @secure_recommendation: Log request metadata without request bodies or authorization headers.
    const apiAccessLogGroup = new LogGroup(this, 'ApiAccessLogGroup', {
      removalPolicy: RemovalPolicy.RETAIN,
      retention: RetentionDays.TEN_YEARS,
    });
    new HttpStage(this, 'HttpApiStage', {
      accessLogSettings: {
        destination: new LogGroupLogDestination(apiAccessLogGroup),
        format: AccessLogFormat.custom(JSON.stringify({
          integrationStatus: '$context.integrationStatus',
          latency: '$context.responseLatency',
          requestId: '$context.requestId',
          routeKey: '$context.routeKey',
          status: '$context.status',
        })),
      },
      autoDeploy: true,
      httpApi: api,
    });

    // @secure_recommendation: Export only public client configuration, never credentials or secrets.
    this.apiUrl = new CfnOutput(this, 'ApiUrl', {
      value: api.apiEndpoint,
    });
    new CfnOutput(this, 'CognitoRegion', { value: Aws.REGION });
    new CfnOutput(this, 'CognitoUrl', { value: userPoolDomain.baseUrl() });
    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', {
      value: mobileAppClient.userPoolClientId,
    });
  }
}
