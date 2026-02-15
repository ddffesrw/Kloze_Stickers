import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });

    // Here you could send error to a logging service
    // logErrorToService(error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
          {/* Background gradient */}
          <div className="fixed inset-0 bg-gradient-to-br from-red-500/5 via-background to-orange-500/5" />

          <div className="relative z-10 max-w-md w-full text-center space-y-6">
            {/* Error icon */}
            <div className="mx-auto w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Bir şeyler ters gitti 😕
              </h1>
              <p className="text-muted-foreground">
                Beklenmeyen bir hata oluştu. Endişelenme, verilen kaybolmadı.
              </p>
            </div>

            {/* Error details (collapsible in production) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Bug className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-red-400">Debug Info</span>
                </div>
                <p className="text-xs text-red-300 font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="mt-2 text-[10px] text-red-300/70 font-mono overflow-auto max-h-32">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={this.handleReload}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sayfayı Yenile
              </Button>

              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full h-12 rounded-xl border-border/50"
              >
                <Home className="w-4 h-4 mr-2" />
                Ana Sayfaya Git
              </Button>

              <Button
                onClick={this.handleReset}
                variant="ghost"
                className="w-full text-muted-foreground"
              >
                Tekrar Dene
              </Button>
            </div>

            {/* Support info */}
            <p className="text-xs text-muted-foreground">
              Sorun devam ederse{" "}
              <a href="mailto:support@klozestickers.com" className="text-primary underline">
                destek ekibine
              </a>{" "}
              ulaşabilirsin.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrapper component for easier use with function components
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
