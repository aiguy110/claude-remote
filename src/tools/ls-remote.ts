import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeRemoteCommand, parseTarget, escapeShellArg } from '../ssh-utils.js';

export const lsRemoteTool: Tool = {
  name: 'LSRemote',
  description: `Lists files and directories in a given path on a remote system via SSH. You can optionally provide an array of glob patterns to ignore with the ignore parameter. You should generally prefer the GlobRemote and GrepRemote tools, if you know which directories to search.`,
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The absolute path to the directory to list on the remote system (must be absolute, not relative)'
      },
      ignore: {
        type: 'array',
        description: 'List of glob patterns to ignore',
        items: {
          type: 'string'
        }
      }
    },
    required: ['path'],
    additionalProperties: false
  }
};

export async function executeLSRemote(args: any): Promise<any> {
  const { target,  path, ignore = [] } = args;
  
  const remoteTarget = parseTarget(target);
  
  try {
    let command = `ls -la ${escapeShellArg(path)}`;
    
    // If ignore patterns are provided, filter them out
    if (ignore.length > 0) {
      const ignorePattern = ignore.map((pattern: string) => escapeShellArg(pattern)).join(' -o -name ');
      command = `ls -la ${escapeShellArg(path)} | grep -v -E '${ignore.map((p: string) => p.replace(/\*/g, '.*')).join('|')}'`;
    }
    
    const result = await executeRemoteCommand(remoteTarget.host, command);
    
    if (result.stderr && result.stderr.includes('No such file or directory')) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Directory not found: ${path}`
          }
        ],
        isError: true
      };
    }
    
    return {
      content: [
        {
          type: 'text',
          text: result.stdout || 'Directory is empty'
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error listing directory: ${error.message}`
        }
      ],
      isError: true
    };
  }
}