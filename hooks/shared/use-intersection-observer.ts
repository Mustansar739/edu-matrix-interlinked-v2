/**
 * @fileoverview useIntersectionObserver Hook - Intersection Observer API
 * @module useIntersectionObserver
 * @category Hooks - Shared Utilities
 * 
 * A reusable hook for observing when elements enter/exit the viewport.
 * Commonly used for infinite scrolling, lazy loading, and visibility tracking.
 */

import { useEffect, useRef } from 'react';

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  /** Whether to disconnect the observer after first intersection */
  once?: boolean;
}

/**
 * Hook for observing element intersection with viewport
 * 
 * @param elementRef - React ref to the element to observe
 * @param callback - Function called when intersection changes
 * @param options - Intersection observer options
 * @returns The intersection observer instance
 * 
 * @example
 * ```tsx
 * const ref = useRef<HTMLDivElement>(null);
 * 
 * useIntersectionObserver(
 *   ref,
 *   (isIntersecting) => {
 *     if (isIntersecting) {
 *       console.log('Element is visible');
 *     }
 *   },
 *   { threshold: 0.5 }
 * );
 * 
 * return <div ref={ref}>Observable content</div>;
 * ```
 */
export function useIntersectionObserver(
  elementRef: React.RefObject<Element | null>,
  callback: (isIntersecting: boolean, entry?: IntersectionObserverEntry) => void,
  options?: UseIntersectionObserverOptions
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { once, ...intersectionOptions } = options || {};

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        callback(entry.isIntersecting, entry);
        
        // Disconnect after first intersection if 'once' is true
        if (once && entry.isIntersecting && observerRef.current) {
          observerRef.current.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px',
        ...intersectionOptions,
      }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [elementRef, callback, once, intersectionOptions]);

  return observerRef.current;
}

export default useIntersectionObserver;
