import fs from 'node:fs';
import path from 'node:path';
import { HOME, SCRIPTS_DIR, readFileIfExists } from './utils.js';

const CLAUDE_DIR = path.join(HOME, '.claude');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json');

interface HookCommand {
  type: string;
  command: string;
}

interface HookEntry {
  matcher?: string;
  command?: string;
  hooks?: HookCommand[];
}

interface HookDef {
  event: string;
  matcher: string | undefined;
  command: string;
}

interface ClaudeSettings {
  hooks?: Record<string, HookEntry[]>;
  [key: string]: unknown;
}

export function run(): boolean {
  if (!fs.existsSync(CLAUDE_DIR)) {
    console.log('  Claude Code: ~/.claude/ not found, skipping');
    return false;
  }

  const stateWriter = path.join(SCRIPTS_DIR, 'state-writer.sh');
  let settings: ClaudeSettings = {};
  const existing = readFileIfExists(SETTINGS_FILE);
  if (existing) {
    try {
      settings = JSON.parse(existing) as ClaudeSettings;
    } catch {
      console.log('  Claude Code: could not parse settings.json, skipping');
      return false;
    }
  }

  if (!settings.hooks) settings.hooks = {};

  const hookDefs: HookDef[] = [
    {
      event: 'UserPromptSubmit',
      matcher: undefined,
      command: `${stateWriter} thinking`,
    },
    {
      event: 'PreToolUse',
      matcher: undefined,
      command: `${stateWriter} thinking`,
    },
    {
      event: 'Notification',
      matcher: 'permission_prompt',
      command: `${stateWriter} deciding`,
    },
    {
      event: 'Notification',
      matcher: 'elicitation_dialog',
      command: `${stateWriter} deciding`,
    },
    {
      event: 'PermissionRequest',
      matcher: undefined,
      command: `${stateWriter} deciding`,
    },
    {
      event: 'Stop',
      matcher: undefined,
      command: `${stateWriter} waiting`,
    },
  ];

  for (const def of hookDefs) {
    if (!settings.hooks[def.event]) settings.hooks[def.event] = [];

    const entries = settings.hooks[def.event];

    // Remove old-format entries (command at top level, no hooks array)
    settings.hooks[def.event] = entries.filter(
      (e) => !(e.command && !e.hooks && e.command.includes('state-writer.sh'))
    );

    // Check if we already have this hook in new format (nested hooks array)
    // Match on both state-writer.sh presence AND matcher to distinguish
    // multiple hooks on the same event (e.g. Notification with different matchers)
    const defMatcher = def.matcher || '';
    const existingEntry = settings.hooks[def.event].find(
      (e) =>
        e.hooks &&
        e.hooks.some((h) => h.command && h.command.includes('state-writer.sh')) &&
        (e.matcher || '') === defMatcher
    );

    if (existingEntry) {
      // Update command in-place (handles path changes on reinstall)
      const hook = existingEntry.hooks!.find(
        (h) => h.command && h.command.includes('state-writer.sh')
      );
      if (hook) hook.command = def.command;
      existingEntry.matcher = def.matcher || '';
    } else {
      settings.hooks[def.event].push({
        matcher: def.matcher || '',
        hooks: [{ type: 'command', command: def.command }],
      });
    }
  }

  fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n', 'utf8');

  console.log('  Claude Code: hooks added to ~/.claude/settings.json');
  return true;
}

export function uninstall(): void {
  const existing = readFileIfExists(SETTINGS_FILE);
  if (!existing) return;

  let settings: ClaudeSettings;
  try {
    settings = JSON.parse(existing) as ClaudeSettings;
  } catch {
    return;
  }

  if (!settings.hooks) return;

  let changed = false;
  for (const event of Object.keys(settings.hooks)) {
    const before = settings.hooks[event].length;
    settings.hooks[event] = settings.hooks[event].filter(
      (entry) =>
        // Remove old-format entries (command at top level)
        !(entry.command && !entry.hooks && entry.command.includes('state-writer.sh')) &&
        // Remove new-format entries (nested hooks array)
        !(
          entry.hooks &&
          entry.hooks.some((h) => h.command && h.command.includes('state-writer.sh'))
        )
    );
    if (settings.hooks[event].length === 0) {
      delete settings.hooks[event];
    }
    if (settings.hooks[event]?.length !== before) changed = true;
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  if (changed) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    console.log('  Claude Code: hooks removed from settings.json');
  }
}
