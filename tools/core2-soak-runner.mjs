import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { productProfile } from '../src/core/product-profile.mjs';

const repoRoot = process.cwd();
const args = parseArgs(process.argv.slice(2));
const bridgeUrl = String(args.bridge ?? process.env.M5STACK_BRIDGE_URL ?? 'http://127.0.0.1:8080').replace(/\/+$/, '');
const durationMs = durationFromArgs(args);
const intervalMs = Math.max(5_000, numberArg(args, 'interval-sec', 30) * 1000);
const replayIntervalMs = Math.max(0, numberArg(args, 'replay-interval-min', 5) * 60_000);
const pairingTimeoutMs = Math.max(5_000, numberArg(args, 'pairing-timeout-min', 10) * 60_000);
const maxHeartbeatAgeSec = numberArg(args, 'max-heartbeat-age-sec', 45);
const maxDroppedEvents = numberArg(args, 'max-dropped-events', 0);
const requireDevice = args['allow-no-device'] !== true;
const skipWifiInterruption = args['skip-wifi-interruption'] === true || args['wifi-interruption'] === 'skip';
const resultPath = path.join(repoRoot, 'dist', 'core2-soak-result.json');
const docsResultPath = path.join(repoRoot, 'docs', 'core2-soak-result.json');

let interrupted = false;
process.on('SIGINT', () => {
  interrupted = true;
});
process.on('SIGTERM', () => {
  interrupted = true;
});

const result = {
  product: productProfile.repo,
  version: productProfile.version,
  generatedAt: new Date().toISOString(),
  status: 'running',
  scope: {
    releaseTarget: 'Core2',
    grayHardware: 'out-of-scope',
    grayImu: 'out-of-scope',
    multipleM5Stack: 'future-update',
    wifiInterruption: skipWifiInterruption ? 'excluded-by-request' : 'not-exercised-by-this-run'
  },
  config: {
    bridge: labelBridge(bridgeUrl),
    durationMs,
    intervalMs,
    replayIntervalMs,
    pairingTimeoutMs,
    maxHeartbeatAgeSec,
    maxDroppedEvents,
    requireDevice
  },
  startedAt: new Date().toISOString(),
  endedAt: null,
  checks: {
    bridgeReachable: false,
    pairedDeviceObserved: false,
    heartbeatObserved: false,
    latestHeartbeatFresh: false,
    noStaleDeviceAtEnd: false,
    droppedEventsWithinLimit: false,
    wifiInterruptionSkipped: skipWifiInterruption
  },
  counters: {
    snapshots: 0,
    replayAttempts: 0,
    replayFailures: 0,
    bridgeFailures: 0,
    observedDeviceCount: 0,
    observedHeartbeatCount: 0,
    maxHeartbeatAgeSec: null,
    maxDroppedEvents: 0,
    staleSampleCount: 0
  },
  devices: [],
  samples: [],
  replayResults: [],
  errors: [],
  nextActions: []
};

try {
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  await ensureBridge();
  await waitForPairedDevice();
  await runSoak();
  finalize();
} catch (error) {
  result.status = 'blocked';
  result.errors.push(redact(error.message));
  result.nextActions.push('Bridge / Core2 接続状態を確認し、同じ core2:soak command を再実行する。');
} finally {
  result.endedAt = new Date().toISOString();
  writeResult();
  console.log(JSON.stringify(result, null, 2));
  if (args.strict === true && result.status !== 'passed') {
    process.exit(1);
  }
}

async function ensureBridge() {
  const initial = await getJson('/health', { timeoutMs: 1500, quiet: true });
  if (initial?.ok) {
    result.checks.bridgeReachable = true;
    return;
  }

  const start = runNpm(['run', 'bridge:start:bg', '--', '--host=0.0.0.0', '--port=8080'], { timeout: 20_000 });
  result.bridgeStart = {
    status: start.status === 0 ? 'passed' : 'failed',
    exitCode: start.status,
    durationMs: start.durationMs,
    stderr: redact(start.stderr).slice(0, 1000),
    error: start.error ? redact(start.error) : null
  };

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const health = await getJson('/health', { timeoutMs: 1500, quiet: true });
    if (health?.ok) {
      result.checks.bridgeReachable = true;
      return;
    }
    await sleep(500);
  }
  throw new Error('Host Bridge did not answer /health.');
}

