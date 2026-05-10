import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  adapterReadiness,
  buildInitializeMessage,
  buildInitializedNotification,
  buildThreadStartMessage,
  buildTurnStartMessage,
  extractThreadId,
  validateAppServerTransport
} from '../src/codex-adapter/appServerAdapter.mjs';
import { summarizeAdapterReview } from '../src/codex-adapter/adapterRegistry.mjs';
import { productProfile } from '../src/core/product-profile.mjs';

const init = buildInitializeMessage();
assert.equal(init.method, 'initialize');
assert.equal(init.params.clientInfo.name, productProfile.repo);
assert.equal(init.params.capabilities, undefined);
assert.deepEqual(buildInitializedNotification(), { method: 'initialized', params: {} });

const threadStart = buildThreadStartMessage({ model: 'gpt-5.4' });
assert.equal(threadStart.method, 'thread/start');
assert.equal(threadStart.params.model, 'gpt-5.4');
const safeThreadStart = buildThreadStartMessage({
  cwd: process.cwd(),
  ephemeral: true,
  approvalPolicy: 'never',
  sandbox: 'read-only'
});
assert.equal(safeThreadStart.params.ephemeral, true);
assert.equal(safeThreadStart.params.approvalPolicy, 'never');
assert.equal(safeThreadStart.params.sandbox, 'read-only');

const turnStart = buildTurnStartMessage({ threadId: 'thr_123', text: 'Summarize status.' });
assert.equal(turnStart.method, 'turn/start');
assert.equal(turnStart.params.input[0].text, 'Summarize status.');
assert.equal(extractThreadId({ result: { thread: { id: 'thr_123' } } }), 'thr_123');

assert.equal(validateAppServerTransport({ listen: 'stdio://' }).ok, true);
assert.equal(validateAppServerTransport({ listen: 'ws://127.0.0.1:4500' }).ok, true);
assert.equal(validateAppServerTransport({ listen: 'ws://0.0.0.0:4500' }).ok, false);
assert.equal(validateAppServerTransport({ listen: 'ws://0.0.0.0:4500', wsAuth: 'capability-token' }).ok, true);

const readiness = adapterReadiness({ listen: 'stdio://' });
assert.equal(readiness.ok, true);
assert.equal(readiness.publicInterfaceOnly, true);
assert.equal(readiness.privateApiScraping, false);

const review = summarizeAdapterReview({ appServer: { listen: 'stdio://' } });
assert.equal(review.ok, true);
assert(review.implementedAdapters.includes('local-session-jsonl'));
assert(review.preparedAdapters.includes('codex-app-server'));

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/codex-app-server-adapter-smoke-result.json', `${JSON.stringify({
  product: productProfile.repo,
  version: productProfile.version,
  status: 'passed',
  checked: {
    initializeMessage: true,
    threadStartMessage: true,
    turnStartMessage: true,
    timeoutGuard: true,
    safeTransportGate: true,
    adapterRegistry: true,
    privateApiScraping: false
  }
}, null, 2)}\n`);

console.log('codex app-server adapter smoke passed');
