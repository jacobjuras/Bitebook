import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export async function handler(): Promise<APIGatewayProxyStructuredResultV2> {
  return {
    body: JSON.stringify({ message: 'Authentication required' }),
    headers: { 'content-type': 'application/json' },
    statusCode: 401,
  };
}
