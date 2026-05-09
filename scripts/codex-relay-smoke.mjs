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

  const endpoint = await postJson(`${baseUrl}/codex/answer`, {
    deviceId,
    summary: 'Codex endpoint smoke',
    body: 'Endpoint body'
  });
  assert.equal(endpoint.ok, true);
  assert.equal(endpoint.event.type, 'answer.completed');

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
