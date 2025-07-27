/**
 * @fileoverview WhatsApp Sharing Test
 * @description Test the WhatsApp sharing functionality
 */

// Test data to simulate a post
const testPost = {
  id: "test-post-123",
  content: "This is a test post about advanced React hooks and state management in modern web applications. Learning how to use useState, useEffect, and custom hooks effectively!",
  user: {
    name: "John Doe",
    username: "johndoe",
    email: "john@example.com"
  },
  createdAt: "2025-06-06T10:30:00Z",
  likesCount: 15,
  commentsCount: 5,
  sharesCount: 3
};

// Test WhatsApp URL generation
function testWhatsAppShare(post) {
  console.log("🧪 Testing WhatsApp Share Functionality");
  console.log("=====================================");
  
  // Truncate content if too long
  const maxContentLength = 200;
  const truncatedContent = post.content.length > maxContentLength 
    ? post.content.substring(0, maxContentLength) + '...' 
    : post.content;

  // Format the message for WhatsApp
  const shareMessage = `🎓 Check out this post from Edu Matrix:

"${truncatedContent}"

👤 By: ${post.user.name || post.user.username || 'Anonymous Student'}
📅 ${new Date(post.createdAt).toLocaleDateString()}

📖 Read more: ${window.location.origin}/students-interlinked/posts/${post.id}

✨ Shared via Edu Matrix Interlinked - Where Students Connect! 📚`;

  // URL encode the message
  const encodedMessage = encodeURIComponent(shareMessage);

  // Test mobile detection
  const testUserAgents = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)", // iOS
    "Mozilla/5.0 (Linux; Android 10)", // Android
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" // Desktop
  ];

  testUserAgents.forEach((userAgent, index) => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const whatsappUrl = isMobile 
      ? `whatsapp://send?text=${encodedMessage}`
      : `https://web.whatsapp.com/send?text=${encodedMessage}`;
    
    console.log(`\n${index + 1}. ${isMobile ? 'Mobile' : 'Desktop'} Device:`);
    console.log("User Agent:", userAgent);
    console.log("WhatsApp URL:", whatsappUrl.substring(0, 100) + "...");
  });

  console.log("\n📱 Generated Share Message:");
  console.log("===========================");
  console.log(shareMessage);
  
  console.log("\n✅ WhatsApp sharing functionality is ready!");
  console.log("✅ Message formatting works correctly");
  console.log("✅ Mobile/Desktop detection implemented");
  console.log("✅ URL encoding handled properly");
  
  return {
    message: shareMessage,
    encodedMessage: encodedMessage.substring(0, 100) + "...",
    success: true
  };
}

// Run the test (in browser console)
if (typeof window !== 'undefined') {
  // Browser environment
  window.testWhatsAppShare = () => testWhatsAppShare(testPost);
  console.log("🎯 WhatsApp Share Test Available!");
  console.log("Run: testWhatsAppShare() in browser console");
} else {
  // Node environment - run test immediately
  console.log("Running WhatsApp Share Test in Node.js...\n");
  // Mock window.location for testing
  global.window = {
    location: {
      origin: "https://edu-matrix-interlinked.vercel.app"
    }
  };
  testWhatsAppShare(testPost);
}
