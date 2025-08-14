#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const homeDir = os.homedir();
const packageDir = __dirname;

function detectShell() {
    try {
        const shell = process.env.SHELL || '';
        if (shell.includes('zsh')) return 'zsh';
        if (shell.includes('bash')) return 'bash';
        
        // Try to detect from running processes
        try {
            const ps = execSync('ps -p $$ -o comm=', { encoding: 'utf8', stdio: 'pipe' }).trim();
            if (ps.includes('zsh')) return 'zsh';
            if (ps.includes('bash')) return 'bash';
        } catch (e) {
            // Ignore errors
        }
    } catch (e) {
        // Ignore errors
    }
    
    return 'bash'; // Default fallback
}

function installBashCompletion() {
    try {
        const bashCompletionDirs = [
            path.join(homeDir, '.bash_completion.d'),
            '/usr/local/etc/bash_completion.d',
            '/etc/bash_completion.d'
        ];
        
        // Find writable completion directory
        let targetDir = null;
        for (const dir of bashCompletionDirs) {
            try {
                if (fs.existsSync(dir)) {
                    fs.accessSync(dir, fs.constants.W_OK);
                    targetDir = dir;
                    break;
                }
            } catch (e) {
                // Directory not writable, try next
            }
        }
        
        // Create user completion directory if no system one found
        if (!targetDir) {
            targetDir = bashCompletionDirs[0];
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        const sourcePath = path.join(packageDir, 'claude-remote-completion.bash');
        const targetPath = path.join(targetDir, 'claude-remote');
        
        fs.copyFileSync(sourcePath, targetPath);
        
        // Add source line to .bashrc if needed
        const bashrcPath = path.join(homeDir, '.bashrc');
        if (fs.existsSync(bashrcPath)) {
            const bashrcContent = fs.readFileSync(bashrcPath, 'utf8');
            const completionSource = `source ${targetPath}`;
            
            if (!bashrcContent.includes(completionSource)) {
                fs.appendFileSync(bashrcPath, `\n# Claude-remote completion\n${completionSource}\n`);
            }
        }
        
        console.log('✓ Bash completion installed');
        return true;
    } catch (error) {
        console.warn('⚠ Could not install bash completion:', error.message);
        return false;
    }
}

function installZshCompletion() {
    try {
        const zshCompletionDirs = [
            path.join(homeDir, '.local/share/zsh/completions'),
            path.join(homeDir, '.oh-my-zsh/completions'),
            '/usr/local/share/zsh/completions',
            '/usr/share/zsh/completions'
        ];
        
        // Find writable completion directory
        let targetDir = null;
        for (const dir of zshCompletionDirs) {
            try {
                if (fs.existsSync(dir)) {
                    fs.accessSync(dir, fs.constants.W_OK);
                    targetDir = dir;
                    break;
                }
            } catch (e) {
                // Directory not writable, try next
            }
        }
        
        // Create user completion directory if no system one found
        if (!targetDir) {
            targetDir = zshCompletionDirs[0];
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        const sourcePath = path.join(packageDir, '_claude-remote');
        const targetPath = path.join(targetDir, '_claude-remote');
        
        fs.copyFileSync(sourcePath, targetPath);
        
        // Update .zshrc if needed
        const zshrcPath = path.join(homeDir, '.zshrc');
        if (fs.existsSync(zshrcPath)) {
            const zshrcContent = fs.readFileSync(zshrcPath, 'utf8');
            const fpathLine = `fpath=(${targetDir} $fpath)`;
            const compinitLine = 'autoload -U compinit && compinit';
            
            let needsUpdate = false;
            let newContent = zshrcContent;
            
            if (!zshrcContent.includes(targetDir)) {
                newContent += `\n# Claude-remote completion\n${fpathLine}\n`;
                needsUpdate = true;
            }
            
            if (!zshrcContent.includes('compinit')) {
                newContent += `${compinitLine}\n`;
                needsUpdate = true;
            }
            
            if (needsUpdate) {
                fs.writeFileSync(zshrcPath, newContent);
            }
        }
        
        console.log('✓ Zsh completion installed');
        return true;
    } catch (error) {
        console.warn('⚠ Could not install zsh completion:', error.message);
        return false;
    }
}

function main() {
    console.log('Installing claude-remote shell completions...');
    
    const shell = detectShell();
    console.log(`Detected shell: ${shell}`);
    
    let success = false;
    
    if (shell === 'zsh') {
        success = installZshCompletion();
        // Also install bash as fallback
        installBashCompletion();
    } else {
        success = installBashCompletion();
        // Also install zsh for potential future use
        installZshCompletion();
    }
    
    if (success) {
        console.log('');
        console.log('🎉 Shell completion installed successfully!');
        console.log('');
        console.log('To activate completion in your current shell, run:');
        if (shell === 'zsh') {
            console.log('  source ~/.zshrc');
        } else {
            console.log('  source ~/.bashrc');
        }
        console.log('');
        console.log('Or restart your terminal.');
    } else {
        console.log('');
        console.log('❌ Could not install shell completion automatically.');
        console.log('You can manually install completion by copying the completion files');
        console.log('from the package directory to your shell\'s completion directory.');
    }
}

// Only run if this script is executed directly (not required)
if (require.main === module) {
    main();
}

module.exports = { installBashCompletion, installZshCompletion, detectShell };