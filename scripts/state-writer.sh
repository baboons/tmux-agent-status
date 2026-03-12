#!/usr/bin/env bash
# state-writer.sh - Called by agent tool hooks to write pane state
# Usage: state-writer.sh <thinking|waiting|deciding|planning|writing|clear>
# Claude Code hooks pipe JSON on stdin containing tool_name and permission_mode.

set -euo pipefail

STATE="${1:-}"
if [ -z "$STATE" ]; then
  echo "Usage: state-writer.sh <thinking|waiting|deciding|planning|writing|clear>" >&2
  exit 1
fi

# Get pane ID from tmux environment (inherited by hook processes)
PANE_ID="${TMUX_PANE:-}"
if [ -z "$PANE_ID" ]; then
  exit 0  # Not in tmux, nothing to do
fi

# Strip the % prefix from pane ID for filename
PANE_NUM="${PANE_ID#%}"

STATE_DIR="${TMPDIR:-/tmp}/tmux-ai-status"
STATE_FILE="${STATE_DIR}/${PANE_NUM}.state"

mkdir -p "$STATE_DIR"

# Read JSON from stdin if piped (Claude Code hooks pass tool context)
STDIN_JSON=""
if [ ! -t 0 ]; then
  STDIN_JSON=$(cat)
fi

# Extract a field value from flat JSON (no jq dependency)
extract_json_field() {
  echo "$STDIN_JSON" | grep -o "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | sed 's/.*:[[:space:]]*"//;s/"$//' | head -1 || true
}

# Refine "thinking" state based on JSON context from Claude Code
if [ "$STATE" = "thinking" ] && [ -n "$STDIN_JSON" ]; then
  PERMISSION_MODE=$(extract_json_field "permission_mode")
  TOOL_NAME=$(extract_json_field "tool_name")

  if [ "$PERMISSION_MODE" = "plan" ]; then
    STATE="planning"
  elif echo "$TOOL_NAME" | grep -qE '^(Write|Edit|Bash|MultiEdit|NotebookEdit)$'; then
    STATE="writing"
  fi
fi

if [ "$STATE" = "clear" ]; then
  rm -f "$STATE_FILE"
else
  # Atomic write: write to temp file then move
  TMP_FILE="${STATE_FILE}.$$"
  echo "$STATE" > "$TMP_FILE"
  mv -f "$TMP_FILE" "$STATE_FILE"
fi
