/**
 * NOTIFICATION ACTIONURL FIX SCRIPT
 * Production-ready script to fix existing notifications without proper actionUrl values
 * 
 * This script will:
 * 1. Find notifications with null/empty/generic actionUrl values
 * 2. Generate proper actionUrl values based on notification type and data
 * 3. Update the database with corrected actionUrl values
 * 4. Report the results
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Generate actionUrl based on notification type and data
 * Same logic as DirectNotificationService
 */
function generateActionUrl(type, entityType, entityId, data = {}) {
  console.log('🔗 Generating actionUrl for:', { type, entityType, entityId, data });

  try {
    switch (type) {
      // Post-related notifications
      case 'POST_LIKED':
      case 'POST_COMMENTED':
      case 'POST_SHARED':
        if (entityType === 'POST' && entityId) {
          return `/students-interlinked/posts/${entityId}`;
        }
        if (data.postId) {
          return `/students-interlinked/posts/${data.postId}`;
        }
        break;

      // Comment-related notifications
      case 'COMMENT_LIKED':
      case 'COMMENT_REPLIED':
        if (entityType === 'COMMENT' && data.postId) {
          return `/students-interlinked/posts/${data.postId}?comment=${entityId}`;
        }
        if (data.postId) {
          return `/students-interlinked/posts/${data.postId}`;
        }
        break;

      // Story-related notifications
      case 'STORY_LIKED':
      case 'STORY_COMMENTED':
      case 'STORY_REPLY':
        if (entityType === 'STORY' && entityId) {
          return `/students-interlinked/stories/${entityId}`;
        }
        if (data.storyId) {
          return `/students-interlinked/stories/${data.storyId}`;
        }
        // For story replies, navigate to messages/conversation
        if (type === 'STORY_REPLY' && data.conversationId) {
          return `/messages?conversation=${data.conversationId}`;
        }
        if (type === 'STORY_REPLY' && data.senderId) {
          return `/messages?user=${data.senderId}`;
        }
        break;

      // Message notifications
      case 'MESSAGE_RECEIVED':
      case 'MESSAGE_READ':
        if (data.conversationId) {
          return `/messages?conversation=${data.conversationId}`;
        } else if (data.senderId) {
          return `/messages?user=${data.senderId}`;
        }
        return '/messages';

      // Follow/Social notifications
      case 'FOLLOW_REQUEST':
      case 'USER_FOLLOWED':
      case 'CONNECTION_REQUEST':
        if (data.followerId || data.userId) {
          const userId = data.followerId || data.userId;
          return `/profile/${userId}`;
        }
        break;

      // Course/Educational notifications
      case 'COURSE_UPDATE':
      case 'ASSIGNMENT_DUE':
      case 'GRADE_POSTED':
      case 'ENROLLMENT_CONFIRMED':
      case 'CERTIFICATE_ISSUED':
        if (data.courseId) {
          return `/courses/${data.courseId}`;
        }
        return '/courses';

      // Job/Career notifications
      case 'JOB_APPLICATION':
      case 'FREELANCE_PROPOSAL':
        if (data.jobId) {
          return `/jobs/${data.jobId}`;
        }
        return '/jobs';

      // Achievement notifications
      case 'ACHIEVEMENT_UNLOCKED':
        return '/profile/achievements';

      // Event notifications
      case 'EVENT_REMINDER':
        if (data.eventId) {
          return `/events/${data.eventId}`;
        }
        return '/events';

      // Payment/Financial notifications
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_PENDING':
      case 'SUBSCRIPTION_EXPIRING':
        return '/freelancing/earnings';

      // Profile notifications
      case 'PROFILE_LIKED':
      case 'PROFILE_SHARED':
        if (data.profileId) {
          return `/profile/${data.profileId}`;
        }
        if (data.likerId) {
          return `/profile/${data.likerId}`;
        }
        if (entityId) {
          return `/profile/${entityId}`;
        }
        break;

      // Mention/Tag notifications
      case 'MENTION_IN_POST':
      case 'TAG_IN_POST':
        if (data.postId) {
          return `/students-interlinked/posts/${data.postId}`;
        }
        break;

      case 'MENTION_IN_COMMENT':
        if (data.postId && data.commentId) {
          return `/students-interlinked/posts/${data.postId}?comment=${data.commentId}`;
        }
        break;

      // News notifications
      case 'NEWS_PUBLISHED':
        if (data.newsId) {
          return `/edu-news/${data.newsId}`;
        }
        return '/edu-news';

      // System notifications
      case 'SYSTEM_ALERT':
      case 'FEEDBACK_RESPONSE':
        return '/settings';

      default:
        console.log('⚠️ No specific URL pattern for notification type:', type);
        return '/notifications';
    }
  } catch (error) {
    console.error('❌ Error generating actionUrl:', error);
  }

  // Fallback to notifications page
  return '/notifications';
}

async function fixNotificationActionUrls() {
  try {
    console.log('🔧 Starting notification actionUrl fix...\n');

    // Find notifications that need fixing
    const problematicNotifications = await prisma.notification.findMany({
      where: {
        OR: [
          { actionUrl: null },
          { actionUrl: '' },
          { actionUrl: '/notifications' }
        ]
      },
      select: {
        id: true,
        type: true,
        entityType: true,
        entityId: true,
        data: true,
        actionUrl: true,
        title: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Found ${problematicNotifications.length} notifications that need actionUrl fixes\n`);

    if (problematicNotifications.length === 0) {
      console.log('✅ All notifications already have proper actionUrl values!');
      return;
    }

    let successCount = 0;
    let failureCount = 0;

    // Process each notification
    for (const notification of problematicNotifications) {
      try {
        const newActionUrl = generateActionUrl(
          notification.type,
          notification.entityType,
          notification.entityId,
          notification.data || {}
        );

        if (newActionUrl && newActionUrl !== notification.actionUrl) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: { 
              actionUrl: newActionUrl,
              updatedAt: new Date()
            }
          });

          console.log(`✅ Fixed: "${notification.title}" -> ${newActionUrl}`);
          successCount++;
        } else {
          console.log(`⚠️ Skipped: "${notification.title}" (no improvement possible)`);
        }

      } catch (error) {
        console.error(`❌ Failed to fix notification ${notification.id}:`, error);
        failureCount++;
      }
    }

    console.log('\n📊 Fix Results:');
    console.log(`✅ Successfully fixed: ${successCount} notifications`);
    console.log(`❌ Failed to fix: ${failureCount} notifications`);
    console.log(`⚠️ Total processed: ${problematicNotifications.length} notifications`);

    // Verify the fixes
    const remainingProblematic = await prisma.notification.count({
      where: {
        OR: [
          { actionUrl: null },
          { actionUrl: '' },
          { actionUrl: '/notifications' }
        ]
      }
    });

    console.log(`\n🔍 Remaining notifications without proper actionUrl: ${remainingProblematic}`);

    if (remainingProblematic === 0) {
      console.log('🎉 All notifications now have proper actionUrl values!');
    }

  } catch (error) {
    console.error('❌ Error fixing notification actionUrls:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixNotificationActionUrls();
