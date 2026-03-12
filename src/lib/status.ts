import fs from 'node:fs';
import path from 'node:path';
import { STATE_DIR } from './utils.js';

export function run(): void {
  console.log('tmux-ai-status: pane states\n');

  if (!fs.existsSync(STATE_DIR)) {
    console.log('No active states (state directory does not exist)');
    return;
  }

  const files = fs.readdirSync(STATE_DIR).filter((f) => f.endsWith('.state'));

  if (files.length === 0) {
    console.log('No active states');
    return;
  }

  const stateColors: Record<string, string> = {
    thinking: '\x1b[38;5;33m',
    writing: '\x1b[38;5;213m',
    planning: '\x1b[38;5;44m',
    waiting: '\x1b[38;5;78m',
    deciding: '\x1b[38;5;208m',
  };
  const reset = '\x1b[0m';

  const now = Date.now();
  for (const file of files) {
    const filePath = path.join(STATE_DIR, file);
    const paneNum = file.replace('.state', '');
    const state = fs.readFileSync(filePath, 'utf8').trim();
    const stat = fs.statSync(filePath);
    const ageSec = Math.round((now - stat.mtimeMs) / 1000);
    const stale = ageSec > 120 ? ' (stale)' : '';
    const color = stateColors[state] ?? '';
    const colorEnd = color ? reset : '';

    console.log(`  Pane %${paneNum}: ${color}${state}${colorEnd} (${ageSec}s ago)${stale}`);
  }
}
