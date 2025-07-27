/**
 * @fileoverview Real-time Collaboration Hook for Educational Platform
 * @module useRealtimeCollaboration
 * @category Realtime Hooks
 * 
 * Essential for live collaboration features in education
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRealtimeConnection } from './use-realtime-connection';

interface CollaborativeSession {
  id: string;
  type: 'document' | 'whiteboard' | 'code' | 'presentation';
  title: string;
  participants: Participant[];
  isActive: boolean;
  createdAt: string;
}

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  role: 'teacher' | 'student' | 'guest';
  isOnline: boolean;
  cursor?: { x: number; y: number };
}

interface CollaborationEvent {
  type: 'edit' | 'cursor' | 'selection' | 'annotation';
  data: any;
  timestamp: string;
  userId: string;
}

interface CollaborationState {
  activeSession: CollaborativeSession | null;
  sessions: CollaborativeSession[];
  participants: Participant[];
  events: CollaborationEvent[];
  loading: boolean;
}

/**
 * Hook for real-time educational collaboration
 * 
 * WHY THIS IS CRITICAL FOR EDUCATION:
 * - Live document editing for group projects
 * - Real-time code collaboration for programming courses
 * - Interactive whiteboards for virtual classrooms
 * - Simultaneous presentation editing
 * - Live peer review and feedback
 * 
 * WITHOUT THIS HOOK:
 * ❌ No collaborative learning
 * ❌ Students work in isolation
 * ❌ No real-time feedback
 * ❌ Poor group project experience
 * ❌ Limited interactive learning
 * 
 * @example
 * ```tsx
 * function CollaborativeEditor() {
 *   const { 
 *     activeSession, 
 *     participants, 
 *     joinSession,
 *     sendEdit,
 *     sendCursor 
 *   } = useRealtimeCollaboration();
 *   
 *   return (
 *     <div className="collaborative-workspace">
 *       <div className="participants">
 *         {participants.map(p => (
 *           <Avatar key={p.id} user={p} />
 *         ))}
 *       </div>
 *       <Editor 
 *         onEdit={sendEdit}
 *         onCursorMove={sendCursor}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useRealtimeCollaboration() {
  const { isConnected, emit, on } = useRealtimeConnection();
  const [state, setState] = useState<CollaborationState>({
    activeSession: null,
    sessions: [],
    participants: [],
    events: [],
    loading: false,
  });

  // Listen for collaboration events
  useEffect(() => {
    if (!isConnected) return;

    const cleanup1 = on('collaboration:session-joined', (data: { session: CollaborativeSession; participants: Participant[] }) => {
      setState(prev => ({
        ...prev,
        activeSession: data.session,
        participants: data.participants,
      }));
    });

    const cleanup2 = on('collaboration:participant-joined', (participant: Participant) => {
      setState(prev => ({
        ...prev,
        participants: [...prev.participants.filter(p => p.id !== participant.id), participant],
      }));
    });

    const cleanup3 = on('collaboration:participant-left', (data: { userId: string }) => {
      setState(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.id !== data.userId),
      }));
    });

    const cleanup4 = on('collaboration:event', (event: CollaborationEvent) => {
      setState(prev => ({
        ...prev,
        events: [...prev.events, event],
      }));
    });

    const cleanup5 = on('collaboration:cursor-update', (data: { userId: string; cursor: { x: number; y: number } }) => {
      setState(prev => ({
        ...prev,
        participants: prev.participants.map(p =>
          p.id === data.userId ? { ...p, cursor: data.cursor } : p
        ),
      }));
    });

    return () => {
      cleanup1();
      cleanup2();
      cleanup3();
      cleanup4();
      cleanup5();
    };
  }, [isConnected, on]);

  const joinSession = useCallback((sessionId: string) => {
    if (!isConnected) return;

    setState(prev => ({ ...prev, loading: true }));
    emit('collaboration:join', { sessionId });
  }, [isConnected, emit]);

  const leaveSession = useCallback(() => {
    if (!isConnected || !state.activeSession) return;

    emit('collaboration:leave', { sessionId: state.activeSession.id });
    setState(prev => ({
      ...prev,
      activeSession: null,
      participants: [],
      events: [],
    }));
  }, [isConnected, emit, state.activeSession]);

  const createSession = useCallback((
    type: CollaborativeSession['type'], 
    title: string
  ) => {
    if (!isConnected) return;

    emit('collaboration:create', { type, title });
  }, [isConnected, emit]);

  const sendEdit = useCallback((editData: any) => {
    if (!isConnected || !state.activeSession) return;

    const event: Omit<CollaborationEvent, 'userId' | 'timestamp'> = {
      type: 'edit',
      data: editData,
    };

    emit('collaboration:edit', {
      sessionId: state.activeSession.id,
      event,
    });
  }, [isConnected, emit, state.activeSession]);

  const sendCursor = useCallback((cursor: { x: number; y: number }) => {
    if (!isConnected || !state.activeSession) return;

    emit('collaboration:cursor', {
      sessionId: state.activeSession.id,
      cursor,
    });
  }, [isConnected, emit, state.activeSession]);

  const sendSelection = useCallback((selectionData: any) => {
    if (!isConnected || !state.activeSession) return;

    const event: Omit<CollaborationEvent, 'userId' | 'timestamp'> = {
      type: 'selection',
      data: selectionData,
    };

    emit('collaboration:selection', {
      sessionId: state.activeSession.id,
      event,
    });
  }, [isConnected, emit, state.activeSession]);

  const addAnnotation = useCallback((annotationData: any) => {
    if (!isConnected || !state.activeSession) return;

    const event: Omit<CollaborationEvent, 'userId' | 'timestamp'> = {
      type: 'annotation',
      data: annotationData,
    };

    emit('collaboration:annotate', {
      sessionId: state.activeSession.id,
      event,
    });
  }, [isConnected, emit, state.activeSession]);

  return {
    activeSession: state.activeSession,
    sessions: state.sessions,
    participants: state.participants,
    events: state.events,
    loading: state.loading,
    isConnected,
    joinSession,
    leaveSession,
    createSession,
    sendEdit,
    sendCursor,
    sendSelection,
    addAnnotation,
  };
}
