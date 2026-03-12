import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  SCRIPTS_DIR,
  MARKER_BEGIN,
  MARKER_END,
  findTmuxConf,
  readFileIfExists,
  removeMarkerBlock,
} from './utils.js';

function stripOurFormat(format: string): string {
  // Remove any #(...tab-status.sh...) calls we previously injected
  format = format.replace(/#\([^)]*tab-status\.sh[^)]*\)/g, '');
  // Remove trailing #[default] that we add
  format = format.replace(/#\[default\]$/, '');
  return format;
}

function getCurrentFormat(): string {
  try {
    const result = execSync('tmux show-options -gv window-status-format', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (result) return stripOurFormat(result);
  } catch {
    // tmux not running or not available
  }
  return '#I:#W#{?window_flags,#{window_flags}, }';
}

function getCurrentCurrentFormat(): string {
  try {
    const result = execSync('tmux show-options -gv window-status-current-format', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (result) return stripOurFormat(result);
  } catch {
    // tmux not running or not available
  }
  return '#I:#W#{?window_flags,#{window_flags}, }';
}

export function run(): boolean {
  const confPath = findTmuxConf();
  const tabStatus = path.join(SCRIPTS_DIR, 'tab-status.sh');

  // Get current formats from live tmux
  const wsFormat = getCurrentFormat();
  const wscFormat = getCurrentCurrentFormat();

  // Build the status prefix - #() runs a shell command
  const statusCmd = `#(${tabStatus} #{pane_pid} #{pane_id})`;

  // Build the new formats: prefix with color, suffix with #[default]
  const newWsFormat = `${statusCmd}${wsFormat}#[default]`;
  const newWscFormat = `${statusCmd}${wscFormat}#[default]`;

  // Read existing config, remove old marker block
  let content = readFileIfExists(confPath) || '';
  content = removeMarkerBlock(content);

  // Remove trailing whitespace but keep one newline
  content = content.replace(/\s+$/, '\n');

  // Append our block
  const block = [
    '',
    MARKER_BEGIN,
    `set -g window-status-format '${newWsFormat}'`,
    `set -g window-status-current-format '${newWscFormat}'`,
    `set -g status-interval 3`,
    MARKER_END,
    '',
  ].join('\n');

  content += block;

  fs.mkdirSync(path.dirname(confPath), { recursive: true });
  fs.writeFileSync(confPath, content, 'utf8');

  console.log(`  tmux: configured ${confPath}`);
  return true;
}

export function uninstall(): void {
  const confPath = findTmuxConf();
  const content = readFileIfExists(confPath);
  if (!content || !content.includes(MARKER_BEGIN)) return;

  let cleaned = removeMarkerBlock(content);
  // Clean up extra blank lines at end
  cleaned = cleaned.replace(/\n{3,}$/g, '\n');

  fs.writeFileSync(confPath, cleaned, 'utf8');
  console.log(`  tmux: removed config from ${confPath}`);
}

export function reloadTmux(): void {
  const confPath = findTmuxConf();
  try {
    execSync(`tmux source-file "${confPath}"`, { stdio: 'ignore' });
    console.log('  tmux: config reloaded');
  } catch {
    console.log('  tmux: could not reload config (not in a tmux session?)');
  }
}
