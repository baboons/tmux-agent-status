import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { PLUGIN_DIR, SCRIPTS_DIR } from './utils.js';
import * as configureClaude from './configure-claude.js';
import * as configureCodex from './configure-codex.js';
import * as configureCopilot from './configure-copilot.js';
import * as configureTmux from './configure-tmux.js';

// __dirname is dist/lib/ at runtime, so go up two levels to reach project root
const PROJECT_ROOT = path.join(__dirname, '..', '..');

export function run(): void {
  console.log('tmux-agent-status: installing...\n');

  // Check prerequisites
  try {
    execSync('which tmux', { stdio: 'ignore' });
  } catch {
    console.error('Error: tmux is not installed or not in PATH');
    process.exit(1);
  }

  // Copy scripts to plugin directory
  console.log('Copying scripts...');
  fs.mkdirSync(SCRIPTS_DIR, { recursive: true });

  const srcScripts = path.join(PROJECT_ROOT, 'scripts');
  for (const file of fs.readdirSync(srcScripts)) {
    const src = path.join(srcScripts, file);
    const dst = path.join(SCRIPTS_DIR, file);
    fs.copyFileSync(src, dst);
    fs.chmodSync(dst, 0o755);
  }
  console.log(`  Scripts installed to ${SCRIPTS_DIR}`);

  // Write version file
  const pkgPath = path.join(PROJECT_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version: string };
  fs.writeFileSync(path.join(PLUGIN_DIR, '.version'), pkg.version + '\n', 'utf8');

  // Configure each tool
  console.log('\nConfiguring agent tools...');
  configureClaude.run();
  configureCodex.run();
  configureCopilot.run();

  // Configure tmux
  console.log('\nConfiguring tmux...');
  configureTmux.run();

  // Reload tmux
  console.log('\nReloading tmux...');
  configureTmux.reloadTmux();

  // Summary
  console.log('\nInstallation complete!');
  console.log('\nColors:');
  console.log('  \x1b[38;5;33m● Blue\x1b[0m     = Agent is thinking (reading, searching)');
  console.log('  \x1b[38;5;213m● Magenta\x1b[0m  = Agent is writing code (Edit, Write, Bash)');
  console.log('  \x1b[38;5;44m● Cyan\x1b[0m     = Agent is in plan mode');
  console.log('  \x1b[38;5;78m● Green\x1b[0m    = Agent is waiting for input');
  console.log('  \x1b[38;5;208m● Orange\x1b[0m   = Agent needs a decision (permission prompt)');
  console.log('\nNote: Aider uses fallback process detection (no hook integration).');
  console.log('      Copilot CLI hooks are project-local and need manual setup.');
}
