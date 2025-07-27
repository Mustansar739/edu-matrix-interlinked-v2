// Debug script to analyze NextAuth 5 JWT tokens
const jwt = require('jsonwebtoken');

// Test with the same secrets used in both apps
const secrets = [
  '2eb8467486bebce6d805da3087b46ac54d5c593cd79913c1a51093d3462c24fb', // AUTH_SECRET
  '0ef2b3bd4d5c3277d152a4c1f2cf51a30bce46700d5a0cd5d0e05703fbae749d'  // JWT_SECRET
];

// Create a test token similar to what NextAuth 5 would create
const testPayload = {
  sub: '166f0428-1c23-4d5a-860b-2b6cfbe4ab9f',
  email: 'mmustansar739@gmail.com',
  name: 'Muhammad Mustansar',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
  jti: 'test-jti'
};

console.log('🔍 Creating test JWT token...');
const testToken = jwt.sign(testPayload, secrets[0]);
console.log('✅ Test token created, length:', testToken.length);
console.log('🎫 Test token:', testToken.substring(0, 50) + '...');

// Test verification
console.log('\n🔍 Testing token verification...');
secrets.forEach((secret, index) => {
  try {
    const decoded = jwt.verify(testToken, secret);
    console.log(`✅ Secret ${index + 1} verification successful:`, {
      sub: decoded.sub,
      email: decoded.email,
      name: decoded.name
    });
  } catch (error) {
    console.log(`❌ Secret ${index + 1} verification failed:`, error.message);
  }
});

// Test with a malformed token (like the test script uses)
console.log('\n🔍 Testing malformed token...');
const malformedToken = 'test-jwt-token-for-infrastructure-testing';
secrets.forEach((secret, index) => {
  try {
    const decoded = jwt.verify(malformedToken, secret);
    console.log(`✅ Secret ${index + 1} verification successful for malformed token`);
  } catch (error) {
    console.log(`❌ Secret ${index + 1} verification failed for malformed token:`, error.message);
  }
});
