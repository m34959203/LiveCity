"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-zinc-950 text-zinc-400">
            <p className="text-lg font-medium text-white">
              Что-то пошло не так
            </p>
            <p className="text-sm">Попробуйте перезагрузить страницу</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white hover:bg-zinc-700"
            >
              Попробовать снова
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
