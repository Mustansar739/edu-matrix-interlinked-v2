/**
 * ==========================================
 * CENTRALIZED SOCIAL HOOKS EXPORT
 * ==========================================
 * 
 * Single import point for all social functionality
 * Production-ready, real-time enabled, reusable across modules
 */

// Note: useLikes has been replaced by useUnifiedLikes
// Import useUnifiedLikes from '@/hooks/useUnifiedLikes' instead

export { useComments, useSimpleComments } from './useComments'
export type { 
  Comment, 
  CreateCommentData, 
  UpdateCommentData, 
  CommentsResponse, 
  UseCommentsOptions, 
  UseCommentsReturn 
} from './useComments'

export { useShares, useSimpleShare } from './useShares'
export type { 
  Share, 
  CreateShareData, 
  SharesResponse, 
  ShareResponse,
  UseSharesOptions, 
  UseSharesReturn 
} from './useShares'

// Note: useSocialActions temporarily disabled due to useLikes dependency
// Will be updated to use useUnifiedLikes in future update
// export { 
//   useSocialActions, 
//   usePostSocialActions, 
//   useCommentSocialActions 
// } from './useSocialActions'
// export type { 
//   SocialActionCounts,
//   SocialActionStates,
//   SocialActionErrors,
//   UseSocialActionsOptions,
//   UseSocialActionsReturn
// } from './useSocialActions'

// Reusable hooks for all modules (TEMPORARILY DISABLED)
// These hooks are temporarily disabled due to useSocialActions dependency
// Will be updated to use useUnifiedLikes in future update
// export {
//   useUniversalPostSocial,
//   useStudentsPostSocial,
//   useStudentsCommentSocial,
//   useFreelancingProjectSocial,
//   useFreelancingPortfolioSocial,
//   useJobPostingSocial,
//   useJobApplicationSocial,
//   useAchievementSocial,
//   useSkillEndorsementSocial,
//   useStorySocial,
//   createCustomSocialHook
// } from './useReusableSocial'

// Real-time communication (existing)
export { 
  useRealtimeIntegration, 
  useSocketEmitters 
} from './use-realtime-integration'

// Legacy hooks (existing)
export { usePostActions } from './use-post-actions'
export { useCommentManagement } from './use-comment-management'
export { 
  useShareDialog,
  type SharePlatform,
  type ServiceType 
} from './use-share-dialog'
