import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { describe, expect, it } from 'vitest';

import { documentClient } from '../dynamodb.js';

describe('documentClient', () => {
  it('uses the DynamoDB document client interface', () => {
    expect(documentClient).toBeInstanceOf(DynamoDBDocumentClient);
  });
});
