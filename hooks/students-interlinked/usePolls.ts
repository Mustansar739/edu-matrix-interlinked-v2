/**
 * @fileoverview React Query hooks for poll functionality
 * @module StudentsInterlinked/Hooks/Polls
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface PollVoteData {
  pollId: string;
  optionIds: string[];
}

interface CreatePollData {
  postId: string;
  question: string;
  options: { text: string; imageUrl?: string }[];
  allowMultiple?: boolean;
  expiresAt?: string;
  isAnonymous?: boolean;
  isEducational?: boolean;
  correctAnswer?: string[];
  explanation?: string;
}

// Hook to vote in a poll
export function usePollVote() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: PollVoteData) => {
      const response = await fetch('/api/polls/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to vote');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch posts to get updated poll data
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['poll', variables.pollId] });
    },
  });
}

// Hook to remove vote from a poll
export function usePollVoteRemove() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (pollId: string) => {
      const response = await fetch(`/api/polls/vote?pollId=${pollId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove vote');
      }
      
      return response.json();
    },
    onSuccess: (_, pollId) => {
      // Invalidate and refetch posts to get updated poll data
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['poll', pollId] });
    },
  });
}

// Hook to get poll details
export function usePoll(postId: string) {
  return useQuery({
    queryKey: ['poll', postId],
    queryFn: async () => {
      const response = await fetch(`/api/polls?postId=${postId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch poll');
      }
      
      return response.json();
    },
    enabled: !!postId,
  });
}

// Hook to create a poll (used separately from post creation)
export function useCreatePoll() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreatePollData) => {
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create poll');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate posts to show the new poll
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
