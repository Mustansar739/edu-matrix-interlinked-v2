# MCP Filesystem Server Configuration Guide

## 🎯 Official Configuration Complete

Based on the official Model Context Protocol documentation, the filesystem MCP server has been properly configured in your workspace.

## 📁 What's Been Configured

### File: `.vscode/mcp.json`
```json
{
  "servers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${workspaceFolder}"]
    }
  }
}
```

### Key Details from Official Documentation:
- **Package**: `@modelcontextprotocol/server-filesystem`
- **Type**: `stdio` (Standard input/output communication)
- **Scope**: `${workspaceFolder}` (Your current workspace directory)
- **Security**: Server will ONLY allow operations within your workspace folder

## 🔧 Required Setup Steps

### 1. Enable MCP in VS Code
1. Open VS Code Settings (`Ctrl + Shift + P` → "Preferences: Open Settings (JSON)")
2. Add or ensure this setting exists:
```json
{
  "chat.mcp.enabled": true
}
```

### 2. Verify Prerequisites
- ✅ VS Code version 1.99 or later
- ✅ GitHub Copilot access
- ✅ Node.js/npm available (for npx command)

## 🚀 How to Use the Filesystem Server

### Step 1: Start Agent Mode
1. Open Chat view (`Ctrl + Alt + I`)
2. Select **"Agent mode"** from the dropdown

### Step 2: Verify Tools Available
1. Click the **"Tools"** button in chat
2. You should see filesystem tools:
   - `read_file`
   - `write_file`
   - `edit_file`
   - `create_directory`
   - `list_directory`
   - `move_file`
   - `search_files`
   - `get_file_info`
   - `list_allowed_directories`

### Step 3: Use Filesystem Tools
You can now use natural language commands like:
- "Read the package.json file"
- "List all TypeScript files in the src directory"
- "Create a new directory called 'components'"
- "Search for files containing 'React' in their content"

## 🛠️ Available Filesystem Operations

### File Operations
- **read_file**: Read complete contents of any file in workspace
- **read_multiple_files**: Read multiple files simultaneously
- **write_file**: Create new file or overwrite existing
- **edit_file**: Make selective edits with pattern matching
- **get_file_info**: Get metadata (size, dates, permissions)

### Directory Operations
- **create_directory**: Create directories (with parent creation)
- **list_directory**: List contents with [FILE]/[DIR] prefixes
- **move_file**: Move or rename files/directories

### Search Operations
- **search_files**: Recursive search with pattern matching
- **list_allowed_directories**: Show accessible directories

## 🔒 Security Features

1. **Sandboxed Access**: Server can ONLY access files within your workspace
2. **No External Access**: Cannot access system files outside workspace
3. **Tool Confirmation**: VS Code will ask for confirmation before running tools
4. **Preview Mode**: Can preview changes before applying them

## 📋 Testing Your Setup

1. Open Chat in Agent mode
2. Type: "List all files in the root directory"
3. The filesystem tool should activate and show your workspace files
4. Type: "Show me the contents of package.json"

## 🐛 Troubleshooting

### If filesystem tools don't appear:
1. Check that `chat.mcp.enabled` is set to `true`
2. Run Command Palette: "MCP: List Servers" to verify server status
3. Check server logs: "MCP: List Servers" → Select filesystem → "Show Output"

### If server fails to start:
1. Ensure Node.js/npm is installed
2. Check internet connection (for npx to download package)
3. Verify workspace folder permissions

## 📚 Official Documentation References

- [VS Code MCP Documentation](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)
- [MCP Filesystem Server](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)
- [Model Context Protocol](https://modelcontextprotocol.io/)

---
*Configuration completed following official MCP and VS Code documentation*
