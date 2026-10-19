import { RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import {
  AttributeType,
  BillingMode,
  Table,
  TableEncryption,
} from 'aws-cdk-lib/aws-dynamodb';
import { Key } from 'aws-cdk-lib/aws-kms';
import type { Construct } from 'constructs';

export class BitebookStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // @secure_recommendation: Protect stored user data with a service-owned KMS key.
    const dataKey = new Key(this, 'DataKey', {
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // @secure_recommendation: Preserve data through accidental deletion and support point-in-time recovery.
    new Table(this, 'DataTable', {
      billingMode: BillingMode.PAY_PER_REQUEST,
      deletionProtection: true,
      encryption: TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: dataKey,
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
      },
      removalPolicy: RemovalPolicy.RETAIN,
      sortKey: { name: 'entityKey', type: AttributeType.STRING },
    });
  }
}
