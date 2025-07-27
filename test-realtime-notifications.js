#!/usr/bin/env node

/**
 * =============================================================================
 * REAL-TIME NOTIFICATION FLOW TEST
 * =============================================================================
 * 
 * 🎯 PURPOSE:
 * Test the complete real-time notification flow end-to-end:
 * Database → Kafka → Redis → Socket.IO → Client
 * 
 * 🔧 FLOW:
 * 1. Create a notification in database
 * 2. Publish to Kafka 'notification-created' topic
 * 3. Kafka consumer picks up event and publishes to Redis
 * 4. Socket.IO picks up Redis event and emits to client
 * 
 * 📋 USAGE:
 * node test-realtime-notifications.js
 * 
 * AUTHOR: GitHub Copilot
 * CREATED: 2025-01-16
 * =============================================================================
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Kafka } = require('kafkajs');
const IORedis = require('ioredis');
const { io } = require('socket.io-client');

// Initialize clients
const prisma = new PrismaClient();
const kafka = new Kafka({
  clientId: 'notification-test-client',
  brokers: ['localhost:29092'],
});
const producer = kafka.producer();

// Redis client for pub/sub
const redisClient = new IORedis({
  host: 'localhost',
  port: 6379,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

// Test configuration
const TEST_USER_ID = 'test-realtime-user';
const SOCKET_URL = 'http://localhost:3001';

/**
 * Test the complete real-time notification flow
 */
