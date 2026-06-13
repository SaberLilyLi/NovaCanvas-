# @novacanvas/react

Reusable NovaCanvas image composer components for React 18+.

```tsx
import '@arco-design/web-react/dist/css/arco.css';
import { NovaCanvasComposer } from '@novacanvas/react';
import '@novacanvas/react/styles.css';

export function App() {
  return <NovaCanvasComposer bizType="used_car" apiBaseUrl="http://localhost:3001" />;
}
```

`ComposerInput` remains available for one migration cycle, but is deprecated. New
integrations should use `NovaComposerInput`.
