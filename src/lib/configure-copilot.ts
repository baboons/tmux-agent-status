import { execSync } from 'node:child_process';

function hasBinary(name: string): boolean {
  try {
    execSync(`which ${name}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function run(): boolean {
  const hasCopilot = hasBinary('copilot') || hasBinary('gh');

  if (!hasCopilot) {
    console.log('  Copilot CLI: not found, skipping');
    return false;
  }

  console.log('  Copilot CLI: detected (fallback process detection will be used)');
  console.log('    Note: Copilot hooks are project-local, manual setup needed if desired');
  return true;
}

export function uninstall(): void {
  // Nothing to clean up - copilot uses fallback detection only
}
