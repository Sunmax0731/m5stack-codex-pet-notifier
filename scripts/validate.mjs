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
  'schemas/events/display.settings_updated.json',
  'src/host-adapter/localLanBridge.mjs',
  'src/host-bridge/server.mjs',
  'src/codex-adapter/relay.mjs',
  'src/codex-adapter/sessionWatcher.mjs',
  'src/codex-adapter/hookRelay.mjs',
  'src/codex-adapter/eventFactory.mjs',
  'src/device-adapter/deviceProfiles.mjs',
  'src/simulator/mockDevice.mjs',
  'scripts/bridge-smoke.mjs',
  'scripts/codex-relay-smoke.mjs',
  'scripts/codex-session-smoke.mjs',
  'scripts/dashboard-smoke.mjs',
  'tools/upload-firmware.ps1',
  'tools/start-bridge-background.mjs',
  'tools/generate-pet-firmware-asset.py',
  'src/host-bridge/dashboard/index.html',
  'src/host-bridge/dashboard/app.js',
  'src/host-bridge/dashboard/styles.css',
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
assert(firmwareSource.includes('PET_ANIMATION_INTERVAL_MS'), 'firmware must animate the pet avatar on-device');
assert(firmwareSource.includes('DEFAULT_PET_ANIMATION_FPS = 12'), 'firmware must default to a smoother 12 fps pet animation');
assert(firmwareSource.includes('DEFAULT_PET_MOTION_STEP_MS = 280'), 'firmware must separate pet pose switching from render FPS');
assert(firmwareSource.includes('petAnimationFps'), 'firmware must store runtime-configurable pet animation fps');
assert(firmwareSource.includes('display["animationFps"]'), 'firmware must accept animation fps in display settings');
assert(firmwareSource.includes('display["motionStepMs"]'), 'firmware must accept pet motion step timing in display settings');
assert(firmwareSource.includes('display["petBackgroundRgba"]'), 'firmware must accept pet background RGBA in display settings');
assert(firmwareSource.includes('display["textColorRgba"]'), 'firmware must accept text color RGBA in display settings');
assert(firmwareSource.includes('display["textBackgroundRgba"]'), 'firmware must accept text background RGBA in display settings');
assert(firmwareSource.includes('display["beepOnAnswer"]'), 'firmware must accept answer beep setting in display settings');
assert(firmwareSource.includes('M5.Speaker.tone'), 'firmware must beep when configured answer events arrive');
assert(firmwareSource.includes('drawPetAvatar'), 'firmware must draw a pet avatar on the M5Stack display');
assert(firmwareSource.includes('M5Canvas petSprite'), 'firmware must use an off-screen sprite for pet rendering');
assert(firmwareSource.includes('drawPetSurfaceSprite'), 'firmware must push the pet surface as a sprite');
assert(firmwareSource.includes('drawPetSurfaceIfNeeded'), 'firmware must redraw only the pet surface during animation ticks');
assert(firmwareSource.includes('markPetDraw()'), 'firmware must separate pet animation redraw from full-screen redraw');
assert(firmwareSource.includes('petSprite.pushSprite(0, 0)'), 'firmware must transfer the completed pet sprite to the display');
assert(!firmwareSource.includes('M5.Display.drawFastHLine(x + runStart'), 'scale-specific pet asset drawing must target the sprite canvas instead of drawing directly to the display');
assert(firmwareSource.includes('DISPLAY_SCALE_MAX = 8'), 'firmware must support 8-step display scaling');
assert(!firmwareSource.includes('String("state: ")'), 'firmware must not draw fixed state header text');
assert(firmwareSource.includes('display.settings_updated'), 'firmware must accept dynamic display settings from the Host Bridge');
assert(firmwareSource.includes('applyDisplaySettings(event["display"])'), 'firmware must accept display settings on direct and fallback events');
assert(firmwareSource.includes('parseRgbaString'), 'firmware must accept string RGBA settings as well as object RGBA settings');
assert(!firmwareSource.includes('target.fillRoundRect(x, y, petBoxWidth(), petBoxHeight(), 10 * s, petAccentColor())'), 'local hatch-pet transparent pixels must reveal the configured pet background instead of a fixed accent card');
assert(firmwareSource.includes('drawLocalPetAsset(int x, int y, int scale)'), 'firmware must scale local hatch-pet assets');
assert(firmwareSource.includes('drawScaleSpecificLocalPetAsset'), 'firmware must draw scale-specific local hatch-pet assets');
assert(firmwareSource.includes('PET_ASSET_SCALED_PIXELS'), 'firmware must select high-resolution scale-specific pet frames when available');
assert(firmwareSource.includes('pet_asset.local.h'), 'firmware must support an ignored local hatch-pet asset header');
assert(firmwareSource.includes('HAS_LOCAL_PET_ASSET'), 'firmware must gate local hatch-pet assets behind a compile-time flag');