async function testRealtimeNotificationFlow() {
  console.log('🔄 Starting Real-time Notification Flow Test...\n');
  
  let socket;
  let notificationReceived = false;
  
  try {
    // 1. Connect to Redis
    console.log('🔍 Step 1: Connecting to Redis...');
    // IORedis connects automatically
    console.log('✅ Redis connected');
    
    // 2. Connect to Kafka
    console.log('🔍 Step 2: Connecting to Kafka...');
    await producer.connect();
    console.log('✅ Kafka producer connected');
    
    // 3. Create Socket.IO client
    console.log('🔍 Step 3: Connecting to Socket.IO...');
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      timeout: 10000,
    });
    
    // Wait for Socket.IO connection
    await new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        reject(new Error('Socket.IO connection timeout'));
      }, 15000);
      
      socket.on('connect', () => {
        clearTimeout(connectionTimeout);
        console.log('✅ Socket.IO connected');
        resolve();
      });
      
      socket.on('connect_error', (error) => {
        clearTimeout(connectionTimeout);
        reject(error);
      });
    });
    
    // 4. Set up notification listener
    console.log('🔍 Step 4: Setting up notification listener...');
    
    socket.on('notification:new', (data) => {
      console.log('🔔 NOTIFICATION RECEIVED via Socket.IO:', {
        id: data.id,
        title: data.title,
        message: data.message,
        type: data.type,
        userId: data.userId
      });
      notificationReceived = true;
    });
    
    // Join notification room
    socket.emit('join:notifications', { userId: TEST_USER_ID });
    console.log('✅ Joined notification room for user:', TEST_USER_ID);
    
    // 5. Create test user
    console.log('🔍 Step 5: Creating test user...');
    
    const testUser = await prisma.user.upsert({
      where: { id: TEST_USER_ID },
      update: {},
      create: {
        id: TEST_USER_ID,
        email: 'test-realtime@example.com',
        name: 'Test Realtime User',
        username: 'test-realtime-user',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Test user created:', testUser.username);
    
    // 6. Create notification in database
    console.log('🔍 Step 6: Creating notification in database...');
    
    const notification = await prisma.notification.create({
      data: {
        userId: TEST_USER_ID,
        title: '🚀 Real-time Test Notification',
        message: 'This is a real-time notification flow test!',
        type: 'POST_LIKED',
        category: 'SOCIAL',
        priority: 'HIGH',
        channels: ['IN_APP', 'PUSH'],
        status: 'SENT',
        isRead: false,
        entityType: 'POST',
        entityId: 'test-post-realtime-123',
        data: {
          likerId: 'test-liker-realtime',
          likerName: 'Test Liker',
          contentType: 'post',
          contentId: 'test-post-realtime-123',
          reaction: 'like',
          totalLikes: 1,
          timestamp: new Date().toISOString()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Notification created in database:', {
      id: notification.id,
      title: notification.title,
      type: notification.type,
      userId: notification.userId
    });
    
    // 7. Publish to Kafka
    console.log('🔍 Step 7: Publishing to Kafka...');
    
    const kafkaMessage = {
      eventType: 'notification-created',
      notificationId: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      category: notification.category,
      priority: notification.priority,
      data: notification.data,
      timestamp: new Date().toISOString()
    };
    
    await producer.send({
      topic: 'notification-created',
      messages: [
        {
          key: notification.userId,
          value: JSON.stringify(kafkaMessage),
          timestamp: Date.now().toString()
        }
      ]
    });
    
    console.log('✅ Message published to Kafka:', kafkaMessage.eventType);
    
    // 8. Wait for notification to be received
    console.log('🔍 Step 8: Waiting for real-time notification...');
    
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve();
      }, 5000); // Wait 5 seconds
      
      const checkInterval = setInterval(() => {
        if (notificationReceived) {
          clearTimeout(timeout);
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
    
    // 9. Verify the flow
    console.log('\n🔍 Step 9: Verifying notification flow...');
    
    if (notificationReceived) {
      console.log('✅ SUCCESS: Real-time notification flow completed successfully!');
      console.log('🎉 All components are working:');
      console.log('   ✅ Database → Notification stored');
      console.log('   ✅ Kafka → Message published');
      console.log('   ✅ Kafka Consumer → Processed event');
      console.log('   ✅ Redis → Pub/Sub message sent');
      console.log('   ✅ Socket.IO → Client notified');
      console.log('   ✅ Client → Notification received');
    } else {
      console.log('❌ FAILED: Notification was not received via Socket.IO');
      console.log('🔍 Possible issues:');
      console.log('   - Kafka consumer not processing messages');
      console.log('   - Redis pub/sub not working');
      console.log('   - Socket.IO not emitting events');
      console.log('   - Client not subscribed to correct channel');
    }
    
    // 10. Cleanup
    console.log('\n🔍 Step 10: Cleaning up...');
    
    await prisma.notification.delete({ where: { id: notification.id } });
    await prisma.user.delete({ where: { id: TEST_USER_ID } });
    
    console.log('✅ Test data cleaned up');
    
    // Print final summary
    console.log('\n' + '='.repeat(80));
    console.log('🧪 REAL-TIME NOTIFICATION FLOW TEST RESULTS');
    console.log('='.repeat(80));
    
    if (notificationReceived) {
      console.log('✅ STATUS: PASSED - Real-time notifications are working!');
      console.log('🎯 NEXT STEPS:');
      console.log('1. Start the Next.js development server: npm run dev');
      console.log('2. Open the app in browser and test notifications');
      console.log('3. Create a post and like it to see real-time notifications');
      console.log('4. Check the NotificationBell component for updates');
    } else {
      console.log('❌ STATUS: FAILED - Real-time notifications not working');
      console.log('🔧 TROUBLESHOOTING:');
      console.log('1. Check Kafka consumer logs: docker logs edu-matrix-socketio');
      console.log('2. Verify Redis pub/sub is working');
      console.log('3. Check Socket.IO server logs for errors');
      console.log('4. Ensure all Docker services are running');
    }
    
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Real-time notification flow test failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup connections
    if (socket) {
      socket.disconnect();
    }
    
    try {
      await producer.disconnect();
    } catch (e) {
      console.warn('Warning: Failed to disconnect Kafka producer:', e.message);
    }
    
    try {
      redisClient.disconnect();
    } catch (e) {
      console.warn('Warning: Failed to disconnect Redis client:', e.message);
    }
    
    try {
      await prisma.$disconnect();
    } catch (e) {
      console.warn('Warning: Failed to disconnect Prisma client:', e.message);
    }
    
    // Exit with appropriate code
    process.exit(notificationReceived ? 0 : 1);
  }
}

// Run the test
if (require.main === module) {
  testRealtimeNotificationFlow();
}

module.exports = { testRealtimeNotificationFlow };
