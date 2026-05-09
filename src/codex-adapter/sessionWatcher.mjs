import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productProfile } from '../core/product-profile.mjs';
import { createAnswerEvent } from './eventFactory.mjs';
import { sendCodexEvent } from './relay.mjs';

const defaultBridgeUrl = 'http://127.0.0.1:8080';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function defaultSessionsRoot() {
  const codexHome = process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex');
  return path.join(codexHome, 'sessions');
}

export function findLatestSessionFile(root = defaultSessionsRoot()) {
  if (!fs.existsSync(root)) {
    return null;
  }
  const stack = [root];
  let latest = null;
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.jsonl')) {
        continue;
      }
      const stat = fs.statSync(entryPath);
      if (!latest || stat.mtimeMs > latest.mtimeMs) {
        latest = { filePath: entryPath, mtimeMs: stat.mtimeMs };
      }
    }
  }
  return latest?.filePath ?? null;
}

export function parseSessionText(text) {
  const messages = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    const payload = record.payload ?? {};
    if (record.type === 'event_msg' && payload.type === 'user_message') {
      pushMessage(messages, {
        timestamp: record.timestamp,
        role: 'user',
        phase: 'user',
        text: payload.message,
        source: 'event_msg'
      });
    }
    if (record.type === 'event_msg' && payload.type === 'agent_message') {
      pushMessage(messages, {
        timestamp: record.timestamp,
        role: 'assistant',
        phase: payload.phase ?? 'unknown',
        text: payload.message,
        source: 'event_msg'
      });
    }
    if (record.type === 'response_item' && payload.type === 'message' && payload.role === 'assistant') {
      pushMessage(messages, {
        timestamp: record.timestamp,
        role: 'assistant',
        phase: payload.phase ?? 'unknown',
        text: extractContentText(payload.content),
        source: 'response_item'
      });
    }
  }
  return dedupeMessages(messages);
}

export function selectLatestExchange(messages, options = {}) {
  const phase = options.phase ?? 'any';
  const mode = options.mode ?? 'exchange';
  const assistants = messages.filter((message) => (
    message.role === 'assistant' && phaseMatches(message.phase, phase)
  ));
  const assistant = assistants.at(-1);
  if (!assistant) {
    return null;
  }
  const user = [...messages].reverse().find((message) => (
    message.role === 'user' && compareTimestamp(message.timestamp, assistant.timestamp) <= 0
  ));
  const body = mode === 'assistant' || !user
    ? assistant.text
    : [
      'User:',
      truncateForDevice(user.text, 900),
      '',
      'Codex:',
      assistant.text
    ].join('\n');
  return {
    user,
    assistant,
    body,
    summary: buildSummary(assistant),
    signature: signatureFor({ user, assistant, body })
  };
}

export async function publishLatestSession(options = {}, state = {}) {
  const sessionFile = options.sessionFile ?? findLatestSessionFile(options.sessionsRoot ?? defaultSessionsRoot());
  if (!sessionFile) {
    return { ok: false, reason: 'no-session-file' };
  }
  const messages = parseSessionText(fs.readFileSync(sessionFile, 'utf8'));
  const exchange = selectLatestExchange(messages, {
    phase: options.phase ?? 'any',
    mode: options.mode ?? 'exchange'
  });
  if (!exchange) {
    return { ok: false, reason: 'no-session-message', sessionFile };
  }
  const signature = `${sessionFile}:${exchange.signature}`;
  if (state.lastSignature === signature) {
    return { ok: false, reason: 'unchanged', sessionFile };
  }
  const event = createAnswerEvent({
    body: exchange.body,
    summary: options.summary ?? exchange.summary,
    threadId: options.threadId ?? `codex-session:${path.basename(sessionFile, '.jsonl')}`,
    eventId: options.eventId
  });
  const result = await sendCodexEvent({
    bridgeUrl: options.bridgeUrl ?? defaultBridgeUrl,
    deviceId: options.deviceId ?? productProfile.sampleDeviceId,
    event,
    fetchImpl: options.fetchImpl ?? fetch
  });
  state.lastSignature = signature;
  return {
    ...result,
    sessionFile,
    phase: exchange.assistant.phase,
    mode: options.mode ?? 'exchange'
  };
}

