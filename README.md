# Claude Remote Tools

🚀 **Operate on remote systems seamlessly with Claude Code via SSH**

An npm package that provides remote versions of Claude Code tools, allowing you to develop, debug, and manage code on remote servers as if they were local.

## ✨ Features

- **Seamless Remote Development** - Use Claude Code on remote systems via SSH
- **All Claude Tools Available** - BashRemote, ReadRemote, WriteRemote, EditRemote, etc.
- **SSH Key Integration** - Works with your existing `~/.ssh/config` and ssh-agent
- **Zero Configuration** - Automatically disables local tools and enables remote ones
- **Secure** - Uses standard SSH protocols with proper escaping

## 📦 Installation

```bash
npm install -g @aiguy110/claude-remote
```

**Shell completion is automatically installed!** 🎉

The package automatically installs bash and zsh completions during installation. After installing, restart your terminal or run:

```bash
# For bash users:
source ~/.bashrc

# For zsh users:  
source ~/.zshrc
```

The completion provides:
- SSH host completion from `~/.ssh/config` 
- Claude CLI argument completion after the target
- Common remote path suggestions

## 🚀 Quick Start

1. **Ensure SSH access** to your remote system:
   ```bash
   # Test SSH connection
   ssh myserver
   ```

2. **Use claude-remote** instead of `claude`:
   ```bash
   # Instead of: claude
   claude-remote myserver:/path/to/project

   # Pass any claude arguments
   claude-remote myserver:/path/to/project --resume
   claude-remote myserver:/path/to/project -p "help me debug this code"
   ```

3. **Claude now operates remotely** - all file operations, commands, and tools work on the remote system!

## 🔧 Prerequisites

- **Node.js 18+** 
- **Claude CLI** installed (`npm install -g claude-cli`)
- **SSH access** to target systems with **key-based authentication**
- **SSH configuration** in `~/.ssh/config`
- **ripgrep** (`rg`) on remote systems (for search functionality)

> **Note:** Password authentication is not currently supported. You must use SSH key-based authentication.

## ⚙️ SSH Configuration

Ensure your `~/.ssh/config` has entries for your servers with SSH key authentication:

```
Host myserver
    HostName example.com
    User myuser
    IdentityFile ~/.ssh/id_rsa
    
Host production
    HostName prod.example.com
    User deploy
    Port 2222
    IdentityFile ~/.ssh/id_ed25519
```

**Important:** Only SSH key authentication is supported. Ensure your public key is installed on the remote system (`~/.ssh/authorized_keys`) and that you can connect without entering a password.

## 📖 Usage Examples

```bash
# Work on a project
claude-remote myserver:/var/www/myapp

# Resume a conversation
claude-remote myserver:/home/user/code --resume

# One-shot command
claude-remote production:/opt/service "check the logs for errors"
```

## 🛠️ Available Tools

When using `claude-remote`, Claude has access to these remote tools:

- **BashRemote** - Execute commands on remote system
- **ReadRemote** - Read files from remote filesystem  
- **WriteRemote** - Write files to remote filesystem
- **EditRemote** - Edit remote files with exact string replacement
- **MultiEditRemote** - Make multiple edits in one operation
- **LSRemote** - List remote directories
- **GlobRemote** - Find files by pattern on remote system
- **GrepRemote** - Search file contents using ripgrep

## 🔒 Security

- Uses your existing SSH keys and agent
- Respects SSH configuration and security settings
- All commands are properly escaped
- No credentials stored or transmitted
- Local tools are disabled when operating remotely

### Permission Management

For security, `claude-remote` automatically removes any previously allowed Remote tool permissions before launching Claude. This prevents permission confusion where users might grant tool permissions in a local directory thinking they apply to the remote directory, only to have those permissions unexpectedly carry over to different SSH targets from the same local directory.

**Important:** This means that Remote tools cannot be permanently allowed for specific remote directories - you will need to grant permissions each time you use `claude-remote`. This is a necessary security trade-off to prevent unauthorized access to different remote systems.

## 🐛 Troubleshooting

**SSH Connection Issues:**
```bash
# Test connectivity
ssh -o ConnectTimeout=5 myserver true

# Check SSH config
ssh -F ~/.ssh/config myserver
```

**Missing ripgrep:**
```bash
# Install on remote system
ssh myserver 'sudo apt install ripgrep'  # Ubuntu/Debian
ssh myserver 'brew install ripgrep'      # macOS
```

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines and submit PRs.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Claude Code Documentation](https://docs.anthropic.com/claude/docs)
- [Report Issues](https://github.com/aiguy110/claude-remote/issues)
- [npm Package](https://www.npmjs.com/package/@aiguy110/claude-remote)
