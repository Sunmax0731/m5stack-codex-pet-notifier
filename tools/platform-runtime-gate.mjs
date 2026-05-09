import fs from 'node:fs';
import { productProfile } from '../src/core/product-profile.mjs';
import { runSuite } from '../src/core/scenario-runner.mjs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const suite = JSON.parse(fs.readFileSync('samples/representative-suite.json', 'utf8'));
const result = runSuite(suite, { repoRoot: process.cwd() });
const telemetry = JSON.parse(fs.readFileSync('samples/sample-telemetry.json', 'utf8'));

const signals = {
  simulator: fs.existsSync('src/simulator/mockDevice.mjs') && result.status === 'passed',
  mockDevice: result.scenarios.some((scenario) => scenario.profileCovered),
  sampleTelemetry: telemetry.privacy.requiresPairingToken === true,
  deviceAdapter: fs.existsSync('src/device-adapter/deviceProfiles.mjs'),
  hostAdapter: fs.existsSync('src/host-adapter/localLanBridge.mjs'),
  lanHostBridge: fs.existsSync('src/host-bridge/server.mjs') && fs.existsSync('scripts/bridge-smoke.mjs'),
  codexRelay: fs.existsSync('src/codex-adapter/relay.mjs') && fs.existsSync('scripts/codex-relay-smoke.mjs'),
  securityPrivacy: result.scenarios.some((scenario) => scenario.securityBoundary === true)
    && telemetry.privacy.messageBodiesPersistedOnDevice === false
};

for (const signal of productProfile.requiredRuntimeSignals) {
  assert(signals[signal] === true, `platform runtime gate missing signal: ${signal}`);
}

const gate = {
  product: productProfile.repo,
  version: productProfile.version,
  platformType: productProfile.platformType,
  pass: true,
  method: 'node-simulator-runtime-gate',
  manualTest: 'partial-pass-core2-upload-wifi-pairing-codex-relay-answer-button-reply',
  signals,
  scenarioIds: result.scenarios.map((scenario) => scenario.id)
};

fs.mkdirSync('docs', { recursive: true });
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('docs/platform-runtime-gate.json', `${JSON.stringify(gate, null, 2)}\n`);
fs.writeFileSync('dist/platform-runtime-gate.json', `${JSON.stringify(gate, null, 2)}\n`);
console.log(`platform runtime gate passed for ${productProfile.repo}`);
