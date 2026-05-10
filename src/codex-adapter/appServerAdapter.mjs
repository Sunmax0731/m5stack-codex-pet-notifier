import { spawn } from 'node:child_process';
import readline from 'node:readline';
import { productProfile } from '../core/product-profile.mjs';

export const appServerAdapterProfile = {
  id: 'codex-app-server',
  label: 'Codex App Server public interface',
  transport: 'stdio-jsonrpc',
  defaultCommand: 'codex',
  defaultArgs: ['app-server'],
  defaultRequestTimeoutMs: 15000,
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
  const params = {
    model: options.model ?? 'gpt-5.4'
  };
  for (const key of [
    'approvalPolicy',
    'approvalsReviewer',
    'baseInstructions',
    'config',
    'cwd',
    'developerInstructions',
    'ephemeral',
    'personality',
    'sandbox',
    'serviceName',
    'sessionStartSource',
    'modelProvider',
    'permissionProfile',
    'serviceTier'
  ]) {
    if (options[key] !== undefined) {
      params[key] = options[key];
    }
  }
  return {
    method: 'thread/start',
    id: options.id ?? 1,
    params
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
      input: [{ type: 'text', text }],
      ...(options.model !== undefined ? { model: options.model } : {}),
      ...(options.cwd !== undefined ? { cwd: options.cwd } : {}),
      ...(options.approvalPolicy !== undefined ? { approvalPolicy: options.approvalPolicy } : {}),
      ...(options.approvalsReviewer !== undefined ? { approvalsReviewer: options.approvalsReviewer } : {}),
      ...(options.effort !== undefined ? { effort: options.effort } : {}),
      ...(options.permissionProfile !== undefined ? { permissionProfile: options.permissionProfile } : {}),
      ...(options.personality !== undefined ? { personality: options.personality } : {}),
      ...(options.sandboxPolicy !== undefined ? { sandboxPolicy: options.sandboxPolicy } : {}),
      ...(options.serviceTier !== undefined ? { serviceTier: options.serviceTier } : {})
    }
  };
}

export function extractThreadId(response) {
  return response?.result?.thread?.id
    ?? response?.thread?.id
    ?? response?.result?.threadId
    ?? response?.threadId
    ?? null;
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
  const requestTimeoutMs = Number(options.requestTimeoutMs ?? appServerAdapterProfile.defaultRequestTimeoutMs);
  const stderrMode = options.onStderr ? 'pipe' : 'inherit';
  const child = spawn(readiness.command, readiness.args, {
    cwd: options.cwd ?? process.cwd(),
    stdio: ['pipe', 'pipe', stderrMode],
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
      const request = pending.get(message.id);
      pending.delete(message.id);
      clearTimeout(request.timer);
      request.resolve(message);
      return;
    }
    options.onNotification?.(message);
  });

  child.on('error', (error) => {
    rejectPending(error);
    options.onExit?.({ error });
  });

  child.on('exit', (code, signal) => {
    rejectPending(new Error(`codex app-server exited before response: code=${code ?? 'null'} signal=${signal ?? 'null'}`));
    options.onExit?.({ code, signal });
  });

  if (child.stderr) {
    child.stderr.on('data', (chunk) => {
      options.onStderr?.(chunk.toString('utf8'));
    });
  }

  function send(message) {
    child.stdin.write(`${JSON.stringify(message)}\n`);
    if (message.id === undefined) {
      return Promise.resolve(null);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(message.id);
        reject(new Error(`codex app-server request timed out: ${message.method}`));
      }, requestTimeoutMs);
      pending.set(message.id, {
        method: message.method,
        resolve,
        reject,
        timer
      });
    });
  }

  function rejectPending(error) {
    for (const [, request] of pending) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pending.clear();
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
      rejectPending(new Error('codex app-server session closed'));
      if (!child.killed) {
        child.kill();
      }
    }
  };
}
