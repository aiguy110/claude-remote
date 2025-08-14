import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeRemoteCommand, parseTarget, escapeShellArg } from '../ssh-utils.js';

export const globRemoteTool: Tool = {
  name: 'GlobRemote',
  description: `Fast file pattern matching tool that works with any codebase size on a remote system via SSH.
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files by name patterns on a remote system
- When you are doing an open ended search that may require multiple rounds of globbing and grepping, use the Task tool instead
- You have the capability to call multiple tools in a single response. It is always better to speculatively perform multiple searches as a batch that are potentially useful.`,
  inputSchema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'The glob pattern to match files against'
      },
      path: {
        type: 'string',
        description: 'The directory to search in on the remote system. If not specified, the path from target will be used. IMPORTANT: Omit this field to use the target path. DO NOT enter "undefined" or "null" - simply omit it for the default behavior. Must be a valid directory path if provided.'
      }
    },
    required: ['pattern'],
    additionalProperties: false
  }
};

export async function executeGlobRemote(args: any): Promise<any> {
  const { target,  pattern, path: searchPath } = args;
  
  const remoteTarget = parseTarget(target);
  const workingDir = searchPath || remoteTarget.path;
  
  try {
    // Use find command to implement glob pattern matching
    let command: string;
    
    if (pattern.includes('**')) {
      // Handle recursive patterns
      const simplifiedPattern = pattern.replace(/\*\*/g, '*').replace(/\/\*/g, '/*');
      command = `cd ${escapeShellArg(workingDir)} && find . -type f -name ${escapeShellArg(simplifiedPattern.split('/').pop() || '*')} | sort -t/ -k2`;
    } else {
      // Handle simple patterns
      command = `cd ${escapeShellArg(workingDir)} && find . -maxdepth ${pattern.includes('/') ? '10' : '1'} -type f -name ${escapeShellArg(pattern)} | sort`;
    }
    
    const result = await executeRemoteCommand(remoteTarget.host, command);
    
    if (!result.stdout.trim()) {
      return {
        content: [
          {
            type: 'text',
            text: `No files found matching pattern: ${pattern}`
          }
        ]
      };
    }
    
    // Clean up the output - remove leading ./ and convert to absolute paths
    const files = result.stdout.trim().split('\n')
      .filter(line => line.trim())
      .map(line => {
        const cleaned = line.replace(/^\.\//, '');
        return workingDir === '/' ? `/${cleaned}` : `${workingDir}/${cleaned}`;
      });
    
    return {
      content: [
        {
          type: 'text',
          text: files.join('\n')
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error searching for files: ${error.message}`
        }
      ],
      isError: true
    };
  }
}