import React from 'react';
import ReactDOM from 'react-dom/client';
import '@arco-design/web-react/dist/css/arco.css';
import { NovaCanvasComposer } from '@novacanvas/react';
import '@novacanvas/react/styles.css';

function App() {
  return (
    <NovaCanvasComposer
      bizType="used_car"
      apiBaseUrl="http://localhost:3001"
      enableMultiImage
      enableImageEdit
      enableConversation
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
