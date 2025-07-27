// Test script to examine NextAuth 5 session token structure
const jwt = require('jsonwebtoken');
const { jwtDecode } = require('jwt-decode');

// Load environment variables
require('dotenv').config();
require('dotenv').config({ path: './socketio-standalone-server/.env' });

// Test token from cookies (you would paste the actual token here)
const testToken = "paste_actual_token_here"; // This will be replaced

// Get secrets from environment
const secrets = [
  process.env.AUTH_SECRET,
  process.env.NEXTAUTH_SECRET, 
  process.env.JWT_SECRET
].filter(Boolean);

console.log('🔍 NextAuth 5 Token Analysis');
console.log('='.repeat(50));

// Check if we have a real token to analyze
if (testToken === "paste_actual_token_here") {
  console.log('❌ No real token provided for analysis');
  console.log('📋 To use this script:');
  console.log('1. Sign in to the main app');
  console.log('2. Copy the session token from browser cookies');
  console.log('3. Replace "paste_actual_token_here" with the actual token');
  console.log('4. Run this script again');
  process.exit(1);
}

console.log('📊 Token Info:');
console.log(`Length: ${testToken.length} characters`);
console.log(`Starts with: ${testToken.substring(0, 20)}...`);
console.log(`Ends with: ...${testToken.substring(testToken.length - 20)}`);
console.log();

// Check if it's a standard JWT format (3 parts separated by dots)
const parts = testToken.split('.');
console.log(`📝 JWT Parts: ${parts.length}`);

if (parts.length === 3) {
  console.log('✅ Standard JWT format detected');
  
  try {
    // Try to decode without verification first
    const decoded = jwtDecode(testToken);
    console.log('🔓 Decoded JWT payload:', JSON.stringify(decoded, null, 2));
  } catch (error) {
    console.log('❌ Failed to decode JWT:', error.message);
  }
  
  // Try to verify with each secret
  for (const secret of secrets) {
    if (!secret) continue;
    
    try {
      console.log(`\n🔐 Trying verification with secret: ${secret.substring(0, 10)}...`);
      const verified = jwt.verify(testToken, secret);
      console.log('✅ JWT verification successful!');
      console.log('📋 Verified payload:', JSON.stringify(verified, null, 2));
      break;
    } catch (error) {
      console.log(`❌ Verification failed: ${error.message}`);
    }
  }
} else if (parts.length === 5) {
  console.log('🔒 Possibly JWE (JSON Web Encryption) format');
  console.log('📝 NextAuth 5 might be using encrypted tokens');
  console.log('💡 JWE tokens need to be decrypted, not just verified like JWT');
} else {
  console.log('❓ Unknown token format');
}

// Try common NextAuth token decoding approaches
console.log('\n🔬 Advanced Analysis:');

// Check if it looks like base64
try {
  const decoded = Buffer.from(testToken, 'base64').toString('utf8');
  if (decoded.includes('{') || decoded.includes('"')) {
    console.log('📦 Possible base64-encoded JSON detected');
    console.log('🔓 Decoded content:', decoded.substring(0, 200) + '...');
  }
} catch (error) {
  console.log('❌ Not base64 encoded');
}

// Check for encrypted format indicators
if (testToken.includes('.') && testToken.split('.').length === 5) {
  console.log('🔐 JWE Format Analysis:');
  const [header, encryptedKey, iv, ciphertext, tag] = testToken.split('.');
  
  try {
    const headerDecoded = JSON.parse(Buffer.from(header, 'base64url').toString());
    console.log('📋 JWE Header:', JSON.stringify(headerDecoded, null, 2));
  } catch (error) {
    console.log('❌ Could not decode JWE header');
  }
}

console.log('\n💡 Next Steps:');
console.log('1. If this is JWE, the Socket.IO server needs to decrypt, not verify');
console.log('2. NextAuth 5 uses jose library for JWE handling');
console.log('3. Check if NextAuth config uses encryption vs signing');