async function waitForPairedDevice() {
  const deadline = Date.now() + pairingTimeoutMs;
  while (Date.now() < deadline && !interrupted) {
    const sample = await collectSample();
    if (sample.pairedDevices.length > 0) {
      result.checks.pairedDeviceObserved = true;
      return;
    }
    writeResult();
    await sleep(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
  }
  if (requireDevice) {
    throw new Error('No paired Core2 device was observed before pairing timeout.');
  }
}

async function runSoak() {
  const deadline = Date.now() + durationMs;
  let nextReplayAt = Date.now();

  while (Date.now() < deadline && !interrupted) {
    if (replayIntervalMs > 0 && Date.now() >= nextReplayAt) {
      await replaySamples();
      nextReplayAt = Date.now() + replayIntervalMs;
    }
    await collectSample();
    writeResult();
    await sleep(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
  }
}

async function collectSample() {
  try {
    const snapshot = await getJson('/debug/snapshot', { timeoutMs: 5000 });
    const health = snapshot?.health ?? {};
    const pairedDevices = Array.isArray(health.pairedDevices)
      ? health.pairedDevices.map(summarizeDevice)
      : [];
    const sample = {
      elapsedMs: Date.now() - Date.parse(result.startedAt),
      ok: Boolean(snapshot?.ok),
      pairedDevices,
      outboundEvents: Number(health.outboundEvents ?? 0),
      inboundEvents: Number(health.inboundEvents ?? 0),
      securityRejections: Number(health.securityRejections ?? 0)
    };
    result.samples.push(sample);
    trimArray(result.samples, 720);
    updateCounters(sample);
    return sample;
  } catch (error) {
    result.counters.bridgeFailures += 1;
    const sample = {
      elapsedMs: Date.now() - Date.parse(result.startedAt),
      ok: false,
      error: redact(error.message),
      pairedDevices: []
    };
    result.samples.push(sample);
    trimArray(result.samples, 720);
    return sample;
  }
}

async function replaySamples() {
  result.counters.replayAttempts += 1;
  try {
    const replay = await postJson('/codex/replay-samples', {});
    const summary = {
      elapsedMs: Date.now() - Date.parse(result.startedAt),
      ok: Boolean(replay?.ok),
      resultCount: Array.isArray(replay?.results) ? replay.results.length : 0,
      failures: Array.isArray(replay?.results)
        ? replay.results.filter((entry) => !entry.result?.ok).map((entry) => ({
            sampleName: entry.sampleName,
            reason: entry.result?.reason ?? 'failed'
          }))
        : []
    };
    if (!summary.ok) {
      result.counters.replayFailures += 1;
    }
    result.replayResults.push(summary);
    trimArray(result.replayResults, 100);
  } catch (error) {
    result.counters.replayFailures += 1;
    result.replayResults.push({
      elapsedMs: Date.now() - Date.parse(result.startedAt),
      ok: false,
      error: redact(error.message)
    });
    trimArray(result.replayResults, 100);
  }
}

function updateCounters(sample) {
  result.counters.snapshots += 1;
  result.checks.bridgeReachable = result.checks.bridgeReachable || sample.ok;
  result.counters.observedDeviceCount = Math.max(result.counters.observedDeviceCount, sample.pairedDevices.length);
  result.devices = latestDevices(sample.pairedDevices);
  if (sample.pairedDevices.length) {
    result.checks.pairedDeviceObserved = true;
  }
  for (const device of sample.pairedDevices) {
    if (device.lastHeartbeatSec !== null) {
      result.checks.heartbeatObserved = true;
      result.counters.observedHeartbeatCount += 1;
      result.counters.maxHeartbeatAgeSec = Math.max(result.counters.maxHeartbeatAgeSec ?? 0, device.lastHeartbeatSec);
    }
    result.counters.maxDroppedEvents = Math.max(result.counters.maxDroppedEvents, device.droppedEvents ?? 0);
    if (device.stale) {
      result.counters.staleSampleCount += 1;
    }
  }
}

function finalize() {
  const latestDevices = result.devices;
  const hasDevice = latestDevices.length > 0;
  const heartbeatFresh = latestDevices.some((device) => (
    device.lastHeartbeatSec !== null && device.lastHeartbeatSec <= maxHeartbeatAgeSec
  ));
  const noStale = hasDevice && latestDevices.every((device) => !device.stale);
  const droppedOk = latestDevices.every((device) => (device.droppedEvents ?? 0) <= maxDroppedEvents);

  result.checks.latestHeartbeatFresh = heartbeatFresh;
  result.checks.noStaleDeviceAtEnd = noStale;
  result.checks.droppedEventsWithinLimit = droppedOk;

  if (interrupted) {
    result.status = 'partial';
    result.nextActions.push('soak runner が中断されたため、完走時間で再実行する。');
    return;
  }
  if (!result.checks.bridgeReachable) {
    result.status = 'blocked';
    result.nextActions.push('Host Bridge を起動してから再実行する。');
    return;
  }
  if (requireDevice && !result.checks.pairedDeviceObserved) {
    result.status = 'blocked';
    result.nextActions.push('Core2 が同一 LAN の Host Bridge に pairing できているか確認する。');
    return;
  }
  if (!result.checks.heartbeatObserved) {
    result.status = 'partial';
    result.nextActions.push('Core2 heartbeat が観測できていないため、firmware の接続先 host と pairing 状態を確認する。');
    return;
  }
  if (!heartbeatFresh || !noStale || !droppedOk || result.counters.bridgeFailures > 0) {
    result.status = 'partial';
    result.nextActions.push('heartbeat freshness、stale flag、droppedEvents、bridgeFailures の原因を確認する。');
    return;
  }
  result.status = 'passed';
}

function latestDevices(devices) {
  const byId = new Map(result.devices.map((device) => [device.deviceId, device]));
  for (const device of devices) {
    byId.set(device.deviceId, device);
  }
  return [...byId.values()].sort((a, b) => a.deviceId.localeCompare(b.deviceId));
}

function summarizeDevice(device) {
  return {
    deviceId: String(device.deviceId ?? ''),
    pending: Number(device.pending ?? 0),
    websocket: Boolean(device.websocket),
    stale: Boolean(device.stale),
    lastSeenSec: nullableNumber(device.lastSeenSec),
    lastPollSec: nullableNumber(device.lastPollSec),
    lastHeartbeatSec: nullableNumber(device.lastHeartbeatSec),
    droppedEvents: Number(device.droppedEvents ?? 0),
    lastHeartbeat: summarizeHeartbeat(device.lastHeartbeat)
  };
}

function summarizeHeartbeat(heartbeat) {
  if (!heartbeat || typeof heartbeat !== 'object') {
    return null;
  }
  return {
    battery: nullableNumber(heartbeat.battery),
    wifiRssi: nullableNumber(heartbeat.wifiRssi),
    screen: heartbeat.screen ?? null,
    lastError: heartbeat.lastError ?? null,
    errorRecoverable: heartbeat.errorRecoverable ?? null,
    display: summarizeDisplay(heartbeat.display),
    pet: summarizePet(heartbeat.pet)
  };
}

function summarizeDisplay(display) {
  if (!display || typeof display !== 'object') {
    return null;
  }
  return {
    petScale: nullableNumber(display.petScale),
    uiTextScale: nullableNumber(display.uiTextScale),
    bodyTextScale: nullableNumber(display.bodyTextScale),
    animationFps: nullableNumber(display.animationFps),
    motionStepMs: nullableNumber(display.motionStepMs),
    applyCount: nullableNumber(display.applyCount),
    lastEventId: display.lastEventId ?? null,
    visualProbe: display.visualProbe ?? null,
    beepOnAnswer: display.beepOnAnswer ?? null
  };
}

function summarizePet(pet) {
  if (!pet || typeof pet !== 'object') {
    return null;
  }
  return {
    mood: pet.mood ?? null,
    lastInteraction: pet.lastInteraction ?? null,
    interactionCount: nullableNumber(pet.interactionCount)
  };
}

async function getJson(pathname, options = {}) {
  const response = await fetchJson(`${bridgeUrl}${pathname}`, {
    method: 'GET',
    timeoutMs: options.timeoutMs ?? 5000,
    quiet: options.quiet
  });
  return response;
}

async function postJson(pathname, body) {
  return fetchJson(`${bridgeUrl}${pathname}`, {
    method: 'POST',
    timeoutMs: 5000,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);
  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: options.headers,
      body: options.body,
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } catch (error) {
    if (options.quiet) {
      return null;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function runNpm(npmArgs, options = {}) {
  if (process.platform === 'win32') {
    return run('cmd.exe', ['/d', '/s', '/c', ['npm', ...npmArgs].join(' ')], options);
  }
  return run('npm', npmArgs, options);
}

function run(command, runArgs, options = {}) {
  const started = Date.now();
  const output = cp.spawnSync(command, runArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
    timeout: options.timeout ?? 60_000
  });
  return {
    status: output.status,
    signal: output.signal,
    stdout: output.stdout ?? '',
    stderr: output.stderr ?? '',
    error: output.error?.message ?? null,
    durationMs: Date.now() - started
  };
}

function writeResult() {
  const payload = `${JSON.stringify(result, null, 2)}\n`;
  fs.writeFileSync(resultPath, payload, 'utf8');
  fs.writeFileSync(docsResultPath, payload, 'utf8');
}

function durationFromArgs(parsed) {
  if (parsed['duration-ms']) {
    return Math.max(1_000, Number(parsed['duration-ms']));
  }
  if (parsed['duration-sec']) {
    return Math.max(1_000, Number(parsed['duration-sec']) * 1000);
  }
  if (parsed['duration-min']) {
    return Math.max(1_000, Number(parsed['duration-min']) * 60_000);
  }
  if (parsed['duration-hours']) {
    return Math.max(1_000, Number(parsed['duration-hours']) * 60 * 60_000);
  }
  return 30 * 60_000;
}

function numberArg(parsed, key, fallback) {
  const value = Number(parsed[key] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
      out[key.slice(0, inline)] = coerceArg(key.slice(inline + 1));
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
      continue;
    }
    out[key] = coerceArg(next);
    index += 1;
  }
  return out;
}

function coerceArg(value) {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return value;
}

function labelBridge(value) {
  try {
    const url = new URL(value);
    if (['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
      return 'loopback';
    }
    return 'configured-bridge';
  } catch {
    return 'configured-bridge';
  }
}

function redact(value) {
  return String(value ?? '')
    .replace(/(token|password|secret|authorization)(=|:)\S+/gi, '$1$2[redacted]')
    .replace(/[A-Fa-f0-9]{32,}/g, '[hex-redacted]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[ip-redacted]');
}

function trimArray(array, maxLength) {
  while (array.length > maxLength) {
    array.shift();
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
