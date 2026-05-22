#!/usr/bin/env bash
# Backwards-compatible alias — deploys both edge Workers.
exec "$(dirname "$0")/deploy-cloudflare-edge.sh" "$@"
