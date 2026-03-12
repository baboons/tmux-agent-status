#!/usr/bin/env node

import { run as install } from './lib/install.js';
import { run as uninstall } from './lib/uninstall.js';
import { run as status } from './lib/status.js';

const command = process.argv[2];

switch (command) {
  case 'install':
  case 'update':
  case 'reinstall':
    install();
    break;
  case 'uninstall':
  case 'remove':
    uninstall();
    break;
  case 'status':
    status();
    break;
  default:
    console.log(`tmux-agent-status - Live agent tool status in tmux tabs

Usage:
  npx tmux-agent-status install     Install hooks and configure tmux
  npx tmux-agent-status update      Re-install scripts and refresh config
  npx tmux-agent-status uninstall   Remove all hooks and configuration
  npx tmux-agent-status status      Show current pane states`);
    process.exit(command ? 1 : 0);
}
