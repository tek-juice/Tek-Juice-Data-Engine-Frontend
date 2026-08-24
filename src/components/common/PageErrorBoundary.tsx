import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

/**
 * PageErrorBoundary
 *
 * Wraps each page route. When a page throws, renders an inline error card
 * instead of falling through to the 404 wildcard route.
 * A "Try again" button resets the boundary so the page can re-mount.
 */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[PageErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    const msg = this.state.error.message ?? String(this.state.error);

    return (
      <div
        className="flex items-center justify-center h-full min-h-64 p-8"
        style={{ background: 'var(--bg)' }}
      >
        <div
          className="w-full max-w-md p-6"
          style={{
            background:   'var(--surface)',
            border:       '1px solid var(--danger-border)',
            borderRadius: 6,
          }}
        >
          <p
            className="text-sm font-bold mb-1"
            style={{ color: 'var(--danger)' }}
          >
            Something went wrong on this page
          </p>
          <p
            className="text-xs font-mono mb-5 break-all"
            style={{ color: 'var(--text-3)' }}
          >
            {msg}
          </p>
          <button
            onClick={this.reset}
            className="px-4 py-2 text-sm font-bold rounded"
            style={{ background: 'var(--brand)', color: '#111' }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
