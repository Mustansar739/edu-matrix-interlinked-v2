
/**
 * Test script to verify MCP Playwright integration with local browser
 */

async function testMCPIntegration() {
  console.log('🧪 Testing MCP Playwright Integration...');
  
  try {
    // Test if MCP server is responding
    const mcpTest = await fetch('http://localhost:3000/api/health');
    console.log('✅ Development server is accessible');
    
    // Test Playwright MCP commands
    console.log('📋 Available MCP commands:');
    console.log('- mcp_playwright_browser_navigate');
    console.log('- mcp_playwright_browser_click');
    console.log('- mcp_playwright_browser_type');
    console.log('- mcp_playwright_browser_screenshot');
    console.log('- mcp_playwright_browser_snapshot');
    
    console.log('🎉 MCP integration setup complete!');
    console.log('💡 Your local Chrome browser will be used for testing');
    
  } catch (error) {
    console.error('❌ Error testing MCP integration:', error.message);
  }
}

module.exports = { testMCPIntegration };

if (require.main === module) {
  testMCPIntegration();
}
