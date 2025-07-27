/**
 * Comment Error Boundary Component
 * 
 * Purpose: Catch and gracefully handle errors in nested comment rendering
 * Features:
 * - Prevents entire comment section from crashing due to single comment error
 * - Provides fallback UI for failed comment rendering
 * - Logs errors for debugging while maintaining user experience
 * - Production-ready error recovery for nested comment trees
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  commentId?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Production-ready error boundary for comment components
 * Prevents cascading failures in nested comment trees
 */
export class CommentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging
    console.error('Comment Error Boundary caught an error:', error, errorInfo);
    
    // Store error info for display/debugging
    this.setState({ errorInfo });
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // TODO: Send to error reporting service in production
    // reportError(error, { commentId: this.props.commentId, ...errorInfo });
  }

  handleRetry = () => {
    // Reset error state to retry rendering
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error fallback UI
      return (
        <div className="py-2 px-3 my-1">
          <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Failed to load comment
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {this.state.error?.message || 'An unexpected error occurred while rendering this comment.'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="ml-3 h-7 px-2 text-xs border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap individual comments with error boundaries
 * Usage: withCommentErrorBoundary(CommentItem)
 */
export function withCommentErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  const WithErrorBoundary = (props: P & { commentId?: string }) => {
    return (
      <CommentErrorBoundary 
        commentId={props.commentId}
        onError={(error, errorInfo) => {
          console.error(`Error in comment ${props.commentId}:`, error, errorInfo);
        }}
      >
        <WrappedComponent {...props} />
      </CommentErrorBoundary>
    );
  };

  WithErrorBoundary.displayName = `withCommentErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithErrorBoundary;
}

/**
 * Specialized error boundary for nested comment trees
 * Provides more context about nesting level and parent relationships
 */
interface NestedCommentErrorBoundaryProps extends Props {
  level?: number;
  parentCommentId?: string;
  postId?: string;
}

export class NestedCommentErrorBoundary extends Component<NestedCommentErrorBoundaryProps, State> {
  constructor(props: NestedCommentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { level, parentCommentId, postId, commentId } = this.props;
    
    console.error('Nested Comment Error:', {
      error,
      errorInfo,
      context: {
        level,
        parentCommentId,
        postId,
        commentId,
      }
    });
    
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="py-1 px-2 my-1 ml-4">
          <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 border-l-2 border-orange-400">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-orange-500" />
              <span>Comment failed to load</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={this.handleRetry}
                className="h-5 px-2 text-xs"
              >
                Retry
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs opacity-70">Debug Info</summary>
                <pre className="mt-1 text-[10px] opacity-60 overflow-x-auto">
                  Level: {this.props.level}
                  Parent: {this.props.parentCommentId}
                  Error: {this.state.error?.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CommentErrorBoundary;
