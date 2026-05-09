import assert from 'node:assert/strict';
import fs from 'node:fs';
import { once } from 'node:events';
import { createBridgeHttpServer, LanHostBridge } from '../src/host-bridge/server.mjs';
import { productProfile } from '../src/core/product-profile.mjs';

const bridge = new LanHostBridge();
const server = createBridgeHttpServer(bridge);
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const deviceId = productProfile.sampleDeviceId;

try {
  const index = await getText(`${baseUrl}/`);
  assert.match(index, /M5Stack Codex Pet Console/);
  assert.match(index, /ABC 返信ワークフロー/);

  const app = await getText(`${baseUrl}/dashboard/app.js`);
  assert.match(app, /\/codex\/choice/);
  assert.match(app, /\/codex\/pet/);

  const css = await getText(`${baseUrl}/dashboard/styles.css`);
  assert.match(css, /\.dashboard-grid/);

  const snapshot = await getJson(`${baseUrl}/debug/snapshot`);
  assert.equal(snapshot.ok, true);
  assert.match(snapshot.commands.codexChoice, /codex:choice/);
  assert.match(snapshot.commands.petAsset, /pet:asset/);

  const pair = await postJson(`${baseUrl}/pair`, { deviceId, pairingCode: productProfile.defaultPairingCode });
  assert.equal(pair.ok, true);

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
      petAssetCommand: true,
      petEndpoint: true,
      choiceEndpoint: true,
      inboundReplySummary: true
    }
  }, null, 2)}\n`);

  console.log('dashboard smoke passed');
} finally {
  server.close();
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
