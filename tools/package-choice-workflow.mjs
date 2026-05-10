import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceDir = path.join(repoRoot, 'distribution', 'm5stack-choice-workflow');
const distDir = path.join(repoRoot, 'dist');
const zipPath = path.join(distDir, 'm5stack-choice-workflow-kit.zip');

if (!fs.existsSync(path.join(sourceDir, 'AGENTS.md'))) {
  throw new Error('distribution AGENTS.md is missing');
}
if (!fs.existsSync(path.join(sourceDir, 'SKILL.md'))) {
  throw new Error('distribution SKILL.md is missing');
}

fs.mkdirSync(distDir, { recursive: true });
fs.rmSync(zipPath, { force: true });

const compress = cp.spawnSync('powershell.exe', [
  '-NoProfile',
  '-Command',
  `Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${zipPath}' -Force`
], { cwd: repoRoot, encoding: 'utf8' });

if (compress.status !== 0) {
  throw new Error(`Compress-Archive failed: ${compress.stderr || compress.stdout}`);
}

console.log(JSON.stringify({
  ok: true,
  zipPath,
  sourceDir
}, null, 2));

