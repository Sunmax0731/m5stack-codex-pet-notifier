import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { productProfile } from '../src/core/product-profile.mjs';
import { runSuite } from '../src/core/scenario-runner.mjs';
import { buildReport } from '../src/report/buildReport.mjs';
import { enforceManualTestCap } from '../src/review-model/qcdsModel.mjs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listTextFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist', 'build', '.pio'].includes(entry.name)) {
      continue;
    }
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      listTextFiles(filePath, output);
    } else if (/\.(md|json|js|mjs|html|css|cpp|h|ini)$/i.test(entry.name)) {
      output.push(filePath);
    }
  }
  return output;
}

for (const required of productProfile.requiredDocs) {
  assert(fs.existsSync(required), `required file missing: ${required}`);
}
for (const required of [
  'package.json',
  'schemas/events/pet.updated.json',
  'src/host-adapter/localLanBridge.mjs',
  'src/host-bridge/server.mjs',
  'src/codex-adapter/relay.mjs',
  'src/codex-adapter/eventFactory.mjs',
  'src/device-adapter/deviceProfiles.mjs',
  'src/simulator/mockDevice.mjs',
  'scripts/bridge-smoke.mjs',
  'scripts/codex-relay-smoke.mjs',
  'firmware/src/main.cpp',
  'firmware/platformio.ini',
  'samples/representative-suite.json',
  'samples/sample-telemetry.json'
]) {
  assert(fs.existsSync(required), `implementation file missing: ${required}`);
}

const firmwareSource = fs.readFileSync('firmware/src/main.cpp', 'utf8');
assert(firmwareSource.includes('fonts::efontJA_12'), 'firmware must set a Japanese-capable M5GFX font');
assert(firmwareSource.includes('utf8SliceByCodepoints'), 'firmware must page text on UTF-8 codepoint boundaries');
assert(!firmwareSource.includes('pageText(body, answerPage).substring'), 'firmware answer rendering must not split UTF-8 text by byte substring');

const relaySource = fs.readFileSync('src/codex-adapter/relay.mjs', 'utf8');
assert(relaySource.includes('ToBase64String'), 'clipboard relay must avoid direct non-UTF8 PowerShell stdout text');
assert(relaySource.includes("Buffer.from(result.stdout.trim(), 'base64').toString('utf8')"), 'clipboard relay must restore UTF-8 from Base64');

const mojibakeCodePoints = [0x7e67, 0x90e2, 0x9aeb, 0xfffd];
for (const filePath of listTextFiles(process.cwd())) {
  const text = fs.readFileSync(filePath, 'utf8');
  for (const codePoint of mojibakeCodePoints) {
    assert(!text.includes(String.fromCodePoint(codePoint)), `mojibake code point ${codePoint} in ${filePath}`);
  }
}

const suite = readJson('samples/representative-suite.json');
const result = runSuite(suite, { repoRoot: process.cwd() });
for (const scenario of suite.scenarios) {
  const actual = result.scenarios.find((entry) => entry.id === scenario.id);
  assert(actual, `scenario not run: ${scenario.id}`);
  for (const [key, expectedValue] of Object.entries(scenario.expected)) {
    assert(actual[key] === expectedValue, `${scenario.id}.${key} expected ${expectedValue} got ${actual[key]}`);
  }
}
assert(result.status === 'passed', 'representative suite failed');

const metrics = readJson('docs/qcds-strict-metrics.json');
enforceManualTestCap(metrics);
assert(metrics.allAtLeastAMinus === true, 'QCDS allAtLeastAMinus must be true');
assert(readJson('docs/source-idea-pack.json').metadataMatchesRepository === true, 'source pack metadata mismatch');

const regressionBaseline = {
  product: productProfile.repo,
  version: productProfile.version,
  suiteStatus: result.status,
  scenarios: result.scenarios.map((scenario) => ({
    id: scenario.id,
    status: scenario.status,
    validEvents: scenario.validEvents,
    invalidEvents: scenario.invalidEvents,
    warningCount: scenario.warningCount,
    replyCount: scenario.replyCount,
    interactionCount: scenario.interactionCount,
    heartbeatCount: scenario.heartbeatCount
  }))
};
fs.writeFileSync('docs/qcds-regression-baseline.json', `${JSON.stringify(regressionBaseline, null, 2)}\n`);

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/validation-result.json', `${JSON.stringify({
  product: productProfile.repo,
  version: productProfile.version,
  status: 'passed',
  manualTestStatus: metrics.manualTestStatus,
  report: buildReport(productProfile, result),
  scenarios: result.scenarios.map((scenario) => ({
    id: scenario.id,
    status: scenario.status,
    profile: scenario.profile,
    validEvents: scenario.validEvents,
    invalidEvents: scenario.invalidEvents,
    warningCount: scenario.warningCount,
    replyCount: scenario.replyCount,
    interactionCount: scenario.interactionCount,
    heartbeatCount: scenario.heartbeatCount,
    securityBoundary: scenario.securityBoundary,
    finalScreen: scenario.finalScreen
  }))
}, null, 2)}\n`);

const zipPath = path.join('dist', `${productProfile.repo}-docs.zip`);
if (fs.existsSync(zipPath)) {
  fs.rmSync(zipPath);
}
const archiveCommand = [
  "Compress-Archive -Path",
  "'README.md','AGENTS.md','SKILL.md','docs','samples','schemas'",
  `-DestinationPath '${zipPath.replaceAll('/', '\\')}' -Force`
].join(' ');
const zip = cp.spawnSync('powershell', ['-NoProfile', '-Command', archiveCommand], { encoding: 'utf8' });
assert(zip.status === 0, `docs zip failed: ${zip.stderr}`);

console.log(`validated ${productProfile.repo}`);
