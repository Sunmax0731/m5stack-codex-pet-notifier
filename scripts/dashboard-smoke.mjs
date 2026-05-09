import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createBridgeHttpServer, LanHostBridge } from '../src/host-bridge/server.mjs';
import { productProfile } from '../src/core/product-profile.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'm5stack-dashboard-session-'));
const sessionDir = path.join(tempRoot, '2026', '05', '09');
fs.mkdirSync(sessionDir, { recursive: true });
fs.writeFileSync(path.join(sessionDir, 'rollout-dashboard-session.jsonl'), [
  jsonl({
    timestamp: '2026-05-09T00:00:00.000Z',
    type: 'event_msg',
    payload: {
      type: 'user_message',
      message: 'Dashboard に最近の Codex 回答を表示してください。'
    }
  }),
  jsonl({
    timestamp: '2026-05-09T00:00:02.000Z',
    type: 'response_item',
    payload: {
      type: 'message',
      role: 'assistant',
      phase: 'final',
      content: [
        {
          type: 'output_text',
          text: 'Dashboard latest session answer smoke.'
        }
      ]
    }
  })
].join('\n') + '\n', 'utf8');

const bridge = new LanHostBridge();
const server = createBridgeHttpServer(bridge, { sessionsRoot: tempRoot });
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const deviceId = productProfile.sampleDeviceId;

