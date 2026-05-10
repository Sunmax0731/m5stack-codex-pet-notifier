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
  'start-dashboard.bat',
  'tools/start-dashboard-hidden.ps1',
  'installer/M5StackCodexPetNotifier-Setup.bat',
  'installer/install-windows.ps1',
  'tools/package-beta.mjs',
  'tools/release-guard.mjs',
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
  'src/host-bridge/dashboard/display-utils.js',
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
assert(firmwareSource.includes('display["screenBackgroundRgba"]'), 'firmware must accept screen background RGBA in display settings');
assert(firmwareSource.includes('display["petBackgroundRgba"]'), 'firmware must accept pet background RGBA in display settings');
assert(firmwareSource.includes('display["textColorRgba"]'), 'firmware must accept text color RGBA in display settings');
assert(firmwareSource.includes('display["textBackgroundRgba"]'), 'firmware must accept text background RGBA in display settings');
assert(firmwareSource.includes('display["petOffsetX"]'), 'firmware must accept pet X offset in display settings');
assert(firmwareSource.includes('display["petOffsetY"]'), 'firmware must accept pet Y offset in display settings');
assert(firmwareSource.includes('display["textBorderEnabled"]'), 'firmware must accept text border visibility in display settings');
assert(firmwareSource.includes('display["textBorderRgba"]'), 'firmware must accept text border color in display settings');
assert(firmwareSource.includes('display["beepOnAnswer"]'), 'firmware must accept answer beep setting in display settings');
assert(firmwareSource.includes('display["visualProbe"]'), 'firmware must accept display apply visual probe setting');
assert(firmwareSource.includes('M5.Speaker.tone'), 'firmware must beep when configured answer events arrive');
assert(firmwareSource.includes('drawPetAvatar'), 'firmware must draw a pet avatar on the M5Stack display');
assert(firmwareSource.includes('M5Canvas petSprite'), 'firmware must use an off-screen sprite for pet rendering');
assert(firmwareSource.includes('drawPetSurfaceSprite'), 'firmware must push the pet surface as a sprite');
assert(firmwareSource.includes('drawPetSurfaceIfNeeded'), 'firmware must redraw only the pet surface during animation ticks');
assert(firmwareSource.includes('markPetDraw()'), 'firmware must separate pet animation redraw from full-screen redraw');
assert(firmwareSource.includes('petSprite.pushSprite(petX, petY)'), 'firmware must transfer only the completed pet sprite box to the display');
assert(firmwareSource.includes('drawPetAvatarTo(petSprite, 0, 0)'), 'firmware pet sprite must use local sprite coordinates to avoid redrawing the full header area');
assert(firmwareSource.includes('screenBackgroundColor()'), 'firmware must separate full-screen background color from pet background color');
assert(firmwareSource.includes('blendRgbaOver(textBackgroundRgba, TFT_BLACK)'), 'firmware text background must not implicitly inherit the screen background color');
assert(firmwareSource.includes('textPanelFillVisible()'), 'firmware text panel fill must support transparent text background at alpha 0');
assert(firmwareSource.includes('M5.Display.setTextColor(foreground, foreground);'), 'firmware must draw text without a background when text alpha is 0');
assert(firmwareSource.includes('screenState != SCREEN_IDLE || !petFullscreenMode()'), 'firmware must draw the text background panel even when the pet uses a fullscreen layout');
assert(firmwareSource.includes('petDrawX') && firmwareSource.includes('petOffsetX'), 'firmware must allow horizontal pet offset beyond the screen edge');
assert(firmwareSource.includes('petDrawY') && firmwareSource.includes('petOffsetY'), 'firmware must allow vertical pet offset beyond the screen edge');
assert(firmwareSource.includes('drawTextPanel'), 'firmware must apply text background and border consistently to text panels');
assert(!firmwareSource.includes('M5.Display.drawFastHLine(x + runStart'), 'scale-specific pet asset drawing must target the sprite canvas instead of drawing directly to the display');
assert(firmwareSource.includes('DISPLAY_SCALE_MAX = 32'), 'firmware must support 32-step pet display scaling');
assert(!firmwareSource.includes('String("state: ")'), 'firmware must not draw fixed state header text');
assert(firmwareSource.includes('display.settings_updated'), 'firmware must accept dynamic display settings from the Host Bridge');
assert(firmwareSource.includes('applyDisplaySettings(event["display"])'), 'firmware must accept display settings on direct and fallback events');
assert(firmwareSource.includes('writeDisplayDiagnostics'), 'firmware heartbeat must report the display settings currently applied on the device');
assert(firmwareSource.includes('displayApplyCount'), 'firmware heartbeat must expose display settings apply count for manual diagnosis');
assert(firmwareSource.includes('invalidatePetSprite()'), 'firmware must rebuild the pet sprite after display setting changes');
assert(firmwareSource.includes('triggerDisplayProbe'), 'firmware must show a visible display apply probe for end-to-end sync diagnosis');
assert(firmwareSource.includes('screenState == SCREEN_ERROR'), 'firmware display settings events must recover from transient error screen state');
assert(firmwareSource.includes('petMood'), 'firmware must track pet mood separately from pet state');
assert(firmwareSource.includes('renderedPetMood'), 'firmware must render mood-specific pet expressions');
assert(firmwareSource.includes('petAssetRowIndex'), 'firmware must map pet mood/state to hatch-pet animation rows');
assert(firmwareSource.includes('PET_ASSET_HAS_ANIMATION_ROWS'), 'firmware must support multi-row hatch-pet illustration variants');
assert(firmwareSource.includes('PET_ROW_REVIEW'), 'firmware must expose a review/focused illustration row');
assert(firmwareSource.includes('sendPetInteraction("double-tap"'), 'firmware must publish double-tap pet interactions');
assert(firmwareSource.includes('sendPetInteraction("long-press"'), 'firmware must publish long-press pet interactions');
assert(firmwareSource.includes('wasFlicked'), 'firmware must publish swipe interactions from touch flicks');
assert(firmwareSource.includes('writePetDiagnostics'), 'firmware heartbeat must report pet mood and interaction diagnostics');
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
assert(petAssetGeneratorSource.includes('ANIMATION_ROWS'), 'pet asset generator must understand the standard 9-row hatch-pet atlas');
assert(petAssetGeneratorSource.includes('PET_ASSET_ROW_FRAME_COUNTS'), 'pet asset generator must emit row-specific frame counts');
assert(petAssetGeneratorSource.includes('SCALE_KEY_COLUMNS'), 'pet asset generator must preserve flash by using high-resolution key poses for non-idle rows');

