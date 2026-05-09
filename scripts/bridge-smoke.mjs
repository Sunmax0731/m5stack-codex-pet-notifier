import assert from 'node:assert/strict';
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
  const pair = await postJson(`${baseUrl}/pair`, { deviceId, pairingCode: productProfile.defaultPairingCode });
  assert.equal(pair.ok, true);
  assert.equal(typeof pair.token, 'string');

  const unauthorizedPoll = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=wrong-token`);
  assert.equal(unauthorizedPoll.ok, false);
  assert.equal(unauthorizedPoll.reason, 'invalid-token');

  const replay = await postJson(`${baseUrl}/codex/replay-samples`, { deviceId });
  assert.equal(replay.ok, true);

  const screens = [];
  for (let index = 0; index < 4; index += 1) {
    const polled = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
    assert.equal(polled.ok, true);
    assert.ok(polled.event);
    screens.push(polled.event.type);
  }
  assert.deepEqual(screens, ['pet.updated', 'notification.created', 'answer.completed', 'prompt.choice_requested']);

  const reply = await postJson(`${baseUrl}/device/event?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`, {
    type: 'device.reply_selected',
    eventId: 'evt-bridge-smoke-reply',
    createdAt: '2026-05-09T00:00:20+09:00',
    deviceId,
    requestEventId: 'evt-choice-001',
    choiceId: 'yes',
    input: 'button-a'
  });
  assert.equal(reply.ok, true);

  const unauthorizedReply = await postJson(`${baseUrl}/device/event?deviceId=${encodeURIComponent(deviceId)}&token=wrong-token`, {
    type: 'device.reply_selected',
    eventId: 'evt-bridge-smoke-rejected-reply',
    createdAt: '2026-05-09T00:00:21+09:00',
    deviceId,
    requestEventId: 'evt-choice-001',
    choiceId: 'yes',
    input: 'button-a'
  });
  assert.equal(unauthorizedReply.ok, false);
  assert.equal(unauthorizedReply.reason, 'invalid-token');

  const health = await getJson(`${baseUrl}/health`);
  assert.equal(health.ok, true);
  assert.equal(health.outboundEvents, 4);
  assert.equal(health.inboundEvents, 1);
  assert.equal(health.securityRejections, 2);
  console.log('bridge smoke passed');
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
