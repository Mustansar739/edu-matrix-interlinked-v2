/**
 * NOTIFICATION INSPECTION SCRIPT
 * Check current notifications in database to debug the actionUrl issue
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function inspectNotifications() {
  try {
    console.log('🔍 Inspecting recent notifications...\n');
    
    // Get recent notifications
    const notifications = await prisma.notification.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        actionUrl: true,
        entityType: true,
        entityId: true,
        data: true,
        isRead: true,
        createdAt: true,
        userId: true
      }
    });
    
    console.log(`Found ${notifications.length} recent notifications:\n`);
    
    notifications.forEach((notification, index) => {
      console.log(`${index + 1}. 📢 ${notification.title}`);
      console.log(`   Type: ${notification.type}`);
      console.log(`   ActionURL: ${notification.actionUrl || 'NULL ❌'}`);
      console.log(`   EntityType: ${notification.entityType || 'NULL'}`);
      console.log(`   EntityId: ${notification.entityId || 'NULL'}`);
      console.log(`   Data: ${JSON.stringify(notification.data, null, 2)}`);
      console.log(`   Read: ${notification.isRead ? '✅' : '❌'}`);
      console.log(`   Created: ${notification.createdAt}`);
      console.log('   ─────────────────────────────────────────────\n');
    });
    
    // Check for notifications without actionUrl
    const noActionUrlCount = await prisma.notification.count({
      where: {
        OR: [
          { actionUrl: null },
          { actionUrl: '' },
          { actionUrl: '/notifications' }
        ]
      }
    });
    
    console.log(`⚠️  Notifications without proper actionUrl: ${noActionUrlCount}`);
    
    // Check total notifications
    const totalCount = await prisma.notification.count();
    console.log(`📊 Total notifications in database: ${totalCount}`);
    
  } catch (error) {
    console.error('❌ Error inspecting notifications:', error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectNotifications();
