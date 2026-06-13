# React + Vite consumer

This project consumes the built `@novacanvas/react` package through its package
exports. For the release gate, replace the local file dependency with the tgz
created by:

```bash
pnpm --filter @novacanvas/react build
pnpm --filter @novacanvas/react pack --pack-destination .tmp
```
