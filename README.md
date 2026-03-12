# tmux-agent-status

Live AI agent status in your tmux window tabs. See at a glance whether Claude Code, Codex, Copilot CLI, or Aider is thinking, writing, planning, or waiting — with color-coded icons right in the tab bar.

```
 ◆ 0:project  ✎ 1:editor  ● 2:shell
```

## Status indicators

| Icon | Color | Meaning |
|------|-------|---------|
| `◆` | Blue | Thinking (reading, searching) |
| `✎` | Magenta | Writing code (Edit, Write, Bash) |
| `◇` | Cyan | Plan mode |
| `●` | Green | Waiting for input |
| `▲` | Orange | Needs a decision (permission prompt) |

## Requirements

- tmux
- Node.js >= 18

## Install

```bash
npx tmux-agent-status install
```

This will:
- Install hook scripts for Claude Code and Codex
- Configure your tmux `window-status-format` to show agent status
- Reload your tmux config

## Update

After updating the package (or to re-apply configuration):

```bash
npx tmux-agent-status@latest update
```

## Uninstall

```bash
npx tmux-agent-status uninstall
```

Removes all hooks and tmux configuration changes.

## Check status

See the current state of all active panes:

```bash
npx tmux-agent-status status
```

## How it works

1. Agent tool hooks call a state-writer script with the current state (`thinking`, `writing`, `planning`, `waiting`, `deciding`)
2. State is written atomically to `$TMPDIR/tmux-ai-status/<pane>.state`
3. Tmux polls a tab-status script every 3 seconds via `#()` in `window-status-format`
4. The script reads the state file and returns the matching tmux color code + icon
5. If no state file exists, it falls back to process-tree detection of known AI tools

## Supported tools

| Tool | Integration |
|------|-------------|
| Claude Code | Hook-based (automatic) |
| Codex | Hook-based (automatic) |
| Aider | Fallback process detection |
| Copilot CLI | Fallback process detection |

## License

MIT