const eventFactorySource = fs.readFileSync('src/codex-adapter/eventFactory.mjs', 'utf8');
assert(eventFactorySource.includes('normalizeDisplaySettings(options.display)'), 'pet.updated events must preserve optional display settings for device updates');
assert(eventFactorySource.includes('normalizePetMood'), 'pet.updated events must normalize pet mood');
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
const dashboardBatchSource = fs.readFileSync('start-dashboard.bat', 'utf8');
assert(dashboardBatchSource.includes('start-dashboard-hidden.ps1'), 'dashboard batch file must hand off to the hidden dashboard launcher');
const hiddenDashboardSource = fs.readFileSync('tools/start-dashboard-hidden.ps1', 'utf8');
assert(hiddenDashboardSource.includes('WindowStyle Hidden'), 'hidden dashboard launcher must run the bridge start command without a visible PowerShell window');
assert(hiddenDashboardSource.includes('bridge:start:bg'), 'hidden dashboard launcher must start the background bridge');
assert(hiddenDashboardSource.includes('http://127.0.0.1:$Port/'), 'hidden dashboard launcher must open the local dashboard URL');
assert(hiddenDashboardSource.includes('$candidatePorts'), 'hidden dashboard launcher must fall back to another port when an old bridge owns 8080');
assert(hiddenDashboardSource.includes('$health.version -eq $expectedVersion'), 'hidden dashboard launcher must verify the bridge version before opening the browser');
const installerSource = fs.readFileSync('installer/install-windows.ps1', 'utf8');
assert(installerSource.includes('WScript.Shell'), 'Windows installer must create user shortcuts');
assert(installerSource.includes('DesktopDirectory'), 'Windows installer must create a desktop shortcut');
assert(installerSource.includes('LOCALAPPDATA'), 'Windows installer must write a user-local install manifest');
const installerPackageSource = fs.readFileSync('tools/package-beta.mjs', 'utf8');
assert(installerPackageSource.includes('windows-installer.zip'), 'beta packaging must create a Windows installer zip asset');

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
assert(!bridgeSource.includes("{ id: 'maintenance'"), 'Host Bridge command modal must not keep overlapping maintenance tab commands');
assert(bridgeSource.includes("id: 'sampleReplay'") && bridgeSource.includes("tab: 'debug'"), 'sample replay must be consolidated into the debug command tab');
assert(bridgeSource.includes("url.pathname === '/codex/session/latest'"), 'Host Bridge must expose a latest Codex session endpoint for the GUI');
assert(bridgeSource.includes("url.pathname === '/codex/session/publish'"), 'Host Bridge must expose a latest Codex session publish endpoint for the GUI');
assert(bridgeSource.includes("url.pathname === '/pet/packages'"), 'Host Bridge must expose local pet package metadata for dashboard preview');
assert(bridgeSource.includes('/pet/current/manifest'), 'Host Bridge must expose the current local pet manifest for dashboard preview');
assert(bridgeSource.includes('/debug/snapshot'), 'Host Bridge must expose a sanitized debug snapshot for the GUI');
assert(bridgeSource.includes("url.pathname === '/debug/runtime'"), 'Host Bridge must expose runtime status for the GUI sidebar');
assert(bridgeSource.includes("url.pathname === '/debug/commands/run'"), 'Host Bridge must expose allowlisted command execution for the GUI');
assert(bridgeSource.includes('display: event.display ?? null'), 'Host Bridge event log must expose device heartbeat display diagnostics');
assert(bridgeSource.includes('local-command-execution-only'), 'Host Bridge command execution must be restricted to local requests');
assert(bridgeSource.includes('access-control-allow-origin'), 'Host Bridge must allow the dashboard to use a latest Bridge API on another local port');
assert(bridgeSource.includes("request.method === 'OPTIONS'"), 'Host Bridge must answer CORS preflight requests for cross-port dashboard commands');
assert(bridgeSource.includes('firmware:upload:core2'), 'Host Bridge debug commands must expose auto-detected Core2 upload');
assert(bridgeSource.includes("runProcess('cmd.exe', ['/d', '/s', '/c', 'npm'"), 'Host Bridge must run npm GUI commands through cmd.exe on Windows to avoid npm.cmd spawn EINVAL');
assert(bridgeSource.includes('try {') && bridgeSource.includes('message: error.message'), 'Host Bridge command execution must return spawn errors as JSON instead of crashing the route');
assert(bridgeSource.includes('cmd-wrapper-v1'), 'Host Bridge runtime must expose the Windows-safe GUI command runner version');
assert(bridgeSource.includes('handlePetInteraction'), 'Host Bridge must turn long-press pet interactions into Codex choice requests');
assert(bridgeSource.includes('sourceInteraction'), 'Host Bridge side effects must identify the source pet interaction');
assert(bridgeSource.includes('EADDRINUSE'), 'Host Bridge must handle occupied ports without an unhandled Node stack trace');
assert(bridgeSource.includes('readExistingBridgeHealth'), 'Host Bridge occupied-port handling must inspect the existing bridge version');

