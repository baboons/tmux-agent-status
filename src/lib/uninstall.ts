import fs from 'node:fs';
import { PLUGIN_DIR, STATE_DIR } from './utils.js';
import * as configureClaude from './configure-claude.js';
import * as configureCodex from './configure-codex.js';
import * as configureCopilot from './configure-copilot.js';
import * as configureTmux from './configure-tmux.js';

function rmrf(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }
}

export function run(): void {
  console.log('tmux-agent-status: uninstalling...\n');

  // Remove agent tool hooks
  console.log('Removing agent tool hooks...');
  configureClaude.uninstall();
  configureCodex.uninstall();
  configureCopilot.uninstall();

  // Remove tmux config
  console.log('\nRemoving tmux config...');
  configureTmux.uninstall();

  // Delete plugin directory
  console.log('\nCleaning up...');
  rmrf(PLUGIN_DIR);
  console.log(`  Removed ${PLUGIN_DIR}`);

  // Delete state files
  rmrf(STATE_DIR);
  console.log(`  Removed ${STATE_DIR}`);

  // Reload tmux
  console.log('\nReloading tmux...');
  configureTmux.reloadTmux();

  console.log('\nUninstall complete!');
}
