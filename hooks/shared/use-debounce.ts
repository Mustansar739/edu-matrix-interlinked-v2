/**
 * @fileoverview useDebounce Hook - Debounce values and functions
 * @module useDebounce
 * @category Shared Hooks
 * 
 * @description
 * Shared debounce hook used across all 9 services in EDU Matrix Interlinked
 * Optimizes performance for search, API calls, and user input
 */

import { useCallback, useRef, useState, useEffect } from 'react';

// Debounce a function call
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

// Debounce a value
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
