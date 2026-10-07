import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Smartphone, Phone, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Pharma Pro Uncaught Error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = () => {
    try {
      localStorage.clear();
    } catch (e) {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 dir-rtl text-right font-sans">
          <div className="max-w-md w-full bg-slate-800/90 border border-slate-700 p-6 rounded-3xl shadow-2xl space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-white">نظام فارما برو للصيدليات</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              حدث تنبيه غير متوقع أثناء تشغيل واجهة البرنامج على هذا المتصفح. يمكنك استئناف العمل فوراً بالنقر على الزر بالأسفل.
            </p>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] font-mono text-rose-300 text-left dir-ltr break-all overflow-x-auto max-h-24">
              {this.state.error?.message || 'Unknown Render Exception'}
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تحميل البرنامج</span>
              </button>

              <button
                onClick={this.handleClearAndReload}
                className="w-full py-2.5 rounded-2xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <span>إعادة ضبط الذاكرة المؤقتة وتشغيل البرنامج</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-between">
              <span>إشراف: م. مالك حريبات</span>
              <a href="tel:0594345464" className="font-mono text-cyan-400 hover:underline">
                0594345464
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
