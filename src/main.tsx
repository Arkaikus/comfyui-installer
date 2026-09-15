import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initErrorListener, initLogListener, pushError, pushLog } from '@/lib/log';
import { App } from './App';
import './styles.css';

initLogListener();
initErrorListener();

void import('@tauri-apps/api/core')
  .then(({ invoke }) => invoke('report', { message: 'frontend-mounted' }))
  .catch(() => {});

window.addEventListener('error', (e) => {
  pushError(e.message);
  pushLog('err', e.message);
});

window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason instanceof Error ? e.reason.message : String(e.reason);
  pushError(reason);
  pushLog('err', reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
