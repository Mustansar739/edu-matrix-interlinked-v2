/**
 * @fileoverview Realtime Hooks Index - Educational Platform
 * @category Realtime Infrastructure
 * 
 * Central export for all real-time functionality
 */

// Core connection hook - Foundation for all realtime features
export { useRealtimeConnection } from './use-realtime-connection';

// Educational communication hooks
export { useRealtimeNotifications } from './use-realtime-notifications';
export { useRealtimeChat } from './use-realtime-chat';
export { useRealtimeCollaboration } from './use-realtime-collaboration';

// Re-export types for external use
export type {
  // Add types here as needed
} from './use-realtime-connection';
