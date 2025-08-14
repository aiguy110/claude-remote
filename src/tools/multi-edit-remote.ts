import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeRemoteCommand, parseTarget, downloadFile, uploadFile, createTempFile, cleanupTempFile } from '../ssh-utils.js';
import { readFile } from 'fs/promises';

export const multiEditRemoteTool: Tool = {
  name: 'MultiEditRemote',
  description: `This is a tool for making multiple edits to a single file on a remote system in one operation. It is built on top of the EditRemote tool and allows you to perform multiple find-and-replace operations efficiently.

Before using this tool:
1. Use the ReadRemote tool to understand the file's contents and context
2. Verify the directory path is correct on the remote system

To make multiple file edits, provide the following:
2. file_path: The absolute path to the file to modify on the remote system
3. edits: An array of edit operations to perform, where each edit contains:
   - old_string: The text to replace (must match the file contents exactly, including all whitespace and indentation)
   - new_string: The edited text to replace the old_string
   - replace_all: Replace all occurences of old_string. This parameter is optional and defaults to false.

IMPORTANT:
- All edits are applied in sequence, in the order they are provided
- Each edit operates on the result of the previous edit
- All edits must be valid for the operation to succeed - if any edit fails, none will be applied
- This tool is ideal when you need to make several changes to different parts of the same file
- The edits are atomic - either all succeed or none are applied
- Plan your edits carefully to avoid conflicts between sequential operations`,
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'The absolute path to the file to modify on the remote system'
      },
      edits: {
        type: 'array',
        description: 'Array of edit operations to perform sequentially on the file',
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            old_string: {
              type: 'string',
              description: 'The text to replace'
            },
            new_string: {
              type: 'string',
              description: 'The text to replace it with'
            },
            replace_all: {
              type: 'boolean',
              description: 'Replace all occurences of old_string (default false).',
              default: false
            }
          },
          required: ['old_string', 'new_string'],
          additionalProperties: false
        }
      }
    },
    required: ['file_path', 'edits'],
    additionalProperties: false
  }
};

export async function executeMultiEditRemote(args: any): Promise<any> {
  const { target,  file_path, edits } = args;
  
  const remoteTarget = parseTarget(target);
  let tempDownload: string | null = null;
  let tempUpload: string | null = null;
  
  try {
    // Download the file to edit locally
    tempDownload = await createTempFile('');
    await downloadFile(remoteTarget.host, file_path, tempDownload);
    
    // Read file content
    let content = await readFile(tempDownload, 'utf-8');
    
    // Apply each edit in sequence
    for (let i = 0; i < edits.length; i++) {
      const edit = edits[i];
      const { target, old_string, new_string, replace_all = false } = edit;
      
      if (old_string === new_string) {
        return {
          content: [
            {
              type: 'text',
              text: `Error in edit ${i + 1}: old_string and new_string must be different`
            }
          ],
          isError: true
        };
      }
      
      if (!content.includes(old_string)) {
        return {
          content: [
            {
              type: 'text',
              text: `Error in edit ${i + 1}: old_string not found in file: ${old_string}`
            }
          ],
          isError: true
        };
      }
      
      // Check for uniqueness if not replace_all
      if (!replace_all) {
        const occurrences = (content.match(new RegExp(old_string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        if (occurrences > 1) {
          return {
            content: [
              {
                type: 'text',
                text: `Error in edit ${i + 1}: old_string appears ${occurrences} times in file. Use replace_all=true or provide more context to make it unique.`
              }
            ],
            isError: true
          };
        }
      }
      
      // Apply the edit
      content = replace_all 
        ? content.replaceAll(old_string, new_string)
        : content.replace(old_string, new_string);
    }
    
    // Upload the modified content
    tempUpload = await createTempFile(content);
    await uploadFile(remoteTarget.host, tempUpload, file_path);
    
    return {
      content: [
        {
          type: 'text',
          text: `Successfully applied ${edits.length} edits to ${file_path}`
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error editing file: ${error.message}`
        }
      ],
      isError: true
    };
  } finally {
    if (tempDownload) await cleanupTempFile(tempDownload);
    if (tempUpload) await cleanupTempFile(tempUpload);
  }
}