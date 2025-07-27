/**
 * ==========================================
 * STUDENTS INTERLINKED STORIES - COMPONENT EXPORTS
 * ==========================================
 * 
 * Centralized exports for all story components
 * Enables clean imports throughout the application
 * 
 * Usage Examples:
 * import { StoryViewer, StoryList } from '@/components/students-interlinked/stories'
 * import { StoriesSection } from '@/components/students-interlinked/stories'
 */

// Main coordinator component
export { default as StoriesSection } from './StoriesSectionRefactored'

// Story List Components
export { default as StoryList } from './components/StoryList/StoryList'
export { default as StoryItem } from './components/StoryList/StoryItem'
export { default as CreateStoryButton } from './components/StoryList/CreateStoryButton'

// Story Viewer Components
export { default as StoryViewer } from './components/StoryViewer/StoryViewer'
export { default as StoryProgressBar } from './components/StoryViewer/StoryProgressBar'
export { default as StoryHeader } from './components/StoryViewer/StoryHeader'
export { default as StoryControls } from './components/StoryViewer/StoryControls'

// Story Creator Components
export { default as StoryCreator } from './components/StoryCreator/StoryCreator'

// Story Interactions Components
export { default as StoryReply } from './components/StoryInteractions/StoryReply'

// Shared Types and Utilities
export type * from './components/shared/types'
export * from './components/shared/constants'
export * from './components/shared/utils'

// Main Props Types (for external use)
export type {
  StoriesSectionProps,
  Story,
  StoryInteraction,
  UploadedFile
} from './components/shared/types'
