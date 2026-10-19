import { RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
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

export class BitebookStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
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
    new NodejsFunction(this, 'ApiFunction', {
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

    // @secure_recommendation: Grant only the table operation used by Food creation.
    userDataTable.grant(apiFunctionRole, 'dynamodb:PutItem');
  }
}
