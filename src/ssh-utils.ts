import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const execAsync = promisify(exec);

export interface RemoteTarget {
  host: string;
  path: string;
}

export async function testSSHConnection(host: string): Promise<void> {
  try {
    await execAsync(`ssh -o ConnectTimeout=5 -o BatchMode=yes '${host}' true`, { timeout: 10000 });
  } catch (error: any) {
    throw new Error(`SSH connection failed: ${error.message}`);
  }
}


export function parseTarget(target: string): RemoteTarget {
  const colonIndex = target.indexOf(':');
  if (colonIndex === -1) {
    throw new Error('Invalid target format. Expected "host:path"');
  }
  
  return {
    host: target.substring(0, colonIndex),
    path: target.substring(colonIndex + 1)
  };
}

export async function executeRemoteCommand(host: string, command: string, options: {
  timeout?: number;
  cwd?: string;
} = {}): Promise<{ stdout: string; stderr: string }> {
  const { timeout = 120000, cwd } = options;
  
  let fullCommand = command;
  if (cwd) {
    fullCommand = `cd '${cwd}' && ${command}`;
  }
  
  const sshCommand = `ssh -o ConnectTimeout=10 -o ServerAliveInterval=60 -o ServerAliveCountMax=3 '${host}' '${fullCommand.replace(/'/g, "'\"'\"'")}'`;
  
  try {
    const result = await execAsync(sshCommand, { timeout });
    return result;
  } catch (error: any) {
    if (error.code === 'ETIMEDOUT') {
      throw new Error(`Command timed out after ${timeout}ms`);
    }
    throw error;
  }
}

export async function uploadFile(host: string, localPath: string, remotePath: string): Promise<void> {
  const scpCommand = `scp '${localPath}' '${host}:${remotePath}'`;
  
  try {
    await execAsync(scpCommand);
  } catch (error: any) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

export async function downloadFile(host: string, remotePath: string, localPath: string): Promise<void> {
  const scpCommand = `scp '${host}:${remotePath}' '${localPath}'`;
  
  try {
    await execAsync(scpCommand);
  } catch (error: any) {
    throw new Error(`Failed to download file: ${error.message}`);
  }
}

export async function createTempFile(content: string): Promise<string> {
  const tempPath = join(tmpdir(), `claude-remote-${randomBytes(8).toString('hex')}`);
  await writeFile(tempPath, content);
  return tempPath;
}

export async function cleanupTempFile(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    // Ignore cleanup errors
  }
}

export function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\"'\"'")}'`;
}