export async function runSessionWatcherCli(argv = process.argv.slice(2), options = {}) {
  const args = parseArgs(argv);
  if (args.help) {
    const help = buildHelp();
    options.stdout?.write?.(help);
    return { ok: true, help };
  }
  const stateFile = args['state-file'] ?? args.stateFile;
  const state = stateFile ? readStateFile(stateFile) : {};
  const publishOptions = {
    sessionsRoot: args['sessions-root'] ?? args.sessionsRoot,
    sessionFile: args['session-file'] ?? args.sessionFile,
    bridgeUrl: args.bridge ?? args.url ?? process.env.HOST_BRIDGE_URL ?? defaultBridgeUrl,
    deviceId: args['device-id'] ?? args.deviceId ?? productProfile.sampleDeviceId,
    phase: args.phase ?? 'any',
    mode: args.mode ?? 'exchange',
    summary: args.summary,
    fetchImpl: options.fetchImpl ?? fetch
  };
  const publish = async () => {
    const result = await publishLatestSession(publishOptions, state);
    if (stateFile && result.ok) {
      writeStateFile(stateFile, state);
    }
    options.stdout?.write?.(`${JSON.stringify(redactResult(result), null, 2)}\n`);
    return result;
  };
  if (args.once) {
    return publish();
  }
  await publish();
  const intervalMs = Number(args.interval ?? 1500);
  setInterval(() => {
    publish().catch((error) => {
      options.stderr?.write?.(`${error.message}\n`);
    });
  }, intervalMs);
  options.stdout?.write?.(`watching Codex sessions: ${publishOptions.sessionFile ?? publishOptions.sessionsRoot ?? defaultSessionsRoot()}\n`);
  return new Promise(() => {});
}

export function defaultHookStateFile() {
  return path.join(repoRoot, 'dist', 'codex-session-hook-state.json');
}

function pushMessage(messages, message) {
  if (typeof message.text !== 'string' || !message.text.trim()) {
    return;
  }
  messages.push({ ...message, text: message.text.trim() });
}

function extractContentText(content) {
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .filter((part) => part && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

function dedupeMessages(messages) {
  const seen = new Set();
  return messages.filter((message) => {
    const key = [message.role, message.phase, message.text].join('\u0000');
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function phaseMatches(actual, expected) {
  if (expected === 'any') {
    return true;
  }
  return actual === expected;
}

function compareTimestamp(left, right) {
  return new Date(left ?? 0).getTime() - new Date(right ?? 0).getTime();
}

function truncateForDevice(value, maxLength) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function buildSummary(assistant) {
  const firstLine = assistant.text.split(/\r?\n/).find((line) => line.trim()) ?? 'Codex session update';
  return `Codex ${assistant.phase}: ${truncateForDevice(firstLine, 96)}`;
}

function signatureFor(exchange) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      user: exchange.user?.text ?? '',
      assistant: exchange.assistant.text,
      phase: exchange.assistant.phase,
      body: exchange.body
    }))
    .digest('hex')
    .slice(0, 16);
}

function redactResult(result) {
  if (!result.sessionFile) {
    return result;
  }
  return {
    ...result,
    sessionFile: path.basename(result.sessionFile)
  };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const normalized = token.slice(2);
    const inline = normalized.indexOf('=');
    if (inline >= 0) {
      args[normalized.slice(0, inline)] = normalized.slice(inline + 1);
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[normalized] = true;
    } else {
      args[normalized] = next;
      index += 1;
    }
  }
  return args;
}

function readStateFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function writeStateFile(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify({
    lastSignature: state.lastSignature ?? null
  }, null, 2)}\n`);
}

function buildHelp() {
  return [
    'Codex session watcher:',
    '  npm run codex:sessions -- --once',
    '  npm run codex:sessions -- --phase final',
    '  npm run codex:sessions -- --mode assistant',
    '',
    'Options:',
    '  --sessions-root %USERPROFILE%\\.codex\\sessions',
    '  --session-file path\\to\\rollout.jsonl',
    '  --phase any|final|commentary',
    '  --mode exchange|assistant',
    '  --bridge http://127.0.0.1:8080',
    '  --device-id m5stack-sample-001',
    '  --state-file dist\\codex-session-hook-state.json',
    ''
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSessionWatcherCli(process.argv.slice(2), { stdout: process.stdout, stderr: process.stderr })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
