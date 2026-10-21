#!/usr/bin/env bash
set -euo pipefail

script_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repository_root="$(cd -- "$script_directory/.." && pwd)"
required_node_version="$(tr -d '[:space:]' < "$repository_root/.nvmrc")"
nvm_script="${NVM_DIR:-$HOME/.nvm}/nvm.sh"

current_node_version="$(node -p 'process.versions.node')"

if [[ "$current_node_version" == "$required_node_version" ]]; then
  exec "$@"
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
