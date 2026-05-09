import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productProfile } from '../src/core/product-profile.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimePath = path.join(repoRoot, 'tmp', 'bridge-runtime.json');

const args = parseArgs(process.argv.slice(2));
const host = String(args.host ?? process.env.HOST ?? '0.0.0.0');
const port = Number(args.port ?? process.env.PORT ?? 8080);
const currentPid = Number(args['current-pid'] ?? args.currentPid ?? 0);
const healthUrl = `http://127.0.0.1:${port}/health`;

writeRuntime({
  pid: currentPid || null,
  helperPid: process.pid,
  host,
  port,
  url: `http://${host}:${port}`,
  healthUrl,
  background: true,
  restarting: true,
  requestedAt: new Date().toISOString()
});

if (Number.isInteger(currentPid) && currentPid > 0) {
  await waitForPidExit(currentPid, 15000);
}

const existing = await readHealth(healthUrl, 1000);
if (existing?.ok) {
  writeRuntime({
    pid: existing.pid ?? null,
    helperPid: process.pid,
    host,
    port,
    url: `http://${host}:${port}`,
    healthUrl,
    background: false,
    alreadyRunning: true,
    restartSkipped: true,
    restartedFromPid: currentPid || null,
    startedAt: new Date().toISOString()
  });
  console.log(JSON.stringify({ ok: true, alreadyRunning: true, healthUrl, health: existing }, null, 2));
  process.exit(0);
}

const child = spawn(process.execPath, ['src/host-bridge/server.mjs', `--host=${host}`, `--port=${port}`], {
  cwd: repoRoot,
  detached: true,
  stdio: 'ignore',
  windowsHide: true,
  env: {
    ...process.env,
    M5STACK_BRIDGE_BACKGROUND: '1'
  }
});

child.unref();
const health = await waitForHealth(healthUrl, 8000);
writeRuntime({
  pid: child.pid,
  helperPid: process.pid,
  host,
  port,
  url: `http://${host}:${port}`,
  healthUrl,
  background: true,
  alreadyRunning: false,
  restartedFromPid: currentPid || null,
  healthOk: Boolean(health?.ok),
  startedAt: new Date().toISOString()
});

console.log(JSON.stringify({ ok: true, pid: child.pid, background: true, restartedFromPid: currentPid || null, healthUrl, health }, null, 2));

function writeRuntime(status) {
  fs.mkdirSync(path.dirname(runtimePath), { recursive: true });
  fs.writeFileSync(runtimePath, `${JSON.stringify({
    product: productProfile.repo,
    version: productProfile.version,
    ...status
  }, null, 2)}\n`, 'utf8');
}

async function waitForPidExit(pid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isPidAlive(pid)) {
      return true;
    }
    await sleep(250);
  }
  return false;
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForHealth(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const health = await readHealth(url, 750);
    if (health?.ok) {
      return health;
    }
    await sleep(250);
  }
  return null;
}

async function readHealth(url, timeoutMs) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const inline = key.indexOf('=');
    if (inline >= 0) {
      out[key.slice(0, inline)] = key.slice(inline + 1);
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    index += 1;
  }
  return out;
}