const gitignoreSource = fs.readFileSync('.gitignore', 'utf8');
assert(gitignoreSource.includes('firmware/include/pet_asset.local.h'), 'local pet asset header must be ignored');

const petAssetGeneratorSource = fs.readFileSync('tools/generate-pet-firmware-asset.py', 'utf8');
assert(petAssetGeneratorSource.includes('PET_ASSET_SCALED_PIXELS'), 'pet asset generator must emit scale-specific frames');
assert(petAssetGeneratorSource.includes('Image.Resampling.LANCZOS'), 'pet asset generator must resample scale-specific frames from source cells');
assert(petAssetGeneratorSource.includes('detect_frame_count'), 'pet asset generator must auto-detect non-empty animation frames');

const uploadFirmwareSource = fs.readFileSync('tools/upload-firmware.ps1', 'utf8');
assert(uploadFirmwareSource.includes('Get-CimInstance Win32_SerialPort'), 'firmware upload helper must inspect serial ports');
assert(uploadFirmwareSource.includes('VID_10C4'), 'firmware upload helper must prefer CP210x USB serial devices');
assert(uploadFirmwareSource.includes("PNPDeviceID -match '^USB\\\\'"), 'firmware upload helper must not fall back to non-USB serial ports');
assert(uploadFirmwareSource.includes('run -d $firmwareRoot'), 'firmware upload helper must run PlatformIO from the repo root with -d firmware');

const backgroundBridgeSource = fs.readFileSync('tools/start-bridge-background.mjs', 'utf8');
assert(backgroundBridgeSource.includes('windowsHide: true'), 'background bridge launcher must hide the spawned server window on Windows');
assert(backgroundBridgeSource.includes('detached: true'), 'background bridge launcher must detach the server process');
assert(backgroundBridgeSource.includes('M5STACK_BRIDGE_BACKGROUND'), 'background bridge launcher must mark the child process as background mode');

const relaySource = fs.readFileSync('src/codex-adapter/relay.mjs', 'utf8');
assert(relaySource.includes('ToBase64String'), 'clipboard relay must avoid direct non-UTF8 PowerShell stdout text');
assert(relaySource.includes("Buffer.from(result.stdout.trim(), 'base64').toString('utf8')"), 'clipboard relay must restore UTF-8 from Base64');
assert(relaySource.includes("command === 'decision'"), 'relay CLI must expose a Codex decision request workflow');
assert(relaySource.includes('waitForDeviceReply'), 'relay CLI must be able to wait for M5Stack decision replies');

const sessionWatcherSource = fs.readFileSync('src/codex-adapter/sessionWatcher.mjs', 'utf8');
assert(sessionWatcherSource.includes('.codex'), 'session watcher must default to local Codex session logs');
assert(sessionWatcherSource.includes('publishLatestSession'), 'session watcher must publish the latest Codex exchange');
assert(sessionWatcherSource.includes('readLatestSessionExchange'), 'session watcher must expose latest exchange reading for the dashboard');
assert(sessionWatcherSource.includes('bodyPersistedInEvidence') === false, 'session watcher source must not persist session body evidence directly');

const hookRelaySource = fs.readFileSync('src/codex-adapter/hookRelay.mjs', 'utf8');
assert(hookRelaySource.includes('runSessionWatcherCli'), 'hook relay must reuse the session watcher path');
assert(fs.existsSync('docs/codex-hooks.example.json'), 'Codex hooks example must be documented');

const bridgeSource = fs.readFileSync('src/host-bridge/server.mjs', 'utf8');
assert(bridgeSource.includes("url.pathname === '/codex/choice'"), 'Host Bridge must expose a choice endpoint for ABC reply workflows');
assert(bridgeSource.includes("url.pathname === '/codex/decision'"), 'Host Bridge must expose a decision endpoint for Codex-to-M5Stack choice workflows');
assert(bridgeSource.includes("url.pathname === '/codex/pet'"), 'Host Bridge must expose a pet update endpoint');
assert(bridgeSource.includes("url.pathname === '/codex/display'"), 'Host Bridge must expose a display settings endpoint');
assert(bridgeSource.includes("url.pathname === '/codex/session/latest'"), 'Host Bridge must expose a latest Codex session endpoint for the GUI');
assert(bridgeSource.includes("url.pathname === '/codex/session/publish'"), 'Host Bridge must expose a latest Codex session publish endpoint for the GUI');
assert(bridgeSource.includes("url.pathname === '/pet/packages'"), 'Host Bridge must expose local pet package metadata for dashboard preview');
assert(bridgeSource.includes('/pet/current/manifest'), 'Host Bridge must expose the current local pet manifest for dashboard preview');
assert(bridgeSource.includes('/debug/snapshot'), 'Host Bridge must expose a sanitized debug snapshot for the GUI');
assert(bridgeSource.includes("url.pathname === '/debug/runtime'"), 'Host Bridge must expose runtime status for the GUI sidebar');
assert(bridgeSource.includes("url.pathname === '/debug/commands/run'"), 'Host Bridge must expose allowlisted command execution for the GUI');
assert(bridgeSource.includes('local-command-execution-only'), 'Host Bridge command execution must be restricted to local requests');
assert(bridgeSource.includes('firmware:upload:core2'), 'Host Bridge debug commands must expose auto-detected Core2 upload');

