// ==========================================
// FACEBOOK-LIKE FEATURES COMPREHENSIVE TEST
// ==========================================
// Test all Facebook-style real-time features

const io = require('socket.io-client');
const { logger } = require('./utils/logger');

const SERVER_URL = process.env.SOCKET_SERVER_URL || 'http://localhost:4001';

class FacebookFeaturesTest {
  constructor() {
    this.socket = null;
    this.testResults = {
      connection: false,
      posts: false,
      stories: false,
      comments: false,
      likes: false,
      shares: false,
      chat: false,
      notifications: false,
      presence: false,
      files: false
    };
  }

  async connect() {
    console.log('🔌 Connecting to Socket.IO server...');
    this.socket = io(SERVER_URL, {
      transports: ['websocket'],
      timeout: 5000
    });

    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => {
        console.log('✅ Connected to server');
        this.testResults.connection = true;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection failed:', error.message);
        reject(error);
      });

      setTimeout(() => {
        if (!this.socket.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  async testPosts() {
    console.log('📝 Testing Posts features...');
    
    return new Promise((resolve) => {
      // Listen for post events
      this.socket.on('post:created', (data) => {
        console.log('✅ Post created event received:', data.postId);
        this.testResults.posts = true;
      });

      this.socket.on('post:updated', (data) => {
        console.log('✅ Post updated event received:', data.postId);
      });

      this.socket.on('post:deleted', (data) => {
        console.log('✅ Post deleted event received:', data.postId);
      });

      // Test creating a post
      this.socket.emit('post:create', {
        content: 'Test post for Facebook-like features',
        media: [],
        privacy: 'public',
        tags: []
      });

      setTimeout(() => resolve(), 2000);
    });
  }

  async testStories() {
    console.log('📖 Testing Stories features...');
    
    return new Promise((resolve) => {
      // Listen for story events
      this.socket.on('story:created', (data) => {
        console.log('✅ Story created event received:', data.storyId);
        this.testResults.stories = true;
      });

      this.socket.on('story:viewed', (data) => {
        console.log('✅ Story viewed event received:', data.storyId);
      });

      // Test creating a story
      this.socket.emit('story:create', {
        content: 'Test story',
        media: { type: 'image', url: 'test.jpg' },
        privacy: 'friends',
        duration: 24
      });

      setTimeout(() => resolve(), 2000);
    });
  }

  async testComments() {
    console.log('💬 Testing Comments features...');
    
    return new Promise((resolve) => {
      // Listen for comment events
      this.socket.on('comment:created', (data) => {
        console.log('✅ Comment created event received:', data.commentId);
        this.testResults.comments = true;
      });

      this.socket.on('comment:reply', (data) => {
        console.log('✅ Comment reply event received:', data.replyId);
      });

      this.socket.on('comment:reaction', (data) => {
        console.log('✅ Comment reaction event received:', data.commentId);
      });

      // Test creating a comment
      this.socket.emit('comment:create', {
        postId: 'test-post-123',
        content: 'Test comment with @mention',
        mentions: ['@testuser'],
        parentId: null
      });

      setTimeout(() => resolve(), 2000);
    });
  }

  async testLikes() {
    console.log('❤️ Testing Likes/Reactions features...');
    
    return new Promise((resolve) => {
      // Listen for like events
      this.socket.on('like:added', (data) => {
        console.log('✅ Like added event received:', data.targetId);
        this.testResults.likes = true;
      });

      this.socket.on('reaction:added', (data) => {
        console.log('✅ Reaction added event received:', data.targetId, data.reactionType);
      });

      // Test adding a like
      this.socket.emit('like:add', {
        targetId: 'test-post-123',
        targetType: 'post',
        reactionType: 'love'
      });

      setTimeout(() => resolve(), 2000);
    });
  }

  async testShares() {
    console.log('🔄 Testing Shares/Reposts features...');
    
    return new Promise((resolve) => {
      // Listen for share events
      this.socket.on('share:created', (data) => {
        console.log('✅ Share created event received:', data.shareId);
        this.testResults.shares = true;
      });

      this.socket.on('repost:created', (data) => {
        console.log('✅ Repost created event received:', data.repostId);
      });

      // Test sharing a post
      this.socket.emit('share:create', {
        originalId: 'test-post-123',
        originalType: 'post',
        shareType: 'repost',
        message: 'Sharing this amazing post!',
        privacy: 'public'
      });

      setTimeout(() => resolve(), 2000);
    });
  }

  async testChat() {
    console.log('💬 Testing Chat/Messages features...');
    
    return new Promise((resolve) => {
      // Listen for chat events
      this.socket.on('message:received', (data) => {
        console.log('✅ Message received event:', data.messageId);
        this.testResults.chat = true;
      });

      this.socket.on('message:typing', (data) => {
        console.log('✅ Typing indicator received:', data.userId);
      });

      // Join a chat room
      this.socket.emit('chat:join', {
        roomId: 'test-room-123',
        roomType: 'direct'
      });

      // Send a message
      this.socket.emit('message:send', {
        roomId: 'test-room-123',
        content: 'Test message',
        messageType: 'text'
      });

      setTimeout(() => resolve(), 2000);
    });
  }

  async testNotifications() {
    console.log('🔔 Testing Notifications features...');
    
    return new Promise((resolve) => {
      // Listen for notification events
      this.socket.on('notification:received', (data) => {
        console.log('✅ Notification received:', data.type);
        this.testResults.notifications = true;
      });

      this.socket.on('notification:real_time', (data) => {
        console.log('✅ Real-time notification:', data.message);
      });

      // Request notifications
      this.socket.emit('notification:get_unread');

      setTimeout(() => resolve(), 2000);
    });
  }

  async testPresence() {
    console.log('👁️ Testing Presence features...');
    
    return new Promise((resolve) => {
      // Listen for presence events
      this.socket.on('presence:user_online', (data) => {
        console.log('✅ User online event:', data.userId);
        this.testResults.presence = true;
      });

      this.socket.on('presence:user_offline', (data) => {
        console.log('✅ User offline event:', data.userId);
      });

      // Update presence
      this.socket.emit('presence:update', {
        status: 'online',
        activity: 'Testing Facebook features'
      });

      setTimeout(() => resolve(), 2000);
    });
  }

  async testFiles() {
    console.log('📁 Testing File Upload features...');
    
    return new Promise((resolve) => {
      // Listen for file events
      this.socket.on('file:uploaded', (data) => {
        console.log('✅ File uploaded event:', data.fileId);
        this.testResults.files = true;
      });

      this.socket.on('file:processing', (data) => {
        console.log('✅ File processing event:', data.fileId);
      });

      // Simulate file upload (without actual file data)
      this.socket.emit('file:upload_start', {
        fileName: 'test-image.jpg',
        fileSize: 1024000,
        fileType: 'image/jpeg',
        uploadContext: 'post'
      });

      setTimeout(() => resolve(), 2000);
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Facebook-like Features Comprehensive Test\n');

    try {
      await this.connect();
      
      await this.testPosts();
      await this.testStories();
      await this.testComments();
      await this.testLikes();
      await this.testShares();
      await this.testChat();
      await this.testNotifications();
      await this.testPresence();
      await this.testFiles();

      this.printResults();
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    } finally {
      if (this.socket) {
        this.socket.disconnect();
      }
    }
  }

  printResults() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');
    
    const totalTests = Object.keys(this.testResults).length;
    const passedTests = Object.values(this.testResults).filter(Boolean).length;
    
    Object.entries(this.testResults).forEach(([feature, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${feature.toUpperCase().padEnd(15)} : ${status}`);
    });
    
    console.log('========================');
    console.log(`Overall: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All Facebook-like features are working correctly!');
    } else {
      console.log('⚠️ Some features need attention.');
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new FacebookFeaturesTest();
  tester.runAllTests();
}

module.exports = FacebookFeaturesTest;
