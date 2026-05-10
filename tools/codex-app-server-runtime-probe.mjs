import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  adapterReadiness,
  buildThreadStartMessage,
  buildTurnStartMessage,
  createAppServerSession,
  extractThreadId
} from '../src/codex-adapter/appServerAdapter.mjs';
import { productProfile } from '../src/core/product-profile.mjs';

class ProbeStop extends Error {}

const repoRoot = process.cwd();
const args = new Set(process.argv.slice(2));
const includeTurn = args.has('--include-turn') || process.env.CODEX_APP_SERVER_INCLUDE_TURN === '1';
const strict = args.has('--strict');
const timeoutMs = Number(process.env.CODEX_APP_SERVER_PROBE_TIMEOUT_MS ?? 15000);
const command = process.env.CODEX_APP_SERVER_COMMAND ?? 'codex';
const schemaDir = path.join(repoRoot, 'schemas', 'codex-app-server');
const resultPath = path.join(repoRoot, 'dist', 'codex-app-server-runtime-probe-result.json');
const docsResultPath = path.join(repoRoot, 'docs', 'codex-app-server-runtime-probe-result.json');

const result = {
  product: productProfile.repo,
  version: productProfile.version,
  generatedAt: new Date().toISOString(),
  status: 'blocked',
  officialDocs: 'https://developers.openai.com/codex/app-server',
  publicInterfaceOnly: true,
  privateApiScraping: false,
  messageBodiesPersistedInEvidence: false,
  command,
  includeTurn,
  requestTimeoutMs: timeoutMs,
  cli: {
    available: false,
    version: null
  },
  schemas: {
    generated: false,
    path: path.relative(repoRoot, schemaDir),
    fileCount: 0
  },
  readiness: null,
  probe: {
    initialize: null,
    threadStart: null,
    turnStart: null,
    notificationMethods: [],
    malformedLineCount: 0,
    stderrLineCount: 0,
    stderrSample: []
  },
  nextActions: []
};

try {
  result.cli = codexVersion(command);
  if (!result.cli.available) {
    result.nextActions.push('Install or expose the Codex CLI so `codex app-server` is callable from PATH.');
    finish();
  }

  const schemaRun = run(command, ['app-server', 'generate-json-schema', '--out', schemaDir], { timeout: 30000 });
  result.schemas.generated = schemaRun.status === 0;
  result.schemas.fileCount = countFiles(schemaDir);
  if (!result.schemas.generated) {
    result.schemas.error = summarizeCommandFailure(schemaRun);
  }

  result.readiness = adapterReadiness({ command, args: ['app-server'], listen: 'stdio://' });
  if (!result.readiness.ok) {
    result.nextActions.push('Use stdio transport, or keep websocket loopback/authenticated before probing runtime connectivity.');
    finish();
  }

  const notifications = [];
  const stderrLines = [];
  const session = createAppServerSession({
    command,
    args: ['app-server'],
    cwd: repoRoot,
    requestTimeoutMs: timeoutMs,
    onMalformedLine: () => {
      result.probe.malformedLineCount += 1;
    },
    onNotification: (message) => {
      if (message?.method && notifications.length < 25) {
        notifications.push(message.method);
      }
    },
    onStderr: (chunk) => {
      for (const line of chunk.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean)) {
        result.probe.stderrLineCount += 1;
        if (stderrLines.length < 5) {
          stderrLines.push(redactLine(line).slice(0, 500));
        }
      }
    }
  });

  try {
    const initialize = await session.initialize({ id: 100 });
    result.probe.initialize = summarizeResponse(initialize);
    if (initialize?.error) {
      result.status = 'failed';
      result.nextActions.push('Resolve the initialize JSON-RPC error before promoting the app-server adapter.');
      throw new ProbeStop();
    }

    const threadStart = await session.send(buildThreadStartMessage({
      id: 101,
      cwd: repoRoot,
      ephemeral: true,
      approvalPolicy: 'never',
      sandbox: 'read-only',
      model: process.env.CODEX_APP_SERVER_MODEL ?? 'gpt-5.4'
    }));
    result.probe.threadStart = summarizeResponse(threadStart);
    const threadId = extractThreadId(threadStart);
    result.probe.threadIdReceived = Boolean(threadId);
    if (threadStart?.error || !threadId) {
      result.status = 'failed';
      result.nextActions.push('Check ThreadStartResponse schema compatibility and Codex account/model configuration.');
      throw new ProbeStop();
    }

    if (includeTurn) {
      const turnStart = await session.send(buildTurnStartMessage({
        id: 102,
        threadId,
        text: process.env.CODEX_APP_SERVER_PROBE_TEXT ?? 'Return OK for this connectivity probe.',
        approvalPolicy: 'never',
        sandboxPolicy: { type: 'readOnly', networkAccess: false }
      }));
      result.probe.turnStart = summarizeResponse(turnStart);
      result.probe.turnIdReceived = Boolean(turnStart?.result?.turn?.id ?? turnStart?.turn?.id);
      if (turnStart?.error || !result.probe.turnIdReceived) {
        result.status = 'failed';
        result.nextActions.push('Check TurnStartResponse schema compatibility and account/model access before formal release.');
        throw new ProbeStop();
      }
    } else {
      result.probe.turnStart = {
        skipped: true,
        reason: 'Run with --include-turn to create a real turn. The default probe avoids spending model quota.'
      };
    }

    result.status = includeTurn ? 'passed' : 'partial';
    if (!includeTurn) {
      result.nextActions.push('Run `cmd.exe /d /s /c npm run codex:app-server:probe -- --include-turn` for the API-01 formal gate.');
    }
  } finally {
    result.probe.notificationMethods = [...new Set(notifications)];
    result.probe.stderrSample = stderrLines;
    session.close();
  }
} catch (error) {
  if (!(error instanceof ProbeStop)) {
    result.status = 'blocked';
    result.error = redactLine(error.message);
    result.nextActions.push('Run the probe again after updating the Codex CLI, login state, or app-server protocol assumptions.');
  }
} finally {
  finish();
}

