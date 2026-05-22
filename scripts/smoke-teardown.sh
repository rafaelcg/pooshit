#!/usr/bin/env bash
# Best-effort destroy of a pooshit deploy linked in a directory.
teardown_pooshit_dir() {
  local dir="${1:?directory required}"
  if [[ -f "$dir/.pooshit/project.json" ]]; then
    (cd "$dir" && npx --yes pooshit@latest destroy --yes 2>/dev/null) || true
  fi
}
