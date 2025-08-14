import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeRemoteCommand, parseTarget, RemoteTarget } from '../ssh-utils.js';

export const bashRemoteTool: Tool = {
  name: 'BashRemote',
  description: `Executes a given bash command on a remote system via SSH with optional timeout, ensuring proper handling and security measures.

Usage notes:
- The command argument is required
- You can specify an optional timeout in milliseconds (up to 600000ms / 10 minutes). If not specified, commands will timeout after 120000ms (2 minutes)
- Always quote file paths that contain spaces with double quotes
- If the output exceeds 30000 characters, output will be truncated
- VERY IMPORTANT: You MUST avoid using search commands like \`find\` and \`grep\`. Instead use GrepRemote, GlobRemote, or Task to search
- If you still need to run \`grep\`, use ripgrep at \`rg\` first
- When issuing multiple commands, use the ';' or '&&' operator to separate them
- Try to maintain your current working directory throughout the session by using absolute paths`,
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The command to execute'
      },
      description: {
        type: 'string',
        description: 'Clear, concise description of what this command does in 5-10 words'
      },
      timeout: {
        type: 'number',
        description: 'Optional timeout in milliseconds (max 600000)',
        maximum: 600000
      }
    },
    required: ['command'],
    additionalProperties: false
  }
};

export async function executeBashRemote(args: any): Promise<any> {
  const { target, command, timeout = 120000 } = args;
  
  const remoteTarget = parseTarget(target);
  const workingDir = remoteTarget.path;
  
  try {
    const result = await executeRemoteCommand(remoteTarget.host, command, {
      timeout: Math.min(timeout, 600000),
      cwd: workingDir
    });
    
    let output = result.stdout;
    if (result.stderr) {
      output += '\n' + result.stderr;
    }
    
    // Truncate if too long
    if (output.length > 30000) {
      output = output.substring(0, 30000) + '\n[Output truncated...]';
    }
    
    return {
      content: [
        {
          type: 'text',
          text: output || 'Command executed successfully (no output)'
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing command: ${error.message}`
        }
      ],
      isError: true
    };
  }
}