function finish() {
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  fs.mkdirSync(path.dirname(docsResultPath), { recursive: true });
  fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  fs.writeFileSync(docsResultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(result, null, 2));
  if (strict && result.status !== 'passed') {
    process.exit(1);
  }
  process.exit(0);
}

function codexVersion(executable) {
  const probe = run(executable, ['--version'], { timeout: 10000 });
  return {
    available: probe.status === 0,
    version: probe.status === 0 ? probe.stdout.trim() : null,
    error: probe.status === 0 ? null : summarizeCommandFailure(probe)
  };
}

function run(executable, runArgs, options = {}) {
  const started = Date.now();
  const output = cp.spawnSync(executable, runArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
    timeout: options.timeout ?? 10000
  });
  return {
    status: output.status,
    signal: output.signal,
    stdout: output.stdout ?? '',
    stderr: output.stderr ?? '',
    durationMs: Date.now() - started,
    error: output.error?.message ?? null
  };
}

function summarizeCommandFailure(output) {
  return {
    status: output.status,
    signal: output.signal,
    error: output.error ? redactLine(output.error) : null,
    stderr: redactLine(output.stderr).slice(0, 500),
    stdout: redactLine(output.stdout).slice(0, 500),
    durationMs: output.durationMs
  };
}

function summarizeResponse(response) {
  if (!response) {
    return { received: false };
  }
  const resultValue = response.result ?? response;
  const resultKeys = resultValue && typeof resultValue === 'object'
    ? Object.keys(resultValue).filter((key) => key !== 'codexHome').sort()
    : [];
  return {
    received: true,
    id: response.id ?? null,
    hasResult: Boolean(response.result ?? response.thread ?? response.turn),
    hasError: Boolean(response.error),
    errorCode: response.error?.code ?? null,
    errorMessage: response.error?.message ? redactLine(response.error.message) : null,
    resultKeys,
    threadIdReceived: Boolean(response.result?.thread?.id ?? response.thread?.id),
    turnIdReceived: Boolean(response.result?.turn?.id ?? response.turn?.id)
  };
}

function countFiles(directory) {
  if (!fs.existsSync(directory)) {
    return 0;
  }
  let count = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const child = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      count += countFiles(child);
    } else if (entry.isFile()) {
      count += 1;
    }
  }
  return count;
}

function redactLine(value) {
  return String(value ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/C:\\\\Users\\\\[^\\\\"]+/gi, '%USERPROFILE%')
    .replace(/C:\\Users\\[^\\"]+/gi, '%USERPROFILE%')
    .replace(/(__cf_chl_[A-Za-z_]+)=([^&"\\]+)/gi, '$1=[redacted]')
    .replace(/(cH|cRay|cUPMDTk|fa|md|mdrd):\s*'[^']+'/g, "$1:'[redacted]'")
    .replace(/(token|password|secret|authorization)(=|:)\S+/gi, '$1$2[redacted]')
    .replace(/[A-Fa-f0-9]{32,}/g, '[hex-redacted]');
}