const dashboardIndexSource = fs.readFileSync('src/host-bridge/dashboard/index.html', 'utf8');
const dashboardAppSource = fs.readFileSync('src/host-bridge/dashboard/app.js', 'utf8');
assert(dashboardIndexSource.includes('最近の Codex 回答'), 'Dashboard must display the latest Codex answer panel');
assert(dashboardIndexSource.includes('side-nav'), 'Dashboard must expose side navigation');
assert(dashboardIndexSource.includes('M5Stack 表示プレビュー'), 'Dashboard must expose a M5Stack display preview');
assert(dashboardIndexSource.includes('pet display area'), 'Dashboard must expose pet display area controls');
assert(dashboardIndexSource.includes('body text size'), 'Dashboard must expose body text size controls');
assert(dashboardIndexSource.includes('render FPS'), 'Dashboard must expose render fps controls');
assert(dashboardIndexSource.includes('motion step'), 'Dashboard must expose pet motion step controls');
assert(dashboardIndexSource.includes('pet background'), 'Dashboard must expose pet background color controls');
assert(dashboardIndexSource.includes('text background'), 'Dashboard must expose text background color controls');
assert(dashboardIndexSource.includes('Codex回答のビープ通知'), 'Dashboard must expose answer beep controls');
assert(dashboardIndexSource.includes('previewDevice'), 'Dashboard must expose Core2 and GRAY preview switching');
assert(dashboardIndexSource.includes('petPackagePath'), 'Dashboard must expose local pet package path override');
assert(dashboardIndexSource.includes('max="8"'), 'Dashboard display controls must expose 8-step sliders');
assert(dashboardIndexSource.includes('data-tooltip'), 'Dashboard controls must provide focusable tooltip hints');
assert(dashboardIndexSource.includes('section-toggle'), 'Dashboard sections must support View/Hide collapse controls');
assert(dashboardIndexSource.includes('commandModal'), 'Dashboard setup/debug commands must be shown in a modal');
assert(dashboardIndexSource.includes('commandTabs'), 'Dashboard command modal must use tabs');
assert(dashboardIndexSource.includes('runtimeState'), 'Dashboard sidebar must display bridge runtime status');
assert(dashboardAppSource.includes('/codex/session/latest'), 'Dashboard must load the latest Codex session answer');
assert(dashboardAppSource.includes('/codex/session/publish'), 'Dashboard must publish the latest Codex session answer to M5Stack');
assert(dashboardAppSource.includes('/codex/display'), 'Dashboard must publish dynamic display settings to M5Stack');
assert(dashboardAppSource.includes('/codex/decision'), 'Dashboard must publish Codex decision requests to M5Stack');
assert(dashboardAppSource.includes('/pet/current/manifest'), 'Dashboard must load the current local pet asset for preview');
assert(dashboardAppSource.includes('/pet/packages'), 'Dashboard must list local pet packages for preview');
assert(dashboardAppSource.includes('animationFps'), 'Dashboard must publish animation fps in display settings');
assert(dashboardAppSource.includes('motionStepMs'), 'Dashboard must publish pet motion step timing in display settings');
assert(dashboardAppSource.includes('petBackgroundRgba'), 'Dashboard must publish pet background RGBA in display settings');
assert(dashboardAppSource.includes('textColorRgba'), 'Dashboard must publish text color RGBA in display settings');
assert(dashboardAppSource.includes('textBackgroundRgba'), 'Dashboard must publish text background RGBA in display settings');
assert(dashboardAppSource.includes('beepOnAnswer'), 'Dashboard must publish answer beep setting in display settings');
assert(dashboardAppSource.includes('createDisplayFallbackPetEvent'), 'Dashboard must support display settings fallback for an old bridge process');
assert(dashboardAppSource.includes('renderM5Preview'), 'Dashboard must render the M5Stack simulated preview');
assert(dashboardAppSource.includes('/debug/commands/run'), 'Dashboard must run allowlisted setup/debug commands from the modal');
assert(dashboardAppSource.includes('renderRuntimeStatus'), 'Dashboard must render server runtime status in the sidebar');

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
