import { PlaygroundPage } from './pages/playground';

export function App() {
  return (
    <div className="min-h-screen bg-[#0c0f10] text-white">
      <header className="app-header">
        <div className="app-header__identity">
          <span>NC</span>
          <strong>NovaCanvas AI</strong>
        </div>
        <span className="app-header__status">API + Queue + WebSocket</span>
      </header>
      <div className="app-workspace">
        <PlaygroundPage />
      </div>
    </div>
  );
}
