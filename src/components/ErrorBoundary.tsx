import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * App-wide error boundary. Catches render/runtime errors in the React tree and
 * shows a recoverable fallback instead of a blank white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught error in React tree:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle size={26} className="text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            An unexpected error occurred. You can try again or head back home.
          </p>
          {this.state.error?.message && (
            <p className="mt-4 rounded border border-border/40 bg-muted/30 px-3 py-2 text-left text-xs text-muted-foreground break-words">
              {this.state.error.message}
            </p>
          )}
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button variant="hero" onClick={() => window.location.reload()}>
              <RotateCcw size={15} className="mr-2" /> Try again
            </Button>
            <Button variant="outline" asChild>
              <a href="/">
                <Home size={15} className="mr-2" /> Home
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
