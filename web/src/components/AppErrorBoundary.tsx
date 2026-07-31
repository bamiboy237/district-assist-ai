import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("DistrictAssist UI failed to render", error, info);
  }

  override render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="centered-state" role="alert">
        <p className="eyebrow">Interface error</p>
        <h1>DistrictAssist could not display this screen</h1>
        <p>
          Reload the application. If the problem continues, check the browser console.
        </p>
        <button
          className="button button-primary"
          type="button"
          onClick={() => window.location.reload()}
        >
          Reload application
        </button>
      </main>
    );
  }
}
