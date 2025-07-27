#!/usr/bin/env node

/**
 * 🧪 Email Logo Test Script
 * 
 * This script checks if the email logo fix is working correctly by examining the template file.
 */

const path = require('path');
const fs = require('fs');

async function testEmailLogo() {
  console.log('🧪 Testing Email Logo Fix...\n');

  try {
    // Read the email template file
    const templatePath = path.join(__dirname, '../components/emails/email-verification.tsx');
    const templateContent = fs.readFileSync(templatePath, 'utf8');

    console.log('📧 Analyzing email template...');
    console.log('📁 Template file:', templatePath);

    // Check if the correct logo URL is in the template
    const correctLogoUrl = 'https://ik.imagekit.io/vlsjmvsqt/email-assets/email-logo.png';
    const hasCorrectLogo = templateContent.includes(correctLogoUrl);

    if (hasCorrectLogo) {
      console.log('✅ Logo URL found in email template!');
      console.log('🔗 Using:', correctLogoUrl);
    } else {
      console.log('❌ Logo URL not found in email template!');
      console.log('⚠️  This indicates the fix may not be applied.');
    }

    // Check for old placeholder URLs (should not exist)
    const oldPlaceholderPattern = /via\.placeholder\.com/;
    const hasOldPlaceholder = oldPlaceholderPattern.test(templateContent);

    if (hasOldPlaceholder) {
      console.log('\n⚠️  WARNING: Old placeholder URLs still found in template!');
      console.log('🔧 The fix needs to be completed.');
    } else {
      console.log('\n✅ No old placeholder URLs found - fix is clean!');
    }

    // Extract and display the img tag
    const imgTagPattern = /<Img[^>]*src=["']([^"']*logo[^"']*)["'][^>]*>/gi;
    const imgTags = templateContent.match(imgTagPattern);

    if (imgTags) {
      console.log('\n🖼️  Found image tags:');
      imgTags.forEach((tag, index) => {
        console.log(`   ${index + 1}. ${tag.substring(0, 100)}...`);
      });
    }

    // Test if the logo URL is accessible
    console.log('\n🌐 Testing logo URL accessibility...');
    const https = require('https');
    
    const testUrl = new Promise((resolve, reject) => {
      const req = https.request(correctLogoUrl, { method: 'HEAD' }, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
      req.on('error', () => resolve(false));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    });

    const isAccessible = await testUrl;
    
    if (isAccessible) {
      console.log('✅ Logo URL is accessible!');
    } else {
      console.log('❌ Logo URL is not accessible!');
      console.log('🔧 Check if the image was uploaded correctly to ImageKit.');
    }

    console.log('\n📋 Summary:');
    console.log(`   Template has correct URL: ${hasCorrectLogo ? '✅' : '❌'}`);
    console.log(`   No old placeholders: ${!hasOldPlaceholder ? '✅' : '❌'}`);
    console.log(`   Logo is accessible: ${isAccessible ? '✅' : '❌'}`);

    if (hasCorrectLogo && !hasOldPlaceholder && isAccessible) {
      console.log('\n🎉 Email logo fix is COMPLETE and working!');
    } else {
      console.log('\n⚠️  Email logo fix needs attention.');
    }

    console.log('\n🌐 Test the logo directly:');
    console.log('   ' + correctLogoUrl);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testEmailLogo().catch(error => {
    console.error('\n💥 Test script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testEmailLogo };
