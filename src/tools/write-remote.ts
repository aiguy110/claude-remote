import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeRemoteCommand, parseTarget, uploadFile, createTempFile, cleanupTempFile } from '../ssh-utils.js';

export const writeRemoteTool: Tool = {
  name: 'WriteRemote',
  description: `Writes a file to a remote filesystem via SSH.

Usage:
- This tool will overwrite the existing file if there is one at the provided path on the remote system
- If this is an existing file, you MUST use the ReadRemote tool first to read the file's contents
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required
- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User
- Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked`,
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'The absolute path to the file to write on the remote system'
      },
      content: {
        type: 'string',
        description: 'The content to write to the file'
      }
    },
    required: ['file_path', 'content'],
    additionalProperties: false
  }
};

export async function executeWriteRemote(args: any): Promise<any> {
  const { target, file_path, content } = args;
  
  const remoteTarget = parseTarget(target);
  let tempFile: string | null = null;
  
  try {
    // Create temporary file with content
    tempFile = await createTempFile(content);
    
    // Upload file to remote system
    await uploadFile(remoteTarget.host, tempFile, file_path);
    
    return {
      content: [
        {
          type: 'text',
          text: `File created successfully at: ${file_path}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error writing file: ${error.message}`
        }
      ],
      isError: true
    };
  } finally {
    if (tempFile) {
      await cleanupTempFile(tempFile);
    }
  }
}