'use client';

import { useState, useCallback } from 'react';
import { SorobanErrorParser, ParsedError } from '@/utils/sorobanErrorParser';
import { useToast } from '@/context/ToastContext';

interface UseSorobanTransactionOptions {
  showToast?: boolean;
  onSuccess?: (result: any) => void;
  onError?: (error: ParsedError) => void;
}

export function useSorobanTransaction(options: UseSorobanTransactionOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ParsedError | null>(null);
  const { toast } = useToast();
  const parser = new SorobanErrorParser();
  
  const { showToast = true, onSuccess, onError } = options;
  
  const execute = useCallback(async <T>(
    transactionFn: () => Promise<T>
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await transactionFn();
      
      if (showToast) {
        toast('Transaction completed successfully!', 'success');
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err: unknown) {
      const parsedError = parser.parse(err);
      setError(parsedError);
      
      if (showToast) {
        toast(parsedError.userMessage, 'error', parsedError.isRetryable ? 8000 : 5000);
      }
      
      if (onError) {
        onError(parsedError);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [showToast, toast, onSuccess, onError]);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    execute,
    loading,
    error,
    clearError
  };
}
