# --- CURSOR AGENT FIX START ---
# Detect if we are in Cursor's "Agent" or "Composer" terminal
if [[ -n "$npm_config_yes" || -n "$COMPOSER_NO_INTERACTION" || "$TERM_PROGRAM" == "cursor" && "$TERM" == "dumb" ]]; then
    # Force a simple prompt
    export PS1='$ '
    
    # Disable Zsh interactions/zle
    unsetopt zle 2>/dev/null
    
    # If using Powerlevel10k, disable it instantly
    [[ -f ~/.p10k.zsh ]] && typeset -g POWERLEVEL9K_INSTANT_PROMPT=off
    
    # Stop processing the rest of the config (prevents plugins from loading)
    return
fi
# --- CURSOR AGENT FIX END ---