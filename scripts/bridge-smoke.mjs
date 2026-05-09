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

  const restartedBridge = new LanHostBridge();
  restartedBridge.publish({
    type: 'display.settings_updated',
    eventId: 'evt-restarted-display',
    createdAt: '2026-05-09T00:00:10+09:00',
    display: {
      petScale: 4,
      uiTextScale: 1,
      bodyTextScale: 1,
      animationFps: 12,
      motionStepMs: 280,
      screenBackgroundRgba: { r: 34, g: 68, b: 102, a: 255 },
      petBackgroundRgba: { r: 102, g: 51, b: 0, a: 204 },
      textColorRgba: { r: 255, g: 255, b: 255, a: 255 },
      textBackgroundRgba: { r: 17, g: 17, b: 17, a: 128 },
      petOffsetX: 88,
      petOffsetY: -44,
      textBorderEnabled: false,
      textBorderRgba: { r: 255, g: 255, b: 255, a: 255 },
      beepOnAnswer: true
    }
  }, { deviceId });
  const recoveredPoll = restartedBridge.poll(deviceId, pair.token);
  assert.equal(recoveredPoll.ok, true);
  assert.equal(recoveredPoll.event.type, 'display.settings_updated');
  assert.equal(restartedBridge.summary().pairedDevices.length, 1);
  assert.equal(restartedBridge.safeEvents().security[0].kind, 'token-rehydrated');

  const replay = await postJson(`${baseUrl}/codex/replay-samples`, { deviceId });
  assert.equal(replay.ok, true);

  const screens = [];
  for (let index = 0; index < 5; index += 1) {
    const polled = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
    assert.equal(polled.ok, true);
    assert.ok(polled.event);
    screens.push(polled.event.type);
  }
  assert.deepEqual(screens, ['pet.updated', 'display.settings_updated', 'notification.created', 'answer.completed', 'prompt.choice_requested']);

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

  const petInteraction = await postJson(`${baseUrl}/device/event?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`, {
    type: 'device.pet_interacted',
    eventId: 'evt-bridge-smoke-long-press',
    createdAt: '2026-05-09T00:00:20+09:00',
    deviceId,
    petId: 'codex-pet',
    interaction: 'long-press',
    gesture: 'long-press',
    target: 'pet',
    screen: 'Idle',
    page: 0,
    mood: 'confused'
  });
  assert.equal(petInteraction.ok, true);
  assert.equal(petInteraction.sideEffect.type, 'prompt.choice_requested');

  const sideEffectChoice = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
  assert.equal(sideEffectChoice.ok, true);
  assert.equal(sideEffectChoice.event.type, 'prompt.choice_requested');

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
  assert.equal(health.outboundEvents, 6);
  assert.equal(health.inboundEvents, 2);
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
