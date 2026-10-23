#!/usr/bin/env bash
set -euo pipefail

script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
guard="$script_directory/../check-pipeline-change-isolation.sh"

expect_pass() {
  local name="$1"
  shift
  if ! printf '%s\n' "$@" | bash "$guard"; then
    printf 'Expected pass: %s\n' "$name" >&2
    exit 1
  fi
}

expect_fail() {
  local name="$1"
  local expected_file="$2"
  shift 2
  local output
  if output="$(printf '%s\n' "$@" | bash "$guard" 2>&1)"; then
    printf 'Expected failure: %s\n' "$name" >&2
    exit 1
  fi
  if [[ "$output" != *"$expected_file"* ]]; then
    printf 'Failure did not identify %s: %s\n' "$expected_file" "$output" >&2
    exit 1
  fi
}

expect_pass 'application-only change' \
  'apps/mobile/src/app.tsx' \
  'services/api/src/index.ts'
expect_pass 'pipeline-only change' \
  'infra/lib/BitebookApplicationStage.ts' \
  'infra/lib/BitebookPipelineStack.ts' \
  'infra/lib/tests/BitebookPipelineStack.test.ts' \
  'scripts/run-deployed-integration-tests.sh' \
  'README.md'
expect_pass 'pipeline dependency change' \
  'infra/package.json' \
  'package-lock.json'
expect_fail 'pipeline dependency and application code' 'services/api/src/index.ts' \
  'infra/package.json' \
  'services/api/src/index.ts'
expect_fail 'pipeline and application code' 'services/api/src/index.ts' \
  'infra/lib/BitebookPipelineStack.ts' \
  'services/api/src/index.ts'
expect_fail 'pipeline and application infrastructure' 'infra/lib/BitebookStack.ts' \
  'infra/lib/BitebookPipelineStack.ts' \
  'infra/lib/BitebookStack.ts'

printf 'Pipeline change isolation tests passed.\n'
