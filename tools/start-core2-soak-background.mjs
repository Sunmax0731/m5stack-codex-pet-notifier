import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productProfile } from '../src/core/product-profile.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimePath = path.join(repoRoot, 'tmp', 'core2-soak-runtime.json');
const forwardedArgs = process.argv.slice(2);
const child = spawn(process.execPath, ['tools/core2-soak-runner.mjs', ...forwardedArgs], {
  cwd: repoRoot,
  detached: true,
  stdio: 'ignore',
  windowsHide: true,
  env: {
    ...process.env,
    M5STACK_CORE2_SOAK_BACKGROUND: '1'
  }
});

child.unref();

fs.mkdirSync(path.dirname(runtimePath), { recursive: true });
fs.writeFileSync(runtimePath, `${JSON.stringify({
  product: productProfile.repo,
  version: productProfile.version,
  pid: child.pid,
  background: true,
  startedAt: new Date().toISOString(),
  args: sanitizeArgs(forwardedArgs),
  resultPath: 'dist/core2-soak-result.json',
  docsResultPath: 'docs/core2-soak-result.json'
}, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  ok: true,
  pid: child.pid,
  background: true,
  resultPath: 'dist/core2-soak-result.json',
  docsResultPath: 'docs/core2-soak-result.json'
}, null, 2));

function sanitizeArgs(args) {
  return args.map((arg) => (
    /token|password|secret|authorization/i.test(arg)
      ? arg.replace(/=.*/, '=[redacted]')
      : arg.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[ip-redacted]')
  ));
}