try {
  const index = await getText(`${baseUrl}/`);
  assert.match(index, /M5Stack Codex Pet Console/);
  assert.match(index, /side-nav/);
  assert.match(index, /デバッグ/);
  assert.match(index, /最近の Codex 回答/);
  assert.match(index, /M5Stack 表示プレビュー/);
  assert.match(index, /render FPS/);
  assert.match(index, /motion step/);
  assert.match(index, /screen background/);
  assert.match(index, /pet background/);
  assert.match(index, /text background/);
  assert.match(index, /pet X offset/);
  assert.match(index, /pet Y offset/);
  assert.match(index, /text border/);
  assert.match(index, /テキスト枠を表示/);
  assert.match(index, /Codex回答のビープ通知/);
  assert.match(index, /previewDevice/);
  assert.match(index, /petPackagePath/);
  assert.match(index, /preview-settings-dock/);
  assert.match(index, /preview-asset-column/);
  assert.match(index, /preview-tuning-column/);
  assert.match(index, /data-tooltip/);
  assert.match(index, /section-toggle/);
  assert.match(index, /commandModal/);
  assert.match(index, /commandTabs/);
  assert.match(index, /commandOutput/);
  assert.match(index, /runtimeState/);
  assert.match(index, /環境構築コマンド/);
  assert.match(index, /max="8"/);
  assert.doesNotMatch(index, /data-section="sendSection"/);
  assert.match(index, /debug-send-block/);

  const app = await getText(`${baseUrl}/dashboard/app.js`);
  assert.match(app, /\/codex\/decision/);
  assert.match(app, /\/codex\/pet/);
  assert.match(app, /\/codex\/session\/latest/);
  assert.match(app, /\/codex\/session\/publish/);
  assert.match(app, /\/pet\/current\/manifest/);
  assert.match(app, /\/pet\/packages/);
  assert.match(app, /ensureApiBase/);
  assert.match(app, /bridgeCandidates/);
  assert.match(app, /compatibleCommandRunners/);
  assert.match(app, /apiUrl/);
  assert.match(app, /assetUrl/);
  assert.match(app, /motionStepMs/);
  assert.match(app, /screenBackgroundRgba/);
  assert.match(app, /petBackgroundRgba/);
  assert.match(app, /textColorRgba/);
  assert.match(app, /textBackgroundRgba/);
  assert.match(app, /petOffsetX/);
  assert.match(app, /petOffsetY/);
  assert.match(app, /textBorderEnabled/);
  assert.match(app, /textBorderRgba/);
  assert.match(app, /beepOnAnswer/);
  assert.match(app, /previewDevice/);
  assert.match(app, /\/debug\/commands\/run/);
  assert.match(app, /renderRuntimeStatus/);

  const css = await getText(`${baseUrl}/dashboard/styles.css`);
  assert.match(css, /\.dashboard-grid/);
  assert.match(css, /\.m5-screen/);
  assert.match(css, /--screen-bg/);
  assert.match(css, /--pet-x/);
  assert.match(css, /--overlay-border/);
  assert.match(css, /\.preview-stage/);
  assert.match(css, /\.preview-settings-dock/);
  assert.match(css, /\.preview-column/);
  assert.match(css, /\.preview-tuning-column/);
  assert.match(css, /\.command-tabs/);
  assert.match(css, /\.color-grid/);

  const snapshot = await getJson(`${baseUrl}/debug/snapshot`);
  assert.equal(snapshot.ok, true);
  assert.equal(snapshot.runtime.ok, true);
  assert.equal(snapshot.runtime.currentProcess.pid, process.pid);
  assert.equal(typeof snapshot.runtime.commandExecution.runner, 'string');
  assert.equal(snapshot.commandDefinitions.ok, true);
  assert(snapshot.commandDefinitions.commands.some((command) => command.id === 'bridgeStartBackground'));
  assert(snapshot.commandDefinitions.commands.some((command) => command.id === 'codexDisplay'));
  assert.match(snapshot.commands.codexChoice, /codex:choice/);
  assert.match(snapshot.commands.codexDecision, /codex:decision/);
  assert.match(snapshot.commands.codexDecisionWait, /codex:decision:wait/);
  assert.match(snapshot.commands.codexSessions, /codex:sessions/);
  assert.match(snapshot.commands.codexHook, /codex:hook/);
  assert.match(snapshot.commands.petAsset, /pet:asset/);
  assert.match(snapshot.commands.petAssetAny, /pet:asset/);
  assert.match(snapshot.commands.codexDisplay, /codex:display/);
  assert.match(snapshot.commands.codexDisplay, /--screen-bg/);
  assert.match(snapshot.commands.codexDisplay, /--pet-bg/);
  assert.match(snapshot.commands.codexDisplay, /--pet-offset-x/);
  assert.match(snapshot.commands.codexDisplay, /--text-border-enabled/);
  assert.match(snapshot.commands.core2Upload, /firmware:upload:core2/);

  const petPackages = await getJson(`${baseUrl}/pet/packages`);
  assert.equal(petPackages.ok, true);
  assert.equal(Array.isArray(petPackages.packages), true);

  const petManifest = await getJson(`${baseUrl}/pet/current/manifest`);
  assert.equal(typeof petManifest.ok, 'boolean');
  assert.equal(petManifest.frameWidth, 192);
  assert.equal(petManifest.columns, 8);

  const pair = await postJson(`${baseUrl}/pair`, { deviceId, pairingCode: productProfile.defaultPairingCode });
  assert.equal(pair.ok, true);

  const latestSession = await getJson(`${baseUrl}/codex/session/latest?phase=any&mode=assistant`);
  assert.equal(latestSession.ok, true);
  assert.equal(latestSession.body, 'Dashboard latest session answer smoke.');
  assert.match(latestSession.user.text, /Dashboard に最近/);

  const sessionPublish = await postJson(`${baseUrl}/codex/session/publish`, {
    deviceId,
    phase: 'any',
    mode: 'exchange'
  });
  assert.equal(sessionPublish.ok, true);
  assert.equal(sessionPublish.event.type, 'answer.completed');

  const polledSessionAnswer = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
  assert.equal(polledSessionAnswer.event.type, 'answer.completed');
  assert.match(polledSessionAnswer.event.body, /Dashboard に最近の Codex 回答/);

  const display = await postJson(`${baseUrl}/codex/display`, {
    deviceId,
    petScale: 8,
    uiTextScale: 3,
    bodyTextScale: 4,
    animationFps: 12,
    motionStepMs: 280,
    screenBackgroundRgba: { r: 2, g: 4, b: 8, a: 255 },
    petBackgroundRgba: { r: 8, g: 12, b: 20, a: 255 },
    textColorRgba: { r: 255, g: 245, b: 210, a: 255 },
    textBackgroundRgba: { r: 4, g: 8, b: 12, a: 180 },
    petOffsetX: -40,
    petOffsetY: 24,
    textBorderEnabled: true,
    textBorderRgba: { r: 120, g: 200, b: 255, a: 255 },
    beepOnAnswer: true
  });
  assert.equal(display.ok, true);
  assert.equal(display.event.type, 'display.settings_updated');
  assert.equal(display.event.display.petScale, 8);
  assert.equal(display.event.display.uiTextScale, 3);
  assert.equal(display.event.display.bodyTextScale, 4);
  assert.equal(display.event.display.animationFps, 12);
  assert.equal(display.event.display.motionStepMs, 280);
  assert.deepEqual(display.event.display.screenBackgroundRgba, { r: 2, g: 4, b: 8, a: 255 });
  assert.deepEqual(display.event.display.petBackgroundRgba, { r: 8, g: 12, b: 20, a: 255 });
  assert.deepEqual(display.event.display.textColorRgba, { r: 255, g: 245, b: 210, a: 255 });
  assert.deepEqual(display.event.display.textBackgroundRgba, { r: 4, g: 8, b: 12, a: 180 });
  assert.equal(display.event.display.petOffsetX, -40);
  assert.equal(display.event.display.petOffsetY, 24);
  assert.equal(display.event.display.textBorderEnabled, true);
  assert.deepEqual(display.event.display.textBorderRgba, { r: 120, g: 200, b: 255, a: 255 });
  assert.equal(display.event.display.beepOnAnswer, true);

  const pet = await postJson(`${baseUrl}/codex/pet`, {
    deviceId,
    name: 'Dashboard Pet',
    state: 'celebrate',
    spriteRef: 'host://pet/dashboard'
  });
  assert.equal(pet.ok, true);
  assert.equal(pet.event.type, 'pet.updated');

  const choice = await postJson(`${baseUrl}/codex/choice`, {
    deviceId,
    prompt: 'Dashboard choice smoke',
    choices: [
      { id: 'yes', label: '進める' },
      { id: 'no', label: '止める' },
      { id: 'other', label: '別案' }
    ],
    timeoutSec: 300
  });
  assert.equal(choice.ok, true);
  assert.equal(choice.event.type, 'prompt.choice_requested');

  const decision = await postJson(`${baseUrl}/codex/decision`, {
    deviceId,
    question: 'Dashboard decision smoke',
    a: '進める',
    b: '修正する',
    c: '保留する'
  });
  assert.equal(decision.ok, true);
  assert.equal(decision.event.type, 'prompt.choice_requested');

  const polledDisplay = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
  assert.equal(polledDisplay.event.type, 'display.settings_updated');
  const polledPet = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
  assert.equal(polledPet.event.type, 'pet.updated');
  const polledChoice = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
  assert.equal(polledChoice.event.type, 'prompt.choice_requested');
  const polledDecision = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
  assert.equal(polledDecision.event.type, 'prompt.choice_requested');

  const reply = await postJson(`${baseUrl}/device/event?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`, {
    type: 'device.reply_selected',
    eventId: 'evt-dashboard-smoke-reply',
    createdAt: '2026-05-09T00:00:30+09:00',
    deviceId,
    requestEventId: choice.event.eventId,
    choiceId: 'yes',
    input: 'button-a'
  });
  assert.equal(reply.ok, true);

  const events = await getJson(`${baseUrl}/events`);
  const latestReply = events.inbound.find((entry) => entry.eventId === 'evt-dashboard-smoke-reply');
  assert.equal(latestReply.details.choiceId, 'yes');
  assert.equal(latestReply.details.input, 'button-a');

  const runtime = await getJson(`${baseUrl}/debug/runtime`);
  assert.equal(runtime.ok, true);
  assert.equal(runtime.commandExecution.localOnly, true);

  const commandDefinitions = await getJson(`${baseUrl}/debug/commands`);
  assert.equal(commandDefinitions.ok, true);
  assert(commandDefinitions.tabs.some((tab) => tab.id === 'setup'));
  assert(commandDefinitions.tabs.some((tab) => tab.id === 'debug'));

  const replayRun = await postJson(`${baseUrl}/debug/commands/run`, {
    commandId: 'sampleReplay',
    params: { deviceId }
  });
  assert.equal(replayRun.ok, true);
  assert.equal(replayRun.result.ok, true);

  fs.mkdirSync('dist', { recursive: true });
  fs.writeFileSync('dist/dashboard-smoke-result.json', `${JSON.stringify({
    product: productProfile.repo,
    version: productProfile.version,
    status: 'passed',
    checked: {
      dashboardIndex: true,
      dashboardAssets: true,
      debugSnapshot: true,
      codexSessionCommand: true,
      codexHookCommand: true,
      codexDisplayCommand: true,
      petAssetCommand: true,
      arbitraryPetPackageEndpoint: true,
      latestSessionAnswerPanel: true,
      latestSessionAnswerEndpoint: true,
      latestSessionPublishEndpoint: true,
      displaySettingsEndpoint: true,
      displaySettingsEightStepControls: true,
      displaySettingsAnimationFpsControl: true,
      displaySettingsMotionStepControl: true,
      displaySettingsRgbaControls: true,
      displaySettingsScreenBackgroundControl: true,
      displaySettingsPetOffsetControls: true,
      displaySettingsTextBorderControl: true,
      displaySettingsBeepControl: true,
      m5StackPreviewPanel: true,
      m5StackPreviewCurrentPet: true,
      m5StackPreviewDeviceSwitch: true,
      m5StackPreviewTwoColumnLayout: true,
      sideNavigation: true,
      sectionCollapseControls: true,
      commandModal: true,
      commandModalTabs: true,
      commandModalParameterizedRun: true,
      runtimeSidebarStatus: true,
      backgroundBridgeStartCommand: true,
      bridgeApiAutoDiscovery: true,
      crossOriginPetAssetPreview: true,
      petEndpoint: true,
      choiceEndpoint: true,
      decisionEndpoint: true,
      inboundReplySummary: true
    }
  }, null, 2)}\n`);

  console.log('dashboard smoke passed');
} finally {
  server.close();
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

async function getText(url) {
  const response = await fetch(url);
  assert.equal(response.ok, true);
  return response.text();
}

async function getJson(url) {
  const response = await fetch(url);
  assert.equal(response.ok, true);
  return response.json();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  assert.equal(response.ok, true);
  return response.json();
}

function jsonl(value) {
  return JSON.stringify(value);
}
