import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeRemoteCommand, parseTarget } from '../ssh-utils.js';

export const readRemoteTool: Tool = {
  name: 'ReadRemote',
  description: `Reads a file from a remote filesystem via SSH. You can access any file on the remote system by using this tool.

Usage:
- The file_path parameter must be an absolute path on the remote system
- By default, it reads up to 2000 lines starting from the beginning of the file
- You can optionally specify a line offset and limit (especially handy for long files)
- Any lines longer than 2000 characters will be truncated
- Results are returned using cat -n format, with line numbers starting at 1
- You have the capability to call multiple tools in a single response. It is always better to speculatively read multiple files as a batch that are potentially useful`,
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'The absolute path to the file to read on the remote system'
      },
      offset: {
        type: 'number',
        description: 'The line number to start reading from. Only provide if the file is too large to read at once'
      },
      limit: {
        type: 'number',
        description: 'The number of lines to read. Only provide if the file is too large to read at once.'
      }
    },
    required: ['file_path'],
    additionalProperties: false
  }
};

export async function executeReadRemote(args: any): Promise<any> {
  const { target, file_path, offset, limit } = args;
  
  const remoteTarget = parseTarget(target);
  
  try {
    let command = '';
    
    if (offset && limit) {
      // Read specific range of lines
      command = `sed -n '${offset},${offset + limit - 1}p' '${file_path}' | cat -n`;
    } else if (limit) {
      // Read first N lines
      command = `head -n ${limit} '${file_path}' | cat -n`;
    } else {
      // Read entire file (up to 2000 lines by default)
      command = `head -n 2000 '${file_path}' | cat -n`;
    }
    
    const result = await executeRemoteCommand(remoteTarget.host, command);
    
    if (result.stderr && result.stderr.includes('No such file or directory')) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: File not found: ${file_path}`
          }
        ],
        isError: true
      };
    }
    
    if (!result.stdout.trim()) {
      return {
        content: [
          {
            type: 'text',
            text: `File exists but has empty contents: ${file_path}`
          }
        ]
      };
    }
    
    return {
      content: [
        {
          type: 'text',
          text: result.stdout
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error reading file: ${error.message}`
        }
      ],
      isError: true
    };
  }
}