const dashboardIndexSource = fs.readFileSync('src/host-bridge/dashboard/index.html', 'utf8');
const dashboardAppSource = fs.readFileSync('src/host-bridge/dashboard/app.js', 'utf8');
const dashboardDisplayUtilsSource = fs.readFileSync('src/host-bridge/dashboard/display-utils.js', 'utf8');
assert(dashboardIndexSource.includes('最近の Codex 回答'), 'Dashboard must display the latest Codex answer panel');
assert(dashboardIndexSource.includes('side-nav'), 'Dashboard must expose side navigation');
assert(!/class="side-link[^"]*"[^>]*data-section="statusSection"/.test(dashboardIndexSource), 'Dashboard side navigation must not keep a status button after the status panel moved into the sidebar');
assert(/class="side-link active"[^>]*data-section="previewSection"/.test(dashboardIndexSource), 'Dashboard side navigation must default to the preview section');
assert(/<aside class="sidebar">[\s\S]*<section id="statusSection" class="panel status-panel sidebar-status-panel"/.test(dashboardIndexSource), 'Dashboard status section must be rendered inside the sidebar');
assert(!dashboardIndexSource.includes('data-section="debugSection"'), 'Dashboard sidebar must not expose a separate debug item');
assert(dashboardIndexSource.includes('M5Stack 表示プレビュー'), 'Dashboard must expose a M5Stack display preview');
assert(dashboardIndexSource.includes('<option value="choice">三択</option>'), 'Dashboard screen-mode options must default to Japanese labels');
assert(dashboardIndexSource.includes('ペット表示面積'), 'Dashboard must expose pet display area controls in Japanese by default');
assert(dashboardIndexSource.includes('本文文字サイズ'), 'Dashboard must expose body text size controls in Japanese by default');
assert(dashboardIndexSource.includes('描画FPS'), 'Dashboard must expose render fps controls in Japanese by default');
assert(dashboardIndexSource.includes('アニメ間隔'), 'Dashboard must expose pet motion step controls in Japanese by default');
assert(dashboardIndexSource.includes('画面背景'), 'Dashboard must expose full-screen background color controls in Japanese by default');
assert(dashboardIndexSource.includes('ペット背景'), 'Dashboard must expose pet background color controls in Japanese by default');
assert(dashboardIndexSource.includes('文字背景'), 'Dashboard must expose text background color controls in Japanese by default');
assert(dashboardIndexSource.includes('data-rgba-picker'), 'Dashboard must expose a unified RGBA picker for color and alpha controls');
assert(dashboardIndexSource.includes('rgba-swatch'), 'Dashboard must show the currently selected RGBA color in each color section');
assert(dashboardIndexSource.includes('autoDisplaySync'), 'Dashboard must expose display setting auto-sync so slider changes reach the device');
assert(dashboardIndexSource.includes('visualProbe'), 'Dashboard must expose a visible apply probe option for display sync diagnosis');
assert(dashboardIndexSource.includes('displaySyncCard'), 'Dashboard must show whether display settings are reflected on the device');
assert(dashboardIndexSource.includes('ペットX位置'), 'Dashboard must expose horizontal pet position controls in Japanese by default');
assert(dashboardIndexSource.includes('ペットY位置'), 'Dashboard must expose vertical pet position controls in Japanese by default');
assert(dashboardIndexSource.includes('petMood'), 'Dashboard must expose pet mood controls in Japanese by default');
assert(dashboardIndexSource.includes('previewMoodReadout'), 'Dashboard preview must show the current pet mood');
assert(dashboardIndexSource.includes('previewInteractionReadout'), 'Dashboard preview must show the latest M5Stack interaction');
assert(dashboardIndexSource.includes('文字枠'), 'Dashboard must expose text border color controls in Japanese by default');
assert(dashboardIndexSource.includes('テキスト枠を表示'), 'Dashboard must expose text border visibility controls');
assert(dashboardIndexSource.includes('Codex回答のビープ通知'), 'Dashboard must expose answer beep controls');
assert(dashboardIndexSource.includes('languageMode'), 'Dashboard must expose Japanese/English language switching');
assert(dashboardIndexSource.includes('themeMode'), 'Dashboard must expose theme switching');
assert(dashboardIndexSource.includes('previewDevice'), 'Dashboard must expose Core2 and GRAY preview switching');
assert(dashboardIndexSource.includes('petPackagePath'), 'Dashboard must expose local pet package path override');
assert(dashboardIndexSource.includes('preview-settings-dock'), 'Dashboard preview settings must be docked below the screen preview');
assert(dashboardIndexSource.includes('preview-asset-column'), 'Dashboard preview settings must keep asset controls in a left column');
assert(dashboardIndexSource.includes('preview-tuning-column'), 'Dashboard preview settings must keep tuning controls in a right column');
assert(dashboardIndexSource.includes('max="8"'), 'Dashboard display controls must expose 8-step sliders');
assert(dashboardIndexSource.includes('data-tooltip'), 'Dashboard controls must provide help hint text');
assert(dashboardIndexSource.includes('section-toggle'), 'Dashboard sections must support View/Hide collapse controls');
assert(dashboardIndexSource.includes('commandModal'), 'Dashboard setup/debug commands must be shown in a modal');
assert(dashboardIndexSource.includes('commandTabs'), 'Dashboard command modal must use tabs');
assert(dashboardIndexSource.includes('runtimeState'), 'Dashboard sidebar must display bridge runtime status');
assert(fs.readFileSync('src/host-bridge/dashboard/styles.css', 'utf8').includes('.sidebar-status-panel'), 'Dashboard must style the sidebar status section');
assert(fs.readFileSync('src/host-bridge/dashboard/styles.css', 'utf8').includes('.pet-mood-mark'), 'Dashboard preview must style mood marks');
assert(!dashboardIndexSource.includes('data-section="sendSection"'), 'Dashboard must merge the standalone sender section into the command modal');
assert(dashboardIndexSource.includes('command-shared-settings'), 'Dashboard command modal must keep shared device settings without duplicate direct sender forms');
assert(!dashboardIndexSource.includes('debug-send-block'), 'Dashboard command modal must not duplicate direct outbound sender forms');
assert(dashboardAppSource.includes('/codex/session/latest'), 'Dashboard must load the latest Codex session answer');
assert(dashboardAppSource.includes('/codex/session/publish'), 'Dashboard must publish the latest Codex session answer to M5Stack');
assert(dashboardAppSource.includes('/codex/display'), 'Dashboard must publish dynamic display settings to M5Stack');
assert(dashboardAppSource.includes('codexDecision'), 'Dashboard command modal must publish Codex decision requests through the debug command tab');
assert(dashboardAppSource.includes('/pet/current/manifest'), 'Dashboard must load the current local pet asset for preview');
assert(dashboardAppSource.includes('/pet/packages'), 'Dashboard must list local pet packages for preview');
assert(dashboardAppSource.includes('animationFps'), 'Dashboard must publish animation fps in display settings');
assert(dashboardAppSource.includes('motionStepMs'), 'Dashboard must publish pet motion step timing in display settings');
assert(dashboardAppSource.includes('screenBackgroundRgba'), 'Dashboard must publish screen background RGBA in display settings');
assert(dashboardAppSource.includes('petBackgroundRgba'), 'Dashboard must publish pet background RGBA in display settings');
assert(dashboardAppSource.includes('textColorRgba'), 'Dashboard must publish text color RGBA in display settings');
assert(dashboardAppSource.includes('textBackgroundRgba'), 'Dashboard must publish text background RGBA in display settings');
assert(dashboardAppSource.includes('rgbaOverBlackCss(textBackground)'), 'Dashboard preview must keep text background transparent when alpha is 0');
assert(dashboardAppSource.includes('wirePreviewPetDrag'), 'Dashboard preview must support drag-based pet positioning');
assert(dashboardAppSource.includes('petOffsetX'), 'Dashboard must publish horizontal pet offset in display settings');
assert(dashboardAppSource.includes('petOffsetY'), 'Dashboard must publish vertical pet offset in display settings');
assert(dashboardAppSource.includes('petMood'), 'Dashboard must publish pet mood in pet update events');
assert(dashboardAppSource.includes('latestPetInteraction'), 'Dashboard must surface the latest pet interaction in the preview');
assert(dashboardAppSource.includes('moodFromState'), 'Dashboard must derive a safe fallback mood from pet state');
assert(dashboardAppSource.includes('petAnimationRows'), 'Dashboard preview must understand hatch-pet animation rows');
assert(dashboardAppSource.includes('previewPetRow'), 'Dashboard preview must map mood/state to illustrated pet rows');
assert(dashboardAppSource.includes('textBorderEnabled'), 'Dashboard must publish text border visibility in display settings');
assert(dashboardAppSource.includes('textBorderRgba'), 'Dashboard must publish text border RGBA in display settings');
assert(dashboardAppSource.includes('beepOnAnswer'), 'Dashboard must publish answer beep setting in display settings');
assert(dashboardAppSource.includes('visualProbe'), 'Dashboard must publish display apply visual probe setting');
assert(dashboardAppSource.includes('renderDisplaySyncStatus'), 'Dashboard must compare sent display settings with device heartbeat');
assert(dashboardAppSource.includes('compareDisplaySettings'), 'Dashboard must compute display setting sync mismatches');
assert(dashboardAppSource.includes('displayTargetDeviceIds'), 'Dashboard must use paired device heartbeats for display sync when the debug device field is stale');
assert(dashboardAppSource.includes('scheduleAutoDisplaySync'), 'Dashboard must debounce and auto-send display setting changes');
assert(dashboardAppSource.includes('updateRgbaVisual'), 'Dashboard must update RGBA swatches when color or alpha changes');
assert(dashboardAppSource.includes('rgbaLabel,'), 'Dashboard must import the RGBA label helper used by renderDisplayControls');
assert(dashboardDisplayUtilsSource.includes('export function rgbaFromControls'), 'Dashboard RGBA handling must live in the display utility module');
assert(dashboardDisplayUtilsSource.includes('export function rgbaLabel'), 'Dashboard display utility module must export the RGBA label helper');
assert(dashboardDisplayUtilsSource.includes('export function moodFromState'), 'Dashboard mood fallback handling must live in the display utility module');
assert(dashboardAppSource.includes('display: displaySettingsPayload()'), 'Dashboard pet updates must carry the current display settings to the device');
assert(dashboardAppSource.includes('createDisplayFallbackPetEvent'), 'Dashboard must support display settings fallback for an old bridge process');
assert(dashboardAppSource.includes('renderM5Preview'), 'Dashboard must render the M5Stack simulated preview');
assert(dashboardAppSource.includes('/debug/commands/run'), 'Dashboard must run allowlisted setup/debug commands from the modal');
assert(dashboardAppSource.includes('bridgeRestartBackground'), 'Dashboard command modal must expose local Bridge restart');
assert(dashboardAppSource.includes('codexNotification'), 'Dashboard command modal must integrate notification debug sending');
assert(dashboardAppSource.includes('renderRuntimeStatus'), 'Dashboard must render server runtime status in the sidebar');
assert(dashboardAppSource.includes('ensureApiBase'), 'Dashboard must discover the latest Bridge API when an old process owns the current port');
assert(dashboardAppSource.includes('bridgeCandidates'), 'Dashboard must try known local Bridge ports for pet asset preview');
assert(dashboardAppSource.includes('compatibleCommandRunners'), 'Dashboard must avoid GUI command execution on old Bridge processes with unsafe npm spawning');
assert(dashboardAppSource.includes('assetUrl'), 'Dashboard must resolve pet spritesheet URLs against the discovered Bridge API origin');
assert(dashboardAppSource.includes('applyTheme'), 'Dashboard must apply OS/light/dark theme modes');
assert(dashboardAppSource.includes('applyLanguage'), 'Dashboard must apply Japanese/English labels');
assert(dashboardAppSource.includes('enhanceHints'), 'Dashboard must turn tooltip hints into clickable help buttons');
assert(dashboardAppSource.includes("run: 'Run'"), 'Dashboard command modal run buttons must switch to English labels');

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
