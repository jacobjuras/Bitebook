# Bitebook integration tests

This package tests Bitebook through its deployed API Gateway endpoint. Ordinary repository tests run only the package's local configuration tests; they do not contact AWS.

## Run against a deployed stage

Set the public API base URL exported by the target Bitebook CloudFormation stack, then run the deployed suite:

```bash
BITEBOOK_API_URL="https://example.execute-api.us-east-1.amazonaws.com" \
  npm run test:deployed --workspace @bitebook/integration-tests
```

The Production smoke suite intentionally runs only the safe authentication check:

```bash
BITEBOOK_API_URL="https://example.execute-api.us-west-2.amazonaws.com" \
  npm run test:smoke --workspace @bitebook/integration-tests
```

The URL is not a credential. Authentication secrets required by future tests must come from the CI secret provider and must never be committed or printed.
