# Bash completion for claude-remote
# Usage: claude-remote host:path [claude arguments...]

_claude_remote_complete() {
    local cur prev words cword
    _init_completion || return

    # If we're completing the first argument (target)
    if [[ $cword -eq 1 ]]; then
        _claude_remote_complete_targets
        return
    fi

    # For subsequent arguments, complete Claude CLI options
    _claude_remote_complete_claude_args
}

_claude_remote_complete_targets() {
    local hosts
    
    # Extract hosts from ~/.ssh/config
    if [[ -f ~/.ssh/config ]]; then
        hosts=$(awk '/^[[:space:]]*Host[[:space:]]/ { 
            for(i=2; i<=NF; i++) {
                if($i !~ /[*?]/) print $i
            }
        }' ~/.ssh/config 2>/dev/null)
    fi
    
    # If current word contains a colon, we're completing the path part
    if [[ $cur == *:* ]]; then
        local host=${cur%%:*}
        local path_prefix=${cur#*:}
        
        # Suggest common remote paths
        local common_paths=(
            "/"
            "/home/"
            "/var/www/"
            "/opt/"
            "/usr/local/"
            "/tmp/"
        )
        
        local suggestions=()
        for path in "${common_paths[@]}"; do
            suggestions+=("${host}:${path}")
        done
        
        COMPREPLY=($(compgen -W "${suggestions[*]}" -- "$cur"))
    else
        # Complete host names with colon suffix
        local host_suggestions=()
        for host in $hosts; do
            host_suggestions+=("${host}:")
        done
        
        COMPREPLY=($(compgen -W "${host_suggestions[*]}" -- "$cur"))
    fi
}

_claude_remote_complete_claude_args() {
    local claude_options=(
        "--debug"
        "--verbose"
        "-p"
        "--print"
        "--output-format"
        "--input-format"
        "--mcp-debug"
        "--dangerously-skip-permissions"
        "--allowedTools"
        "--disallowedTools"
        "--mcp-config"
        "--append-system-prompt"
        "--permission-mode"
        "-c"
        "--continue"
        "-r"
        "--resume"
        "--model"
        "--fallback-model"
        "--settings"
        "--add-dir"
        "--ide"
        "--strict-mcp-config"
        "--session-id"
        "-v"
        "--version"
        "-h"
        "--help"
    )
    
    local claude_commands=(
        "config"
        "mcp"
        "migrate-installer"
        "setup-token"
        "doctor"
        "update"
        "install"
    )
    
    # Check if current word starts with dash (option)
    if [[ $cur == -* ]]; then
        COMPREPLY=($(compgen -W "${claude_options[*]}" -- "$cur"))
    else
        # Complete commands or allow any text (prompts)
        COMPREPLY=($(compgen -W "${claude_commands[*]}" -- "$cur"))
    fi
    
    # Handle specific option completions
    case "$prev" in
        --output-format)
            COMPREPLY=($(compgen -W "text json stream-json" -- "$cur"))
            ;;
        --input-format)
            COMPREPLY=($(compgen -W "text stream-json" -- "$cur"))
            ;;
        --permission-mode)
            COMPREPLY=($(compgen -W "acceptEdits bypassPermissions default plan" -- "$cur"))
            ;;
        --settings|--mcp-config)
            _filedir
            ;;
        --add-dir)
            _filedir -d
            ;;
    esac
}

# Register completion
complete -F _claude_remote_complete claude-remote