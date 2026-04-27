'use client';

import React from 'react';
import { SorobanErrorParser, ParsedError } from '@/utils/sorobanErrorParser';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: ParsedError) => void;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: ParsedError | null;
}

export class SorobanErrorBoundary extends React.Component<Props, State> {
  private parser: SorobanErrorParser;
  
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.parser = new SorobanErrorParser();
  }
  
  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { hasError: true };
  }
  
  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    const parsedError = this.parser.parse(error);
    
    console.error('Soroban transaction error caught:', {
      originalError: error,
      parsedError,
      errorInfo
    });
    
    if (this.props.onError) {
      this.props.onError(parsedError);
    }
    
    this.setState({ error: parsedError });
  }
  
  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };
  
  handleDismiss = () => {
    this.setState({ hasError: false, error: null });
  };
  
  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="error-boundary" style={{
          padding: '1.5rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          margin: '1rem 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <h3 style={{ color: '#dc2626', margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
              Transaction Error
            </h3>
          </div>
          
          <p style={{ color: '#7f1d1d', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            {this.state.error.userMessage}
          </p>
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {this.state.error.shouldShowRetry && (
              <button
                onClick={this.handleRetry}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                Retry Transaction
              </button>
            )}
            <button
              onClick={this.handleDismiss}
              className="btn btn-outline"
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}
