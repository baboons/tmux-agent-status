import fs from 'node:fs';
import path from 'node:path';
import { HOME, SCRIPTS_DIR, readFileIfExists } from './utils.js';

const CODEX_DIR = path.join(HOME, '.codex');
const CONFIG_FILE = path.join(CODEX_DIR, 'config.toml');

export function run(): boolean {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.log('  Codex: ~/.codex/config.toml not found, skipping');
    return false;
  }

  const stateWriter = path.join(SCRIPTS_DIR, 'state-writer.sh');
  let content = readFileIfExists(CONFIG_FILE) || '';

  // Check if already configured
  if (content.includes('state-writer.sh')) {
    console.log('  Codex: already configured');
    return true;
  }

  // Add notify config for agent-turn-complete
  const notifyLine = `notify = ["${stateWriter}", "waiting"]`;

  // Append to file
  if (content.length > 0 && !content.endsWith('\n')) {
    content += '\n';
  }
  content += `\n# tmux-ai-status\n${notifyLine}\n`;

  fs.writeFileSync(CONFIG_FILE, content, 'utf8');
  console.log('  Codex: notify added to ~/.codex/config.toml');
  return true;
}

export function uninstall(): void {
  const content = readFileIfExists(CONFIG_FILE);
  if (!content || !content.includes('state-writer.sh')) return;

  // Remove our notify line and comment
  const lines = content.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '# tmux-ai-status') {
      // Skip this line and the next if it's our notify line
      if (i + 1 < lines.length && lines[i + 1].includes('state-writer.sh')) {
        i++; // skip the notify line too
        continue;
      }
    }
    if (lines[i].includes('state-writer.sh') && lines[i].includes('notify')) {
      continue;
    }
    out.push(lines[i]);
  }

  fs.writeFileSync(CONFIG_FILE, out.join('\n'), 'utf8');
  console.log('  Codex: notify removed from config.toml');
}
