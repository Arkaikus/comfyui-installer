import { Component, type ErrorInfo, type ReactNode } from 'react';
import { pushLog } from '@/lib/log';

interface Props {
  children: ReactNode;
}

interface State {
  error: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    pushLog('err', `${error.message}\n${info.componentStack ?? ''}`);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#06080a] p-8 text-center">
          <p className="text-sm font-semibold text-destructive">The UI failed to render</p>
          <pre className="max-w-full overflow-auto whitespace-pre-wrap rounded-lg border border-[#212b33] bg-[#0d1117] p-4 text-left text-xs text-[#8a99a3]">
            {this.state.error}
          </pre>
          <button
            className="rounded-lg border border-[#212b33] px-3 py-1.5 text-xs text-[#e6edf0] hover:bg-[#121920]"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
