#!/usr/bin/env bash
set -euo pipefail

changed_files=()
while IFS= read -r file; do
  if [[ -n "$file" ]]; then
    changed_files+=("$file")
  fi
done

pipeline_changed=false
for file in "${changed_files[@]}"; do
  case "$file" in
    infra/bin/app.ts \
      | infra/cdk.json \
      | infra/package.json \
      | infra/lib/BitebookApplicationStage.ts \
      | infra/lib/BitebookPipelineStack.ts)
      pipeline_changed=true
      break
      ;;
  esac
done

if [[ "$pipeline_changed" == false ]]; then
  exit 0
fi

violations=()
for file in "${changed_files[@]}"; do
  case "$file" in
    *.md \
      | .github/workflows/pull-request.yml \
      | infra/bin/app.ts \
      | infra/cdk.json \
      | infra/lib/BitebookApplicationStage.ts \
      | infra/lib/BitebookPipelineStack.ts \
      | infra/lib/tests/BitebookPipelineStack.test.ts \
      | infra/package.json \
      | package.json \
      | package-lock.json \
      | scripts/check-pipeline-change-isolation.sh \
      | scripts/run-deployed-integration-tests.sh \
      | scripts/run-tests.sh \
      | scripts/run-with-project-node.sh \
      | scripts/tests/check-pipeline-change-isolation.test.sh)
      ;;
    *)
      violations+=("$file")
      ;;
  esac
done

if (( ${#violations[@]} == 0 )); then
  exit 0
fi

printf 'CodePipeline definition changes must ship without application changes.\n' >&2
printf 'Move these files to a separate PR:\n' >&2
printf '  - %s\n' "${violations[@]}" >&2
printf 'Merge the pipeline-only PR and wait for its release to succeed before merging application changes.\n' >&2
exit 1
