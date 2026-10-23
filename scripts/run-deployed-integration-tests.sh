#!/usr/bin/env bash
set -euo pipefail

script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd -- "$script_directory/.." && pwd)"
stack_name="${BITEBOOK_STACK_NAME:-Bitebook-Beta}"

if [[ -z "${CODEBUILD_BUILD_ID:-}" ]]; then
  export AWS_PROFILE="${AWS_PROFILE:-bitebook-beta-conduit}"
  export AWS_REGION="${AWS_REGION:-us-west-2}"

  if ! command -v aws >/dev/null 2>&1; then
    printf 'AWS CLI is required to run deployed integration tests locally.\n' >&2
    exit 1
  fi

  if ! aws sts get-caller-identity \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    >/dev/null 2>&1; then
    printf 'AWS profile %s is unavailable or expired. Run:\n' "$AWS_PROFILE" >&2
    if [[ "$AWS_PROFILE" == 'bitebook-beta-conduit' ]]; then
      printf '%s\n' 'ada credentials update --account=492683309774 --provider=Conduit --role=IibsAdminAccess-DO-NOT-DELETE --once --profile bitebook-beta-conduit' >&2
    else
      printf 'Refresh credentials for AWS_PROFILE=%s and retry.\n' "$AWS_PROFILE" >&2
    fi
    exit 1
  fi
fi

required_variables=(
  BITEBOOK_API_URL
  BITEBOOK_USER_DATA_TABLE_NAME
  BITEBOOK_USER_POOL_CLIENT_ID
  BITEBOOK_USER_POOL_ID
)
missing_variables=()
for variable in "${required_variables[@]}"; do
  if [[ -z "${!variable:-}" || "${!variable:-}" == 'None' ]]; then
    missing_variables+=("$variable")
  fi
done

if (( ${#missing_variables[@]} > 0 )); then
  if [[ -n "${CODEBUILD_BUILD_ID:-}" ]]; then
    printf 'CodeBuild did not provide: %s\n' "${missing_variables[*]}" >&2
    exit 1
  fi

  stack_outputs="$(
    aws cloudformation describe-stacks \
      --stack-name "$stack_name" \
      --profile "$AWS_PROFILE" \
      --region "$AWS_REGION" \
      --query 'Stacks[0].Outputs[].[OutputKey,OutputValue]' \
      --output text
  )"
  while IFS=$'\t' read -r output_key output_value; do
    case "$output_key" in
      ApiUrl)
        if [[ -z "${BITEBOOK_API_URL:-}" || "${BITEBOOK_API_URL:-}" == 'None' ]]; then
          export BITEBOOK_API_URL="$output_value"
        fi
        ;;
      UserDataTableName)
        if [[ -z "${BITEBOOK_USER_DATA_TABLE_NAME:-}" || "${BITEBOOK_USER_DATA_TABLE_NAME:-}" == 'None' ]]; then
          export BITEBOOK_USER_DATA_TABLE_NAME="$output_value"
        fi
        ;;
      UserPoolClientId)
        if [[ -z "${BITEBOOK_USER_POOL_CLIENT_ID:-}" || "${BITEBOOK_USER_POOL_CLIENT_ID:-}" == 'None' ]]; then
          export BITEBOOK_USER_POOL_CLIENT_ID="$output_value"
        fi
        ;;
      UserPoolId)
        if [[ -z "${BITEBOOK_USER_POOL_ID:-}" || "${BITEBOOK_USER_POOL_ID:-}" == 'None' ]]; then
          export BITEBOOK_USER_POOL_ID="$output_value"
        fi
        ;;
    esac
  done <<< "$stack_outputs"

  if [[ -z "${BITEBOOK_USER_DATA_TABLE_NAME:-}" || "${BITEBOOK_USER_DATA_TABLE_NAME:-}" == 'None' ]]; then
    BITEBOOK_USER_DATA_TABLE_NAME="$(
      aws cloudformation list-stack-resources \
        --stack-name "$stack_name" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query "StackResourceSummaries[?ResourceType=='AWS::DynamoDB::Table'].PhysicalResourceId | [0]" \
        --output text
    )"
    export BITEBOOK_USER_DATA_TABLE_NAME
  fi
fi

missing_variables=()
for variable in "${required_variables[@]}"; do
  if [[ -z "${!variable:-}" || "${!variable}" == 'None' ]]; then
    missing_variables+=("$variable")
  fi
done
if (( ${#missing_variables[@]} > 0 )); then
  printf 'Could not resolve from %s: %s\n' "$stack_name" "${missing_variables[*]}" >&2
  exit 1
fi

cd "$repository_root"
exec npm run test:deployed --workspace @bitebook/integration-tests
