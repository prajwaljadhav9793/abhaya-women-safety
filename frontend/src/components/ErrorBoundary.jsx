import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "36px 24px",
          maxWidth: 620,
          margin: "40px auto",
          background: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: 20,
          textAlign: "center",
          backdropFilter: "blur(12px)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)"
        }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px"
          }}>
            <AlertTriangle size={28} color="#ef4444" />
          </div>
          <h2 style={{ color: "#ef4444", fontSize: "1.35rem", marginBottom: 8 }}>
            Dashboard View Error
          </h2>
          <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: 20 }}>
            {this.state.error?.message || "An unexpected error occurred while loading this view."}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="btn sm"
              style={{ background: "#7c3aed" }}
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              <RefreshCw size={14} /> Reload Page
            </button>
            <a
              href="/"
              className="btn sm ghost"
              style={{ textDecoration: "none" }}
            >
              <Home size={14} /> Back to Landing Page
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

