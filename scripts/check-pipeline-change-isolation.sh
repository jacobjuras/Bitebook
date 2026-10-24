#!/usr/bin/env bash
set -euo pipefail

changed_files=()
while IFS= read -r file; do
  if [[ -n "$file" ]]; then
    changed_files+=("$file")
  fi
done

pipeline_structure_changed=false
for file in "${changed_files[@]}"; do
  if [[ "$file" == 'infra/pipeline-structure.json' ]]; then
    pipeline_structure_changed=true
    break
  fi
done

if [[ "$pipeline_structure_changed" == false ]]; then
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
      | infra/pipeline-structure.json \
      | package.json \
      | package-lock.json \
      | scripts/check-pipeline-change-isolation.sh \
      | scripts/pipeline-structure.mjs \
      | scripts/run-deployed-integration-tests.sh \
      | scripts/run-tests.sh \
      | scripts/run-with-project-node.sh \
      | scripts/tests/check-pipeline-change-isolation.test.sh \
      | scripts/tests/pipeline-structure.test.mjs)
      ;;
    *)
      violations+=("$file")
      ;;
  esac
done

if (( ${#violations[@]} == 0 )); then
  exit 0
fi

printf 'The synthesized CodePipeline declaration changed and must ship without application changes.\n' >&2
printf 'Move these files to a separate PR:\n' >&2
printf '  - %s\n' "${violations[@]}" >&2
printf 'Merge the pipeline-structure PR before merging application changes.\n' >&2
exit 1
