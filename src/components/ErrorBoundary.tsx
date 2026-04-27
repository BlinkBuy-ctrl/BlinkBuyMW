import { Component, ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: string; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: "" };

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error: error?.message || "Unknown error" };
  }

  componentDidCatch(error: any, info: any) {
    console.error("App crash caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#0f1117", color: "#fff", flexDirection: "column", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24, maxWidth: 320 }}>{this.state.error}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: "" }); window.location.href = "/"; }}
            style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            Go Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
