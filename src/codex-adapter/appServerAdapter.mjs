import { spawn } from 'node:child_process';
import readline from 'node:readline';
import { productProfile } from '../core/product-profile.mjs';

export const appServerAdapterProfile = {
  id: 'codex-app-server',
  label: 'Codex App Server public interface',
  transport: 'stdio-jsonrpc',
  defaultCommand: 'codex',
  defaultArgs: ['app-server'],
  experimentalApi: false,
  publicInterfaceOnly: true,
  privateApiScraping: false,
  messageBodiesPersistedInEvidence: false,
  notes: [
    'Uses the public codex app-server protocol surface instead of scraping private Codex App data.',
    'Keeps experimentalApi disabled until a concrete feature requires it and is documented.',
    'WebSocket transport is not used by default; if enabled, it must stay loopback or require auth.'
  ]
};

export function buildInitializeMessage(options = {}) {
  const capabilities = options.experimentalApi === true ? { experimentalApi: true } : {};
  return {
    method: 'initialize',
    id: options.id ?? 0,
    params: {
      clientInfo: {
        name: options.name ?? productProfile.repo,
        title: options.title ?? 'M5Stack Codex Pet Notifier',
        version: options.version ?? productProfile.version
      },
      ...(Object.keys(capabilities).length ? { capabilities } : {})
    }
  };
}

export function buildInitializedNotification() {
  return { method: 'initialized', params: {} };
}

export function buildThreadStartMessage(options = {}) {
  return {
    method: 'thread/start',
    id: options.id ?? 1,
    params: {
      model: options.model ?? 'gpt-5.4'
    }
  };
}

export function buildTurnStartMessage(options = {}) {
  if (!options.threadId) {
    throw new Error('threadId is required');
  }
  const text = String(options.text ?? '').trim();
  if (!text) {
    throw new Error('text is required');
  }
  return {
    method: 'turn/start',
    id: options.id ?? 2,
    params: {
      threadId: options.threadId,
      input: [{ type: 'text', text }]
    }
  };
}

export function validateAppServerTransport(options = {}) {
  const listen = String(options.listen ?? 'stdio://');
  if (listen === 'stdio://' || listen === 'stdio' || listen.length === 0) {
    return { ok: true, transport: 'stdio', authRequired: false };
  }
  let url;
  try {
    url = new URL(listen);
  } catch {
    return { ok: false, reason: 'invalid-listen-url' };
  }
  if (url.protocol !== 'ws:') {
    return { ok: false, reason: 'unsupported-transport', transport: url.protocol.replace(':', '') };
  }
  const loopback = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
  const auth = options.wsAuth === 'capability-token' || options.wsAuth === 'signed-bearer-token';
  if (!loopback && !auth) {
    return { ok: false, reason: 'non-loopback-websocket-requires-auth' };
  }
  return {
    ok: true,
    transport: 'websocket',
    loopback,
    authRequired: !loopback,
    authConfigured: auth
  };
}

export function adapterReadiness(options = {}) {
  const transport = validateAppServerTransport(options);
  const command = options.command ?? process.env.CODEX_APP_SERVER_COMMAND ?? appServerAdapterProfile.defaultCommand;
  return {
    ok: transport.ok,
    adapter: appServerAdapterProfile.id,
    command,
    args: options.args ?? appServerAdapterProfile.defaultArgs,
    transport,
    experimentalApi: options.experimentalApi === true,
    publicInterfaceOnly: true,
    privateApiScraping: false,
    readyForRuntimeProbe: transport.ok && Boolean(command)
  };
}

export function createAppServerSession(options = {}) {
  const readiness = adapterReadiness(options);
  if (!readiness.ok) {
    throw new Error(`unsafe app-server transport: ${readiness.transport.reason}`);
  }
  const child = spawn(readiness.command, readiness.args, {
    cwd: options.cwd ?? process.cwd(),
    stdio: ['pipe', 'pipe', 'inherit'],
    windowsHide: true,
    env: { ...process.env, ...(options.env ?? {}) }
  });
  const rl = readline.createInterface({ input: child.stdout });
  const pending = new Map();

  rl.on('line', (line) => {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      options.onMalformedLine?.(line);
      return;
    }
    if (message.id !== undefined && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
      return;
    }
    options.onNotification?.(message);
  });

  function send(message) {
    child.stdin.write(`${JSON.stringify(message)}\n`);
    if (message.id === undefined) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      pending.set(message.id, resolve);
    });
  }

  return {
    process: child,
    send,
    initialize: async (initOptions = {}) => {
      const initialized = await send(buildInitializeMessage(initOptions));
      await send(buildInitializedNotification());
      return initialized;
    },
    close: () => {
      rl.close();
      child.kill();
    }
  };
}
