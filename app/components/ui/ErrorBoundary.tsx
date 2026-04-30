'use client';

/**
 * ErrorBoundary — Error boundary untuk menangani error di React components
 * ────────────────────────────────────────────────────────────────────────
 * • Menangkap error dari child components
 * • Menampilkan fallback UI
 * • Log error untuk debugging
 */

import React, { ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('[ErrorBoundary] Error caught:', error);
    console.error('[ErrorBoundary] Error info:', errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            className="flex flex-col items-center justify-center min-h-screen p-4 gap-4"
            style={{ background: 'var(--color-base)' }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
            >
              <AlertTriangle size={32} />
            </div>

            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
              Terjadi Kesalahan
            </h1>
            <p
              className="text-center text-sm max-w-sm"
              style={{ color: 'var(--color-muted)' }}
            >
              Maaf, ada masalah dengan aplikasi ini. Tim kami telah diberi tahu dan sedang menyelidiki.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre
                className="mt-4 p-3 rounded-lg text-xs overflow-auto max-w-md max-h-40"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--color-border)',
                  color: '#FF6B6B',
                }}
              >
                {this.state.error.message}
              </pre>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm"
                style={{ background: 'var(--color-gold)', color: 'var(--color-base)' }}
              >
                <RotateCcw size={16} />
                Coba Lagi
              </button>

              <button
                onClick={() => (window.location.href = '/')}
                className="px-4 py-2 rounded-lg font-semibold text-sm"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-primary)',
                }}
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
