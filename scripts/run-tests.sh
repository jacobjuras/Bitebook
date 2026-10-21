#!/usr/bin/env bash
set -euo pipefail

suite="${1:-all}"

case "$suite" in
  all)
    exec npm run test --workspaces --if-present
    ;;
  app | mobile)
    exec npm test --workspace @bitebook/mobile
    ;;
  domain)
    exec npm test --workspace @bitebook/domain
    ;;
  api)
    exec npm test --workspace @bitebook/api
    ;;
  integ)
    exec npm test --workspace @bitebook/integration-tests
    ;;
  infra)
    exec npm test --workspace @bitebook/infra
    ;;
  *)
    printf 'Unknown test suite: %s\n' "$suite" >&2
    printf 'Choose one of: all, app, mobile, domain, api, integration, infra\n' >&2
    exit 2
    ;;
esac
