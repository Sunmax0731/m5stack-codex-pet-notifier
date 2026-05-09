import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createBridgeHttpServer, LanHostBridge } from '../src/host-bridge/server.mjs';
import { productProfile } from '../src/core/product-profile.mjs';
import {
  parseSessionText,
  publishLatestSession,
  readLatestSessionExchange,
  runSessionWatcherCli,
  selectLatestExchange
} from '../src/codex-adapter/sessionWatcher.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'm5stack-codex-session-'));
const sessionDir = path.join(tempRoot, '2026', '05', '09');
fs.mkdirSync(sessionDir, { recursive: true });
const sessionFile = path.join(sessionDir, 'rollout-session-smoke.jsonl');
fs.writeFileSync(sessionFile, [
  jsonl({
    timestamp: '2026-05-09T00:00:00.000Z',
    type: 'event_msg',
    payload: {
      type: 'user_message',
      message: '最新セッションを M5Stack に送ってください。'
    }
  }),
  jsonl({
    timestamp: '2026-05-09T00:00:02.000Z',
    type: 'event_msg',
    payload: {
      type: 'agent_message',
      phase: 'commentary',
      message: 'セッションログを監視しています。'
    }
  }),
  jsonl({
    timestamp: '2026-05-09T00:00:04.000Z',
    type: 'response_item',
    payload: {
      type: 'message',
      role: 'assistant',
      phase: 'final',
      content: [
        {
          type: 'output_text',
          text: '最新の Codex セッション応答です。'
        }
      ]
    }
  })
].join('\n') + '\n', 'utf8');

const messages = parseSessionText(fs.readFileSync(sessionFile, 'utf8'));
assert.equal(messages.filter((message) => message.role === 'assistant').length, 2);
const finalExchange = selectLatestExchange(messages, { phase: 'final', mode: 'exchange' });
assert.match(finalExchange.body, /User:/);
assert.match(finalExchange.body, /Codex:/);
assert.match(finalExchange.body, /最新の Codex セッション応答です。/);
const latestForDashboard = readLatestSessionExchange({ sessionFile, phase: 'final', mode: 'assistant' });
assert.equal(latestForDashboard.ok, true);
assert.equal(latestForDashboard.sessionName, 'rollout-session-smoke.jsonl');
assert.equal(latestForDashboard.body, '最新の Codex セッション応答です。');
assert.match(latestForDashboard.user.text, /最新セッションを M5Stack/);

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

  const publishState = {};
  const result = await publishLatestSession({
    sessionFile,
    phase: 'final',
    mode: 'exchange',
    bridgeUrl: baseUrl,
    deviceId
  }, publishState);
  assert.equal(result.ok, true);
  assert.equal(result.type, 'answer.completed');

  const duplicate = await publishLatestSession({
    sessionFile,
    phase: 'final',
    mode: 'exchange',
    bridgeUrl: baseUrl,
    deviceId
  }, publishState);
  assert.equal(duplicate.reason, 'unchanged');

  const stateFile = path.join(tempRoot, 'hook-state.json');
  const stdout = { text: '', write(value) { this.text += value; } };
  const firstHook = await runSessionWatcherCli([
    '--once',
    '--phase',
    'final',
    '--mode',
    'exchange',
    '--session-file',
    sessionFile,
    '--bridge',
    baseUrl,
    '--device-id',
    deviceId,
    '--state-file',
    stateFile
  ], { stdout });
  assert.equal(firstHook.ok, true);
  assert.equal(JSON.parse(fs.readFileSync(stateFile, 'utf8')).lastSignature.length > 0, true);
  const secondHook = await runSessionWatcherCli([
    '--once',
    '--phase',
    'final',
    '--mode',
    'exchange',
    '--session-file',
    sessionFile,
    '--bridge',
    baseUrl,
    '--device-id',
    deviceId,
    '--state-file',
    stateFile
  ], { stdout });
  assert.equal(secondHook.reason, 'unchanged');

  const polled = await getJson(`${baseUrl}/device/poll?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(pair.token)}`);
  assert.equal(polled.event.type, 'answer.completed');
  assert.match(polled.event.summary, /Codex final/);
  assert.match(polled.event.body, /最新セッションを M5Stack/);
  assert.match(polled.event.body, /最新の Codex セッション応答です。/);

  fs.mkdirSync('dist', { recursive: true });
  fs.writeFileSync('dist/codex-session-smoke-result.json', `${JSON.stringify({
    product: productProfile.repo,
    version: productProfile.version,
    status: 'passed',
    checked: {
      localCodexSessionJsonl: true,
      latestExchangeExtraction: true,
      latestExchangeReadApi: true,
      answerEventQueued: true,
      duplicateSuppression: true,
      hookStateFile: true,
      bodyPersistedInEvidence: false
    }
  }, null, 2)}\n`);

  console.log('codex session smoke passed');
} finally {
  server.close();
}

function jsonl(value) {
  return JSON.stringify(value);
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
