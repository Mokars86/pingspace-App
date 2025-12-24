
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Terminal } from "lucide-react";

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
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse"></div>
                        <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] border-2 border-red-500/50 flex items-center justify-center relative z-10 shadow-2xl">
                            <AlertTriangle className="w-12 h-12 text-red-500" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">System Failure</h1>
                    <p className="text-slate-400 font-medium mb-8 max-w-xs mx-auto text-sm leading-relaxed">
                        The neural link encountered a critical exception.
                        <br />
                        <span className="text-xs font-mono text-red-400 mt-2 block bg-red-900/10 p-2 rounded-lg border border-red-900/20">
                            Error: {this.state.error?.message || "Unknown Exception"}
                        </span>
                    </p>

                    <div className="flex flex-col gap-3 w-full max-w-xs">
                        <button
                            onClick={this.handleReload}
                            className="w-full py-4 bg-white text-slate-950 font-black rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" /> Reboot System
                        </button>
                        <button
                            onClick={() => localStorage.clear()}
                            className="w-full py-4 bg-slate-900 text-slate-500 font-bold rounded-2xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:text-red-400 transition-colors border border-slate-800"
                        >
                            <Terminal className="w-4 h-4" /> Hard Reset Cache
                        </button>
                    </div>

                    <div className="mt-12 text-[10px] font-black uppercase text-slate-600 tracking-[0.5em] opacity-50">
                        PingSpace Protocol v1.0.4
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
