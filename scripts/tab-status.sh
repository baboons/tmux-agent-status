#!/usr/bin/env bash
# tab-status.sh - Called by tmux #() to return color codes for agent tool status
# Usage: tab-status.sh <pane_pid> <pane_id>

PANE_PID="${1:-}"
PANE_ID="${2:-}"

if [ -z "$PANE_PID" ] || [ -z "$PANE_ID" ]; then
  exit 0
fi

# Strip % prefix from pane ID
PANE_NUM="${PANE_ID#%}"

STATE_DIR="${TMPDIR:-/tmp}/tmux-ai-status"
STATE_FILE="${STATE_DIR}/${PANE_NUM}.state"

# Color definitions
COLOR_THINKING="#[fg=colour33]"    # Blue
COLOR_WRITING="#[fg=colour213]"    # Magenta
COLOR_PLANNING="#[fg=colour44]"    # Cyan
COLOR_WAITING="#[fg=colour78]"     # Green
COLOR_DECIDING="#[fg=colour208]"   # Orange

# Get file mtime in seconds since epoch (cross-platform)
get_mtime() {
  stat -f %m "$1" 2>/dev/null || stat -c %Y "$1" 2>/dev/null || echo 0
}

# Check state file first
if [ -f "$STATE_FILE" ]; then
  NOW=$(date +%s)
  MTIME=$(get_mtime "$STATE_FILE")
  AGE=$(( NOW - MTIME ))

  # Discard stale state (>120 seconds old)
  if [ "$AGE" -le 120 ]; then
    STATE=$(cat "$STATE_FILE" 2>/dev/null || true)
    case "$STATE" in
      thinking)  echo "${COLOR_THINKING} ◆ "; exit 0 ;;
      writing)   echo "${COLOR_WRITING} ✎ "; exit 0 ;;
      planning)  echo "${COLOR_PLANNING} ◇ "; exit 0 ;;
      waiting)   echo "${COLOR_WAITING} ● "; exit 0 ;;
      deciding)  echo "${COLOR_DECIDING} ▲ "; exit 0 ;;
    esac
  else
    rm -f "$STATE_FILE"
  fi
fi

# Fallback: check for agent tool child processes
# Walk children of the pane's shell PID looking for known agent tools
is_child_of_pane() {
  local pid="$1"
  local depth=0
  while [ "$pid" != "1" ] && [ "$pid" != "0" ] && [ "$depth" -lt 10 ]; do
    if [ "$pid" = "$PANE_PID" ]; then
      return 0
    fi
    pid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')
    if [ -z "$pid" ]; then
      return 1
    fi
    depth=$((depth + 1))
  done
  return 1
}

# Get all processes once
AI_PROCS=$(ps -axo pid,comm 2>/dev/null || true)

for tool in claude codex aider copilot; do
  # grep may find nothing — that's fine
  PIDS=$(echo "$AI_PROCS" | grep -i "$tool" | awk '{print $1}' || true)
  for pid in $PIDS; do
    if is_child_of_pane "$pid"; then
      echo "${COLOR_WAITING} ● "
      exit 0
    fi
  done
done

# No state, no detected tools - output nothing
exit 0
