
import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AlertCircle, RefreshCcw } from 'lucide-react';

// --- PRODUCTION ERROR BOUNDARY ---
interface Props { children?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

// Fixed: Explicitly imported and extended Component from react to resolve property access issues during inheritance.
class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Application Error:", error, errorInfo);
  }

  private handleReset = () => {
    localStorage.clear();
    window.location.href = window.location.origin + window.location.pathname;
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-red-50/20 rounded-[2rem] flex items-center justify-center mb-6 border border-red-500/30 animate-pulse">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Something went wrong</h1>
          <p className="text-slate-400 text-sm max-w-xs mb-8 leading-relaxed uppercase font-bold tracking-widest text-[10px]">
            The application encountered an unexpected error. Please try refreshing or resetting the app.
          </p>
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-white text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-[#ff1744] hover:text-white transition-all uppercase tracking-widest text-xs"
            >
              <RefreshCcw className="w-4 h-4" /> Reload App
            </button>
            <button 
              onClick={this.handleReset}
              className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-red-500 transition-colors"
            >
              Reset All Data
            </button>
          </div>
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-8 p-4 bg-slate-900 rounded-xl border border-slate-800 text-left overflow-auto max-w-full">
              <pre className="text-[8px] text-red-400 font-mono">{this.state.error?.stack}</pre>
            </div>
          )}
        </div>
      );
    }
    // Fixed: Standard access to this.props.children, now correctly typed through explicit Component inheritance.
    return this.props.children;
  }
}

// --- PWA INITIALIZATION ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const directory = pathname.substring(0, pathname.lastIndexOf('/') + 1);
    const swUrl = origin + directory + 'sw.js';
    
    navigator.serviceWorker.register(swUrl).then(registration => {
      console.log('ServiceWorker registered');
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New content is available; please refresh.');
            }
          };
        }
      };
    }).catch(err => {
      if (err.name === 'SecurityError' || err.message.includes('origin')) {
        console.warn('Service Worker registration skipped (Sandbox mode).');
      } else {
        console.error('Service Worker registration failed:', err);
      }
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root target missing");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
