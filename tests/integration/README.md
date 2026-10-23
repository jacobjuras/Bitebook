# Bitebook integration tests

This package tests Bitebook through its deployed API Gateway endpoint. Ordinary repository tests run only the package's local configuration tests; they do not contact AWS.

## Run against a deployed stage

Run the deployed Beta suite from the repository root:

```bash
npm test integ-tests
```

The launcher defaults to the `bitebook-beta-conduit` AWS profile, `us-west-2`, and the `Bitebook-Beta` stack. Override them only when targeting another compatible environment:

```bash
AWS_PROFILE="another-profile" \
AWS_REGION="us-west-2" \
BITEBOOK_STACK_NAME="Bitebook-Beta" \
  npm test integ-tests
```

The launcher discovers the API, User Pool, app client, and DynamoDB table from CloudFormation. CodeBuild supplies those values directly and does not use a local profile.

The authenticated suite creates a temporary Cognito user, exercises only that user’s DynamoDB partition through the deployed API, and deletes both the partition data and user during teardown.

The Production smoke suite intentionally runs only the safe authentication check:

```bash
BITEBOOK_API_URL="https://example.execute-api.us-west-2.amazonaws.com" \
  npm run test:smoke --workspace @bitebook/integration-tests
```

These resource identifiers are not credentials. The suite uses the AWS SDK credential chain for temporary-user lifecycle and cleanup, generates its temporary password in memory, and never logs or persists it. CodeBuild supplies a scoped role automatically; local runs require equivalent AWS access.
