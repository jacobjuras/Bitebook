# Bitebook integration tests

This package tests Bitebook through its deployed API Gateway endpoint. Ordinary repository tests run only the package's local configuration tests; they do not contact AWS.

## Run against a deployed stage

Set the deployed API and temporary-user resource identifiers exported by the target Bitebook CloudFormation stack, then run the deployed suite:

```bash
BITEBOOK_API_URL="https://example.execute-api.us-east-1.amazonaws.com" \
BITEBOOK_USER_POOL_ID="us-east-1_example" \
BITEBOOK_USER_POOL_CLIENT_ID="exampleclientid" \
BITEBOOK_USER_DATA_TABLE_NAME="Bitebook-Beta-UserDataTable" \
  npm run test:deployed --workspace @bitebook/integration-tests
```

The authenticated suite creates a temporary Cognito user, exercises only that user’s DynamoDB partition through the deployed API, and deletes both the partition data and user during teardown.

The Production smoke suite intentionally runs only the safe authentication check:

```bash
BITEBOOK_API_URL="https://example.execute-api.us-west-2.amazonaws.com" \
  npm run test:smoke --workspace @bitebook/integration-tests
```

These resource identifiers are not credentials. The suite uses the AWS SDK credential chain for temporary-user lifecycle and cleanup, generates its temporary password in memory, and never logs or persists it. CodeBuild supplies a scoped role automatically; local runs require equivalent AWS access.
