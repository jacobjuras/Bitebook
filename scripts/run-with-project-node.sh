#!/usr/bin/env bash
set -euo pipefail

script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd -- "$script_directory/.." && pwd)"
required_node_version="$(tr -d '[:space:]' < "$repository_root/.nvmrc")"
nvm_script="${NVM_DIR:-$HOME/.nvm}/nvm.sh"

current_node_version="$(node -p 'process.versions.node')"
required_node_major="${required_node_version%%.*}"
current_node_major="${current_node_version%%.*}"

if [[ "$current_node_version" == "$required_node_version" ]] \
  || [[ -n "${CODEBUILD_BUILD_ID:-}" && "$current_node_major" == "$required_node_major" ]]; then
  exec "$@"
fi

if [[ -n "${CODEBUILD_BUILD_ID:-}" ]]; then
  printf 'CodeBuild requires Node %s.x but found %s. Check runtime-versions.\n' \
    "$required_node_major" \
    "$current_node_version" \
    >&2
  exit 1
fi

if [[ -s "$nvm_script" ]]; then
  unset npm_config_prefix NPM_CONFIG_PREFIX
  source "$nvm_script"
  nvm use --silent "$required_node_version"
else
  printf 'Bitebook requires Node %s. Run nvm use before testing.\n' "$required_node_version" >&2
  exit 1
fi

exec "$@"
