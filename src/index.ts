#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { parseTarget, RemoteTarget, testSSHConnection } from './ssh-utils.js';

// Import all tool definitions and handlers
import { bashRemoteTool, executeBashRemote } from './tools/bash-remote.js';
import { readRemoteTool, executeReadRemote } from './tools/read-remote.js';
import { writeRemoteTool, executeWriteRemote } from './tools/write-remote.js';
import { editRemoteTool, executeEditRemote } from './tools/edit-remote.js';
import { multiEditRemoteTool, executeMultiEditRemote } from './tools/multi-edit-remote.js';
import { lsRemoteTool, executeLSRemote } from './tools/ls-remote.js';
import { globRemoteTool, executeGlobRemote } from './tools/glob-remote.js';
import { grepRemoteTool, executeGrepRemote } from './tools/grep-remote.js';

class ClaudeRemoteMCPServer {
  private server: Server;
  private target: RemoteTarget;

  constructor(target: RemoteTarget) {
    this.target = target;
    this.server = new Server(
      {
        name: 'claude-remote',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers(): void {
    // Register tool list handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          bashRemoteTool,
          readRemoteTool,
          writeRemoteTool,
          editRemoteTool,
          multiEditRemoteTool,
          lsRemoteTool,
          globRemoteTool,
          grepRemoteTool,
        ],
      };
    });

    // Register tool execution handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Add target to all tool arguments
        const argsWithTarget = { ...args, target: `${this.target.host}:${this.target.path}` };
        
        switch (name) {
          case 'BashRemote':
            return await executeBashRemote(argsWithTarget);
          case 'ReadRemote':
            return await executeReadRemote(argsWithTarget);
          case 'WriteRemote':
            return await executeWriteRemote(argsWithTarget);
          case 'EditRemote':
            return await executeEditRemote(argsWithTarget);
          case 'MultiEditRemote':
            return await executeMultiEditRemote(argsWithTarget);
          case 'LSRemote':
            return await executeLSRemote(argsWithTarget);
          case 'GlobRemote':
            return await executeGlobRemote(argsWithTarget);
          case 'GrepRemote':
            return await executeGrepRemote(argsWithTarget);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Claude Remote MCP server running on stdio');
  }
}

async function main(): Promise<void> {
  // Parse CLI argument for target
  const targetArg = process.argv[2];
  if (!targetArg) {
    console.error('Usage: node index.js host:path');
    console.error('Example: node index.js myserver:/home/user/project');
    process.exit(1);
  }

  try {
    const target = parseTarget(targetArg);
    
    // Test SSH connection
    await testSSHConnection(target.host);
    
    const server = new ClaudeRemoteMCPServer(target);
    await server.run();
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}