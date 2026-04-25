import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F8FBFF] p-6 text-slate-950">
          <div className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-6 shadow-xl shadow-slate-900/5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Startup Error</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">Concrete Ops could not render.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The frontend hit a runtime error before the workspace became visible.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs text-slate-100">{String(this.state.error?.message || this.state.error)}</pre>
            <button
              type="button"
              className="mt-5 inline-flex rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white"
              onClick={() => window.location.reload()}
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
