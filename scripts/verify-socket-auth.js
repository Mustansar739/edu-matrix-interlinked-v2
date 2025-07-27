#!/usr/bin/env node

/**
 * Socket.IO NextAuth 5 Integration Verification
 * Comprehensive test of the authentication flow
 */

require('dotenv').config();
const io = require('socket.io-client');
const jwt = require('jsonwebtoken');

async function verifyAuthentication() {
  console.log('🔐 Socket.IO NextAuth 5 Authentication Verification');
  console.log('===================================================');
  
  // Test 1: JWT Token Authentication (Primary Method)
  console.log('\n1️⃣ Testing JWT Token Authentication...');
  const success1 = await testJWTAuthentication();
  
  // Test 2: Fallback Authentication
  console.log('\n2️⃣ Testing Fallback Authentication...');
  const success2 = await testFallbackAuthentication();
  
  // Test 3: Cookie Authentication (simulate browser)
  console.log('\n3️⃣ Testing Cookie Authentication...');
  const success3 = await testCookieAuthentication();
  
  const allTestsPassed = success1 && success2 && success3;
  
  console.log('\n📊 Authentication Test Results:');
  console.log(`   ${success1 ? '✅' : '❌'} JWT Token Authentication`);
  console.log(`   ${success2 ? '✅' : '❌'} Fallback Authentication`);
  console.log(`   ${success3 ? '✅' : '❌'} Cookie Authentication`);
  
  if (allTestsPassed) {
    console.log('\n🎉 All Socket.IO authentication methods are working!');
    console.log('✅ NextAuth 5 integration is properly configured');
    console.log('✅ Ready for production use');
  } else {
    console.log('\n⚠️ Some authentication methods need attention');
  }
  
  return allTestsPassed;
}

async function testJWTAuthentication() {
  try {
    const testUser = {
      id: 'test-user-jwt',
      email: 'jwt@test.com',
      name: 'JWT Test User'
    };

    const token = jwt.sign(
      {
        sub: testUser.id,
        email: testUser.email,
        name: testUser.name,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      process.env.NEXTAUTH_SECRET
    );

    const client = io('http://localhost:3001', {
      auth: { token },
      extraHeaders: {
        'origin': 'http://localhost:3000'
      }
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('   ❌ JWT authentication timeout');
        client.disconnect();
        resolve(false);
      }, 5000);

      client.on('connect', () => {
        clearTimeout(timeout);
        console.log('   ✅ JWT authentication successful');
        client.disconnect();
        resolve(true);
      });

      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.log('   ❌ JWT authentication failed:', error.message);
        resolve(false);
      });
    });
  } catch (error) {
    console.log('   ❌ JWT test error:', error.message);
    return false;
  }
}

async function testFallbackAuthentication() {
  try {
    const client = io('http://localhost:3001', {
      auth: {
        userId: 'fallback-user-123',
        email: 'fallback@test.com',
        name: 'Fallback Test User'
      },
      extraHeaders: {
        'origin': 'http://localhost:3000'
      }
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('   ❌ Fallback authentication timeout');
        client.disconnect();
        resolve(false);
      }, 5000);

      client.on('connect', () => {
        clearTimeout(timeout);
        console.log('   ✅ Fallback authentication successful');
        client.disconnect();
        resolve(true);
      });

      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.log('   ❌ Fallback authentication failed:', error.message);
        resolve(false);
      });
    });
  } catch (error) {
    console.log('   ❌ Fallback test error:', error.message);
    return false;
  }
}

async function testCookieAuthentication() {
  try {
    const token = jwt.sign(
      {
        sub: 'cookie-user-123',
        email: 'cookie@test.com',
        name: 'Cookie Test User',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      process.env.NEXTAUTH_SECRET
    );

    const client = io('http://localhost:3001', {
      extraHeaders: {
        'origin': 'http://localhost:3000',
        'cookie': `next-auth.session-token=${token}`
      }
    });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('   ❌ Cookie authentication timeout');
        client.disconnect();
        resolve(false);
      }, 5000);

      client.on('connect', () => {
        clearTimeout(timeout);
        console.log('   ✅ Cookie authentication successful');
        client.disconnect();
        resolve(true);
      });

      client.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.log('   ❌ Cookie authentication failed:', error.message);
        resolve(false);
      });
    });
  } catch (error) {
    console.log('   ❌ Cookie test error:', error.message);
    return false;
  }
}

// Run verification
verifyAuthentication()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Verification error:', error);
    process.exit(1);
  });
