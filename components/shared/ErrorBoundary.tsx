"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="panel"
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 480 }}>
            <AlertTriangle
              size={48}
              style={{ margin: "0 auto 16px", color: "var(--critical)" }}
            />
            <h1>Something went wrong</h1>
            <p className="muted" style={{ marginTop: 8 }}>
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              className="btn primary"
              style={{ marginTop: 16 }}
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
