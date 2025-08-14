import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeRemoteCommand, parseTarget, downloadFile, uploadFile, createTempFile, cleanupTempFile } from '../ssh-utils.js';
import { readFile, writeFile } from 'fs/promises';

export const editRemoteTool: Tool = {
  name: 'EditRemote',
  description: `Performs exact string replacements in files on a remote system via SSH.

Usage:
- You must use your ReadRemote tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file
- When editing text from ReadRemote tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required
- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked
- The edit will FAIL if \`old_string\` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use \`replace_all\` to change every instance of \`old_string\`
- Use \`replace_all\` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance`,
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'The absolute path to the file to modify on the remote system'
      },
      old_string: {
        type: 'string',
        description: 'The text to replace'
      },
      new_string: {
        type: 'string',
        description: 'The text to replace it with (must be different from old_string)'
      },
      replace_all: {
        type: 'boolean',
        description: 'Replace all occurences of old_string (default false)',
        default: false
      }
    },
    required: ['file_path', 'old_string', 'new_string'],
    additionalProperties: false
  }
};

export async function executeEditRemote(args: any): Promise<any> {
  const { target,  file_path, old_string, new_string, replace_all = false } = args;
  
  if (old_string === new_string) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: old_string and new_string must be different'
        }
      ],
      isError: true
    };
  }
  
  const remoteTarget = parseTarget(target);
  let tempDownload: string | null = null;
  let tempUpload: string | null = null;
  
  try {
    // Download the file to edit locally
    tempDownload = await createTempFile('');
    await downloadFile(remoteTarget.host, file_path, tempDownload);
    
    // Read file content
    const content = await readFile(tempDownload, 'utf-8');
    
    if (!content.includes(old_string)) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: old_string not found in file: ${old_string}`
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
              text: `Error: old_string appears ${occurrences} times in file. Use replace_all=true or provide more context to make it unique.`
            }
          ],
          isError: true
        };
      }
    }
    
    // Perform replacement
    const newContent = replace_all 
      ? content.replaceAll(old_string, new_string)
      : content.replace(old_string, new_string);
    
    // Upload the modified content
    tempUpload = await createTempFile(newContent);
    await uploadFile(remoteTarget.host, tempUpload, file_path);
    
    return {
      content: [
        {
          type: 'text',
          text: `The file ${file_path} has been updated. Here's the result of running \`cat -n\` on a snippet of the edited file:\n${getSnippetAroundChange(newContent, new_string)}`
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

function getSnippetAroundChange(content: string, newString: string): string {
  const lines = content.split('\n');
  const targetLineIndex = lines.findIndex(line => line.includes(newString));
  
  if (targetLineIndex === -1) return '';
  
  const start = Math.max(0, targetLineIndex - 2);
  const end = Math.min(lines.length, targetLineIndex + 3);
  
  return lines.slice(start, end)
    .map((line, idx) => `    ${start + idx + 1}→${line}`)
    .join('\n');
}