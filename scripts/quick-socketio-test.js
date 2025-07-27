#!/usr/bin/env node

/**
 * Quick Socket.IO Authentication Test
 */

require('dotenv').config();
const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

async function quickAuthTest() {
  console.log('🔍 Quick Socket.IO Authentication Test');
  console.log('=====================================');
  
  try {
    // Create a test JWT token
    const testUser = {
      id: 'test-user-12345',
      email: 'test@edumatrix.com',
      name: 'Test User',
      role: 'user'
    };

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new Error('NEXTAUTH_SECRET not found');
    }

    const token = jwt.sign(
      {
        sub: testUser.id,
        email: testUser.email,
        name: testUser.name,
        role: testUser.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
      },
      secret
    );

    console.log('✅ Test JWT token created');    // Test connection with authentication
    const client = io('http://localhost:3001', {
      auth: {
        token: token,
        userId: testUser.id,
        email: testUser.email,
        name: testUser.name
      },
      timeout: 10000,
      extraHeaders: {
        'origin': 'http://localhost:3000',
        'referer': 'http://localhost:3000'
      }
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 15000);

      client.on('connect', () => {
        clearTimeout(timeout);
        console.log('✅ Socket.IO connected successfully!');
        console.log('🆔 Client ID:', client.id);
        
        // Test a simple emit
        client.emit('presence:ping', (response) => {
          console.log('✅ Ping response:', response || 'No response (but connection works)');
          client.disconnect();
          resolve(true);
        });

        // Fallback if no ping response
        setTimeout(() => {
          console.log('✅ Connection established and stable');
          client.disconnect();
          resolve(true);
        }, 3000);
      });

      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.error('❌ Connection failed:', error.message);
        reject(error);
      });

      client.on('disconnect', (reason) => {
        console.log('🔌 Disconnected:', reason);
      });
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
quickAuthTest()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Socket.IO authentication is working correctly!');
      process.exit(0);
    } else {
      console.log('\n❌ Socket.IO authentication needs attention');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Test error:', error.message);
    process.exit(1);
  });
