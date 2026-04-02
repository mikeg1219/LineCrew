"use client";

"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

type Props = {
  children: ReactNode;
  /** Optional label for screen readers / analytics */
  sectionLabel?: string;
};

type State = { error: Error | null };

/**
 * Catches render errors in child tree and shows a recoverable inline message
 * without taking down the rest of the page.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary]", this.props.sectionLabel ?? "section", error, info);
    }
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50/95 p-5 text-center shadow-sm ring-1 ring-red-100 sm:p-6"
        >
          <p className="text-base font-semibold text-red-900">Something went wrong</p>
          <p className="mt-2 text-sm leading-relaxed text-red-800/90">
            This section couldn&apos;t load. You can try again without refreshing the whole page.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-4 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
