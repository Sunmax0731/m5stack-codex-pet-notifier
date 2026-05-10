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
const bridgeSource = fs.readFileSync('src/host-bridge/server.mjs', 'utf8');

const signals = {
  simulator: fs.existsSync('src/simulator/mockDevice.mjs') && result.status === 'passed',
  mockDevice: result.scenarios.some((scenario) => scenario.profileCovered),
  sampleTelemetry: telemetry.privacy.requiresPairingToken === true,
  deviceAdapter: fs.existsSync('src/device-adapter/deviceProfiles.mjs'),
  hostAdapter: fs.existsSync('src/host-adapter/localLanBridge.mjs'),
  lanHostBridge: fs.existsSync('src/host-bridge/server.mjs') && fs.existsSync('scripts/bridge-smoke.mjs'),
  dashboardGui: fs.existsSync('src/host-bridge/dashboard/index.html') && fs.existsSync('scripts/dashboard-smoke.mjs'),
  codexRelay: fs.existsSync('src/codex-adapter/relay.mjs') && fs.existsSync('scripts/codex-relay-smoke.mjs'),
  codexSessionAutoRelay: fs.existsSync('src/codex-adapter/sessionWatcher.mjs') && fs.existsSync('scripts/codex-session-smoke.mjs'),
  codexAppServerAdapter: fs.existsSync('src/codex-adapter/appServerAdapter.mjs') && fs.existsSync('scripts/codex-app-server-adapter-smoke.mjs'),
  longRunBridge: bridgeSource.includes('maxDeviceQueueLength') && bridgeSource.includes('deviceStaleAfterMs'),
  installerSigningPrepared: fs.existsSync('tools/windows-signing-check.mjs') && fs.existsSync('installer/wix/Product.wxs') && fs.existsSync('installer/msix/Package.appxmanifest'),
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
  manualTest: 'user-confirmed-core2-dashboard-feature-polish-pass-2026-05-10',
  signals,
  scenarioIds: result.scenarios.map((scenario) => scenario.id)
};

fs.mkdirSync('docs', { recursive: true });
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('docs/platform-runtime-gate.json', `${JSON.stringify(gate, null, 2)}\n`);
fs.writeFileSync('dist/platform-runtime-gate.json', `${JSON.stringify(gate, null, 2)}\n`);
console.log(`platform runtime gate passed for ${productProfile.repo}`);
