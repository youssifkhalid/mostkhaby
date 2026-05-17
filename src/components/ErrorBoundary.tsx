import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error?: Error }

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error("ErrorBoundary caught:", error, info);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center">
            <AlertTriangle size={28} className="text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-cairo mb-1">حصلت مشكلة غير متوقعة</h2>
            <p className="text-sm text-muted-foreground font-cairo max-w-sm">
              حاول تحديث الصفحة. لو المشكلة استمرت ابلغنا.
            </p>
          </div>
          <button
            onClick={() => { this.reset(); window.location.reload(); }}
            className="btn-primary flex items-center gap-2 font-cairo"
          >
            <RefreshCw size={16} /> إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
