npx() {
  if [[ "${1:-}" == "pooshit" ]]; then
    bash "$(dirname "${BASH_SOURCE[0]}")/run-pooshit-demo.sh"
    return 0
  fi
  command npx "$@"
}
