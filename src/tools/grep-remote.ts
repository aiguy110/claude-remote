import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { executeRemoteCommand, parseTarget, escapeShellArg } from '../ssh-utils.js';

export const grepRemoteTool: Tool = {
  name: 'GrepRemote',
  description: `A powerful search tool built on ripgrep for remote systems via SSH

Usage:
- ALWAYS use GrepRemote for search tasks on remote systems. NEVER invoke \`grep\` or \`rg\` as a BashRemote command
- Supports full regex syntax (e.g., "log.*Error", "function\\s+\\w+")
- Filter files with glob parameter (e.g., "*.js", "**/*.tsx") or type parameter (e.g., "js", "py", "rust")
- Output modes: "content" shows matching lines, "files_with_matches" shows only file paths (default), "count" shows match counts
- Use Task tool for open-ended searches requiring multiple rounds
- Pattern syntax: Uses ripgrep (not grep) - literal braces need escaping (use \`interface\\{\\}\` to find \`interface{}\` in Go code)
- Multiline matching: By default patterns match within single lines only. For cross-line patterns like \`struct \\{[\\s\\S]*?field\`, use \`multiline: true\``,
  inputSchema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'The regular expression pattern to search for in file contents'
      },
      path: {
        type: 'string',
        description: 'File or directory to search in on the remote system. Defaults to the path from target.'
      },
      glob: {
        type: 'string',
        description: 'Glob pattern to filter files (e.g. "*.js", "*.{ts,tsx}") - maps to rg --glob'
      },
      type: {
        type: 'string',
        description: 'File type to search (rg --type). Common types: js, py, rust, go, java, etc. More efficient than include for standard file types.'
      },
      output_mode: {
        type: 'string',
        enum: ['content', 'files_with_matches', 'count'],
        description: 'Output mode: "content" shows matching lines (supports -A/-B/-C context, -n line numbers, head_limit), "files_with_matches" shows file paths (supports head_limit), "count" shows match counts (supports head_limit). Defaults to "files_with_matches".'
      },
      '-i': {
        type: 'boolean',
        description: 'Case insensitive search (rg -i)'
      },
      '-n': {
        type: 'boolean',
        description: 'Show line numbers in output (rg -n). Requires output_mode: "content", ignored otherwise.'
      },
      '-A': {
        type: 'number',
        description: 'Number of lines to show after each match (rg -A). Requires output_mode: "content", ignored otherwise.'
      },
      '-B': {
        type: 'number',
        description: 'Number of lines to show before each match (rg -B). Requires output_mode: "content", ignored otherwise.'
      },
      '-C': {
        type: 'number',
        description: 'Number of lines to show before and after each match (rg -C). Requires output_mode: "content", ignored otherwise.'
      },
      multiline: {
        type: 'boolean',
        description: 'Enable multiline mode where . matches newlines and patterns can span lines (rg -U --multiline-dotall). Default: false.'
      },
      head_limit: {
        type: 'number',
        description: 'Limit output to first N lines/entries, equivalent to "| head -N". Works across all output modes: content (limits output lines), files_with_matches (limits file paths), count (limits count entries). When unspecified, shows all results from ripgrep.'
      }
    },
    required: ['pattern'],
    additionalProperties: false
  }
};

export async function executeGrepRemote(args: any): Promise<any> {
  const { 
    target,
    pattern, 
    path: searchPath,
    glob,
    type,
    output_mode = 'files_with_matches',
    '-i': caseInsensitive,
    '-n': showLineNumbers,
    '-A': afterContext,
    '-B': beforeContext, 
    '-C': context,
    multiline,
    head_limit
  } = args;
  
  const remoteTarget = parseTarget(target);
  const workingDir = searchPath || remoteTarget.path;
  
  try {
    // Build rg command
    let command = 'rg';
    
    // Add flags
    if (caseInsensitive) command += ' -i';
    if (multiline) command += ' -U --multiline-dotall';
    
    // Output mode flags
    switch (output_mode) {
      case 'files_with_matches':
        command += ' -l';
        break;
      case 'count':
        command += ' -c';
        break;
      case 'content':
        if (showLineNumbers) command += ' -n';
        if (context) command += ` -C ${context}`;
        else {
          if (afterContext) command += ` -A ${afterContext}`;
          if (beforeContext) command += ` -B ${beforeContext}`;
        }
        break;
    }
    
    // File filtering
    if (type) command += ` --type ${escapeShellArg(type)}`;
    if (glob) command += ` --glob ${escapeShellArg(glob)}`;
    
    // Add pattern and search path
    command += ` ${escapeShellArg(pattern)} ${escapeShellArg(workingDir)}`;
    
    // Add head limit if specified
    if (head_limit) {
      command += ` | head -n ${head_limit}`;
    }
    
    const result = await executeRemoteCommand(remoteTarget.host, command);
    
    // Handle no matches
    if (!result.stdout.trim() && result.stderr.includes('No such file or directory')) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Search path not found: ${workingDir}`
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
            text: `No matches found for pattern: ${pattern}`
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
          text: `Error searching files: ${error.message}`
        }
      ],
      isError: true
    };
  }
}