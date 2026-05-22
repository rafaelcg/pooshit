# Demo GIF

Terminal recording for the README hero (`pooshit-demo.gif`).

## Regenerate

Requires [VHS](https://github.com/charmbracelet/vhs):

```bash
brew install vhs   # or see VHS docs
cd /path/to/hostie
vhs demo/pooshit-demo.tape
```

The tape runs a mock `npx pooshit` via `demo/vhs-rc.sh` → `demo/run-pooshit-demo.sh` (no network, no real deploy).

To tweak output, edit `demo/run-pooshit-demo.sh` and re-run `vhs demo/pooshit-demo.tape`.
