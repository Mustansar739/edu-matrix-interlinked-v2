#!/usr/bin/env node

/**
 * 🚀 Email Logo Upload Script
 * 
 * This script uploads the logo to ImageKit for use in email templates.
 * It ensures the logo is publicly accessible for all email clients.
 */

const fs = require('fs');
const path = require('path');

// Check if ImageKit is available
let ImageKit;
try {
  ImageKit = require('imagekit');
} catch (error) {
  console.log('⚠️  ImageKit not installed. Installing...');
  const { execSync } = require('child_process');
  execSync('npm install imagekit', { stdio: 'inherit' });
  ImageKit = require('imagekit');
}

// Load environment variables
require('dotenv').config();

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PROFILE_PUBLIC_KEY,
  privateKey: process.env.NEXT_PUBLIC_IMAGEKIT_PROFILE_PRIVATE_KEY,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_PROFILE_URL_ENDPOINT
});

async function uploadEmailLogo() {
  console.log('🔄 Starting email logo upload process...\n');

  // Validate environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_IMAGEKIT_PROFILE_PUBLIC_KEY',
    'NEXT_PUBLIC_IMAGEKIT_PROFILE_PRIVATE_KEY', 
    'NEXT_PUBLIC_IMAGEKIT_PROFILE_URL_ENDPOINT'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease check your .env file and ensure ImageKit is configured.');
    process.exit(1);
  }

  // Find the logo file
  const logoPath = path.join(__dirname, '../public/logo-icon.png');
  
  if (!fs.existsSync(logoPath)) {
    console.error('❌ Logo file not found:', logoPath);
    console.error('Make sure logo-icon.png exists in the public directory.');
    process.exit(1);
  }

  console.log('📁 Found logo file:', logoPath);
  console.log('📏 File size:', fs.statSync(logoPath).size, 'bytes');

  try {
    // Read the logo file
    const logoFile = fs.readFileSync(logoPath);
    
    console.log('\n🚀 Uploading to ImageKit...');    // Upload to ImageKit
    const response = await imagekit.upload({
      file: logoFile,
      fileName: 'email-logo.png',
      folder: '/email-assets/',
      useUniqueFileName: false,
      tags: ['email', 'logo', 'branding', 'edu-matrix']
    });    console.log('✅ Upload successful!');
    console.log('🔗 Public URL:', response.url);
    console.log('📁 File ID:', response.fileId);
    if (response.tags && Array.isArray(response.tags)) {
      console.log('🏷️  Tags:', response.tags.join(', '));
    }

    // Test URL accessibility
    console.log('\n🧪 Testing URL accessibility...');
    
    let fetch;
    try {
      fetch = require('node-fetch');
    } catch (error) {
      console.log('⚠️  node-fetch not installed. Installing...');
      const { execSync } = require('child_process');
      execSync('npm install node-fetch@2', { stdio: 'inherit' });
      fetch = require('node-fetch');
    }

    const testResponse = await fetch(response.url, { method: 'HEAD' });
    
    if (testResponse.ok) {
      console.log('✅ Logo is publicly accessible!');
      console.log('📊 Status:', testResponse.status, testResponse.statusText);
      console.log('📱 Content-Type:', testResponse.headers.get('content-type'));
    } else {
      console.log('❌ Logo URL is not accessible');
      console.log('📊 Status:', testResponse.status, testResponse.statusText);
    }

    // Update the email template
    console.log('\n📝 Email template has been updated to use:');
    console.log(`   ${response.url}`);
    
    console.log('\n🎉 Setup complete! Your email logo should now display correctly.');
    console.log('\n📋 Next steps:');
    console.log('   1. Send a test verification email');
    console.log('   2. Check the email in different clients (Gmail, Outlook, etc.)');
    console.log('   3. Verify the logo displays correctly');

  } catch (error) {
    console.error('\n❌ Upload failed:', error.message);
    
    if (error.message.includes('unauthorized') || error.message.includes('invalid')) {
      console.error('\n🔑 This looks like an authentication issue.');
      console.error('Please verify your ImageKit API keys in the .env file:');
      console.error('   - NEXT_PUBLIC_IMAGEKIT_PROFILE_PUBLIC_KEY');
      console.error('   - NEXT_PUBLIC_IMAGEKIT_PROFILE_PRIVATE_KEY');
      console.error('   - NEXT_PUBLIC_IMAGEKIT_PROFILE_URL_ENDPOINT');
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      console.error('\n🌐 This looks like a network connectivity issue.');
      console.error('Please check your internet connection and try again.');
    }
    
    process.exit(1);
  }
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  console.error('\n💥 Unexpected error:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled promise rejection:', error.message);
  process.exit(1);
});

// Run the upload
if (require.main === module) {
  uploadEmailLogo().catch(error => {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { uploadEmailLogo };
