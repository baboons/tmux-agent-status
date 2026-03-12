# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

tmux-ai-status is a zero-dependency Node.js CLI that displays live agent tool status (thinking, writing, planning, waiting, deciding) in tmux window tabs with color-coded indicators. It integrates with Claude Code, Codex, Copilot CLI, and Aider.

## Commands

```bash
# Build
pnpm run build               # Compile TypeScript to dist/

# Run the CLI locally during development
node dist/cli.js install      # Install hooks + configure tmux
node dist/cli.js update       # Re-install scripts and refresh config (alias for install)
node dist/cli.js uninstall    # Remove all hooks + configuration
node dist/cli.js status       # Show current pane states

# Version bump (creates git commit + tag)
npm version patch|minor|major
```

Package manager is pnpm (9.15.0). No tests or linting configured.

## Architecture

**Source:** TypeScript in `src/`, compiled to `dist/` via `tsc`.

**Entry point:** `src/cli.ts` → `dist/cli.js` — routes subcommands to modules in `src/lib/`.

**State flow:**
1. Agent tool hooks call `scripts/state-writer.sh` with a state (`thinking|waiting|deciding|clear`)
2. Claude Code hooks also pipe JSON on stdin; `state-writer.sh` parses `tool_name` and `permission_mode` to refine `thinking` into `planning` (plan mode) or `writing` (Edit/Write/Bash)
3. The script writes state atomically to `$TMPDIR/tmux-ai-status/{pane_num}.state`
4. Tmux calls `scripts/tab-status.sh` every 3 seconds via `#()` in window-status-format
5. The script reads state files and returns tmux color codes:
   - Amber/gold (`colour214`) = thinking (reading, searching)
   - Magenta (`colour213`) = writing code (Edit, Write, Bash)
   - Cyan (`colour44`) = plan mode
   - Sage green (`colour108`) = waiting for input
   - Dusty red (`colour167`) = permission prompt
6. If no state file exists, falls back to process-tree detection of known AI tools

**Key modules:**
- `src/lib/install.ts` / `src/lib/uninstall.ts` — orchestrators that call each configure module and manage tmux reload
- `src/lib/configure-claude.ts` — adds/removes hooks in `~/.claude/settings.json` (UserPromptSubmit, PreToolUse, Notification, Stop)
- `src/lib/configure-codex.ts` — adds/removes notify config in `~/.codex/config.toml`
- `src/lib/configure-copilot.ts` — detects copilot/gh binary; no hook config (uses fallback detection)
- `src/lib/configure-tmux.ts` — modifies tmux config with window-status-format containing `#()` calls to tab-status.sh
- `src/lib/utils.ts` — constants (STATE_DIR, PLUGIN_DIR, SCRIPTS_DIR), marker block helpers, atomic file writes, tmux conf finder

**Path resolution:** `install.ts` uses `path.join(__dirname, '..', '..')` to reach the project root from `dist/lib/` at runtime (for `scripts/` and `package.json`).

**Configuration modification pattern:** All config changes use marker blocks (delimited comments) for idempotent insert/removal. `writeFileAtomic()` writes via temp file + rename to prevent corruption.

**Cross-platform:** Shell scripts handle macOS vs Linux differences (e.g., `stat` flags). State directory uses `$TMPDIR` with `/tmp` fallback.

## CI/CD

- **Publish:** `.github/workflows/publish.yml` — publishes to npm on GitHub release. Requires `NPM_TOKEN` secret.
- **Version bump:** `npm version patch/minor/major` creates a git commit + tag. Push the tag, create a GitHub release, and CI publishes.
