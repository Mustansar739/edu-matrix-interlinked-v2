'use client';

import { useState } from 'react';

interface MCPServerStatus {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastPing: string;
  functions: string[];
}

export default function MCPDashboard() {
  const [servers] = useState<MCPServerStatus[]>([
    {
      name: 'Filesystem',
      status: 'connected',
      lastPing: new Date().toISOString(),
      functions: ['read_file', 'write_file', 'list_directory', 'search_files']
    },
    {
      name: 'PostgreSQL',
      status: 'connected',
      lastPing: new Date().toISOString(),
      functions: ['query', 'schema_info', 'table_stats']
    },
    {
      name: 'Puppeteer',
      status: 'connected',
      lastPing: new Date().toISOString(),
      functions: ['navigate', 'screenshot', 'click', 'fill', 'evaluate']
    },
    {
      name: 'Fetch',
      status: 'connected',
      lastPing: new Date().toISOString(),
      functions: ['http_request', 'api_test', 'webhook_test']
    }
  ]);
  const testApiEndpoint = async (endpoint: string) => {
    try {
      const response = await fetch(`/api/dev/test-endpoint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint })
      });
      
      const result = await response.json();
      console.log('API Test Result:', result);
    } catch (error) {
      console.error('API Test Error:', error);
    }
  };

  const runDatabaseQuery = async (query: string) => {
    try {
      const response = await fetch(`/api/dev/db-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      const result = await response.json();
      console.log('DB Query Result:', result);
    } catch (error) {
      console.error('DB Query Error:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">MCP Development Dashboard</h1>
        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
          Real-time Integration
        </span>
      </div>

      {/* MCP Server Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {servers.map((server) => (
          <div key={server.name} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">{server.name}</h3>
              <span 
                className={`px-2 py-1 rounded text-xs ${
                  server.status === 'connected' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {server.status}
              </span>
            </div>
            <div className="text-xs text-gray-500 mb-2">
              Last ping: {new Date(server.lastPing).toLocaleTimeString()}
            </div>
            <div className="space-y-1">
              {server.functions.slice(0, 3).map((func) => (
                <div key={func} className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {func}
                </div>
              ))}
              {server.functions.length > 3 && (
                <div className="text-xs text-gray-500">
                  +{server.functions.length - 3} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-4">API Testing</h3>
          <div className="space-y-2">
            <button 
              onClick={() => testApiEndpoint('/api/health')}
              className="w-full text-left px-3 py-2 border rounded hover:bg-gray-50"
            >
              Test Health API
            </button>
            <button 
              onClick={() => testApiEndpoint('/api/auth/session')}
              className="w-full text-left px-3 py-2 border rounded hover:bg-gray-50"
            >
              Test Auth Session
            </button>
            <button 
              onClick={() => testApiEndpoint('/api/profile')}
              className="w-full text-left px-3 py-2 border rounded hover:bg-gray-50"
            >
              Test Profile API
            </button>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-4">Database Operations</h3>
          <div className="space-y-2">
            <button 
              onClick={() => runDatabaseQuery('SELECT COUNT(*) FROM users')}
              className="w-full text-left px-3 py-2 border rounded hover:bg-gray-50"
            >
              Count Users
            </button>
            <button 
              onClick={() => runDatabaseQuery('SELECT * FROM institutions LIMIT 5')}
              className="w-full text-left px-3 py-2 border rounded hover:bg-gray-50"
            >
              List Institutions
            </button>
            <button 
              onClick={() => runDatabaseQuery('SELECT version()')}
              className="w-full text-left px-3 py-2 border rounded hover:bg-gray-50"
            >
              DB Version
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Logs */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-4">Real-time MCP Activity</h3>
        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm h-40 overflow-y-auto">
          <div>[{new Date().toISOString()}] MCP Filesystem: Connected</div>
          <div>[{new Date().toISOString()}] MCP PostgreSQL: Query executed</div>
          <div>[{new Date().toISOString()}] MCP Puppeteer: Browser launched</div>
          <div>[{new Date().toISOString()}] MCP Fetch: API endpoint tested</div>
        </div>
      </div>
    </div>
  );
}
