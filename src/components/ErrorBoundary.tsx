import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
              <span className="text-4xl font-mono">!</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-destructive font-heading">Something went wrong</h1>
              <p className="text-muted-foreground">
                An unexpected error occurred. Please refresh the page to continue.
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={this.handleReload}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-xl font-semibold text-sm shadow-lg transition-all duration-200"
              >
                Refresh Page
              </button>
              <p className="text-xs text-muted-foreground">
                Error: {this.state.error?.message || 'Unknown error'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

