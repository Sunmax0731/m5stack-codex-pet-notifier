import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { productProfile } from '../src/core/product-profile.mjs';

const repoRoot = process.cwd();
const distDir = path.join(repoRoot, 'dist');
const stageDir = path.join(distDir, `${productProfile.repo}-windows-installer`);
const zipPath = path.join(distDir, `${productProfile.repo}-${productProfile.tag}-windows-installer.zip`);
const includeEntries = [
  'start-dashboard.bat',
  'package.json',
  'README.md',
  'AGENTS.md',
  'SKILL.md',
  'installer',
  'tools',
  'src',
  'schemas',
  'samples',
  'firmware',
  'docs/installation-guide.md',
  'docs/user-guide.md',
  'docs/manual-test.md',
  'docs/gui-tools-manual-check.md',
  'docs/security-privacy-checklist.md'
];
const skippedNames = new Set(['.git', 'node_modules', 'dist', 'tmp', '.pio']);

fs.mkdirSync(distDir, { recursive: true });
fs.rmSync(stageDir, { recursive: true, force: true });
fs.mkdirSync(stageDir, { recursive: true });

for (const entry of includeEntries) {
  const source = path.join(repoRoot, entry);
  if (!fs.existsSync(source)) {
    throw new Error(`installer entry missing: ${entry}`);
  }
  copyFiltered(source, path.join(stageDir, entry));
}

fs.writeFileSync(path.join(stageDir, 'INSTALL.txt'), [
  'M5Stack Codex Pet Notifier beta installer package',
  '',
  '1. Install Node.js 20 LTS or newer if npm is not available.',
  '2. Double-click installer\\M5StackCodexPetNotifier-Setup.bat.',
  '3. Start the dashboard from the desktop shortcut, or double-click start-dashboard.bat.',
  '4. The dashboard opens http://127.0.0.1:8080/ and starts the Host Bridge in the background.',
  ''
].join('\n'), 'utf8');

fs.rmSync(zipPath, { force: true });
const compress = cp.spawnSync('powershell.exe', [
  '-NoProfile',
  '-Command',
  `Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${zipPath}' -Force`
], { cwd: repoRoot, encoding: 'utf8' });

if (compress.status !== 0) {
  throw new Error(`Compress-Archive failed: ${compress.stderr || compress.stdout}`);
}

console.log(JSON.stringify({
  ok: true,
  zipPath,
  stageDir,
  version: productProfile.version
}, null, 2));

function copyFiltered(source, destination) {
  const stat = fs.statSync(source);
  const name = path.basename(source);
  if (skippedNames.has(name)) {
    return;
  }
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const child of fs.readdirSync(source)) {
      copyFiltered(path.join(source, child), path.join(destination, child));
    }
    return;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}
