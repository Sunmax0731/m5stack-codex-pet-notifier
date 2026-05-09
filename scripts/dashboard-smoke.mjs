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
  assert.match(index, /ABC 返信ワークフロー/);
  assert.match(index, /最近の Codex 回答/);

  const app = await getText(`${baseUrl}/dashboard/app.js`);
  assert.match(app, /\/codex\/choice/);
  assert.match(app, /\/codex\/pet/);
  assert.match(app, /\/codex\/session\/latest/);
  assert.match(app, /\/codex\/session\/publish/);

  const css = await getText(`${baseUrl}/dashboard/styles.css`);
  assert.match(css, /\.dashboard-grid/);

  const snapshot = await getJson(`${baseUrl}/debug/snapshot`);
  assert.equal(snapshot.ok, true);
  assert.match(snapshot.commands.codexChoice, /codex:choice/);
  assert.match(snapshot.commands.codexSessions, /codex:sessions/);
  assert.match(snapshot.commands.codexHook, /codex:hook/);
  assert.match(snapshot.commands.petAsset, /pet:asset/);
  assert.match(snapshot.commands.codexDisplay, /codex:display/);

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
    petScale: 2,
    uiTextScale: 1,
    bodyTextScale: 1
  });
  assert.equal(display.ok, true);
  assert.equal(display.event.type, 'display.settings_updated');
  assert.equal(display.event.display.petScale, 2);

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

  const polledDisplay = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
  assert.equal(polledDisplay.event.type, 'display.settings_updated');
  const polledPet = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
  assert.equal(polledPet.event.type, 'pet.updated');
  const polledChoice = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
  assert.equal(polledChoice.event.type, 'prompt.choice_requested');

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
      latestSessionAnswerPanel: true,
      latestSessionAnswerEndpoint: true,
      latestSessionPublishEndpoint: true,
      displaySettingsEndpoint: true,
      petEndpoint: true,
      choiceEndpoint: true,
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
