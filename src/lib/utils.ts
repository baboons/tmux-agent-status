import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const HOME: string = os.homedir();
export const PLUGIN_DIR: string = path.join(HOME, '.tmux', 'plugins', 'tmux-ai-status');
export const SCRIPTS_DIR: string = path.join(PLUGIN_DIR, 'scripts');
export const STATE_DIR: string = path.join(process.env.TMPDIR || '/tmp', 'tmux-ai-status');

export const MARKER_BEGIN = '# >>> tmux-ai-status BEGIN >>>';
export const MARKER_END = '# <<< tmux-ai-status END <<<';

export function findTmuxConf(): string {
  const candidates = [
    path.join(HOME, '.tmux.conf'),
    path.join(process.env.XDG_CONFIG_HOME || path.join(HOME, '.config'), 'tmux', 'tmux.conf'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  // Default to ~/.tmux.conf if none exist
  return candidates[0];
}

export function readFileIfExists(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

export function writeFileAtomic(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = filePath + '.' + process.pid;
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

export function removeMarkerBlock(content: string): string {
  const lines = content.split('\n');
  const out: string[] = [];
  let inBlock = false;
  for (const line of lines) {
    if (line.trim() === MARKER_BEGIN) {
      inBlock = true;
      continue;
    }
    if (line.trim() === MARKER_END) {
      inBlock = false;
      continue;
    }
    if (!inBlock) out.push(line);
  }
  return out.join('\n');
}
