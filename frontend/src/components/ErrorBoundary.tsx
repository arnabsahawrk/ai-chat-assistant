import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-surface-base p-6">
          <div className="text-center">
            <p className="text-ink-primary text-lg font-semibold mb-2">Something went wrong</p>
            <p className="text-red-400 text-xs font-mono bg-surface-raised border border-line rounded-xl p-4 text-left break-all mb-4">
              {this.state.error?.name}: {this.state.error?.message}
              {"\n\n"}
              {this.state.error?.stack?.slice(0, 300)}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 rounded-xl bg-accent text-ink-muted text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
