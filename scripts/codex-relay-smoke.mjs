import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createBridgeHttpServer, LanHostBridge } from '../src/host-bridge/server.mjs';
import { productProfile } from '../src/core/product-profile.mjs';
import { runRelayCli } from '../src/codex-adapter/relay.mjs';

const bridge = new LanHostBridge();
const server = createBridgeHttpServer(bridge);
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;
const deviceId = productProfile.sampleDeviceId;

try {
  const pair = await postJson(`${baseUrl}/pair`, { deviceId, pairingCode: productProfile.defaultPairingCode });
  assert.equal(pair.ok, true);

  const relay = await runRelayCli([
    'answer',
    '--bridge', baseUrl,
    '--device-id', deviceId,
    '--summary', 'Codex relay smoke',
    '--text', 'Codex relay smoke answer body'
  ], { stdout: { write() {} } });
  assert.equal(relay.ok, true);
  assert.equal(relay.type, 'answer.completed');

  const polled = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
  assert.equal(polled.ok, true);
  assert.equal(polled.event.type, 'answer.completed');
  assert.equal(polled.event.summary, 'Codex relay smoke');
  assert.equal(polled.event.body, 'Codex relay smoke answer body');

  const japaneseClipboard = 'クリップボード経由の日本語本文です。PowerShellの出力エンコーディングで壊れないことを確認します。';
  const clipboardRelay = await runRelayCli([
    'clipboard',
    '--bridge', baseUrl,
    '--device-id', deviceId,
    '--summary', 'Clipboard UTF8 smoke'
  ], {
    stdout: { write() {} },
    readClipboard: () => japaneseClipboard
  });
  assert.equal(clipboardRelay.ok, true);

  const clipboardPolled = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
  assert.equal(clipboardPolled.ok, true);
  assert.equal(clipboardPolled.event.type, 'answer.completed');
  assert.equal(clipboardPolled.event.summary, 'Clipboard UTF8 smoke');
  assert.equal(clipboardPolled.event.body, japaneseClipboard);

  const endpoint = await postJson(`${baseUrl}/codex/answer`, {
    deviceId,
    summary: 'Codex endpoint smoke',
    body: 'Endpoint body'
  });
  assert.equal(endpoint.ok, true);
  assert.equal(endpoint.event.type, 'answer.completed');
  const endpointPolled = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
  assert.equal(endpointPolled.ok, true);
  assert.equal(endpointPolled.event.type, 'answer.completed');

  const decisionRelay = await runRelayCli([
    'decision',
    '--bridge', baseUrl,
    '--device-id', deviceId,
    '--question', 'Codex decision smoke',
    '--a', '進める',
    '--b', '修正する',
    '--c', '保留する'
  ], { stdout: { write() {} } });
  assert.equal(decisionRelay.ok, true);
  assert.equal(decisionRelay.type, 'prompt.choice_requested');

  const firstDecisionPolled = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
  assert.equal(firstDecisionPolled.ok, true);
  assert.equal(firstDecisionPolled.event.type, 'prompt.choice_requested');

  const waitingDecision = runRelayCli([
    'decision',
    '--bridge', baseUrl,
    '--device-id', deviceId,
    '--question', 'Codex wait decision smoke',
    '--a', '進める',
    '--b', '修正する',
    '--c', '保留する',
    '--wait',
    '--wait-ms', '5000',
    '--poll-ms', '50'
  ], { stdout: { write() {} } });

  const waitDecisionPolled = await waitForPolledEvent(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
  assert.equal(waitDecisionPolled.ok, true);
  assert.equal(waitDecisionPolled.event.type, 'prompt.choice_requested');
  const reply = await postJson(`${baseUrl}/device/event?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`, {
    type: 'device.reply_selected',
    eventId: 'evt-reply-wait-smoke',
    createdAt: new Date().toISOString(),
    deviceId,
    requestEventId: waitDecisionPolled.event.eventId,
    choiceId: 'continue',
    input: 'button-a'
  });
  assert.equal(reply.ok, true);
  const waited = await waitingDecision;
  assert.equal(waited.ok, true);
  assert.equal(waited.reply.ok, true);
  assert.equal(waited.reply.choiceId, 'continue');

  console.log('codex relay smoke passed');
} finally {
  server.close();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return response.json();
}

async function getJson(url) {
  const response = await fetch(url);
  return response.json();
}

async function waitForPolledEvent(url) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const polled = await getJson(url);
    if (polled.event) {
      return polled;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return getJson(url);
}
