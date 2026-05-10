import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { productProfile } from '../src/core/product-profile.mjs';

const repoRoot = process.cwd();
const args = new Set(process.argv.slice(2));
const rawArgs = process.argv.slice(2);
const strict = args.has('--strict');
const includeTurn = args.has('--include-turn');
const includeLongRun = args.has('--include-long-run');
const skipWifiInterruption = args.has('--skip-wifi-interruption');
const skipNpmTest = args.has('--skip-npm-test');
const resultPath = path.join(repoRoot, 'dist', 'formal-release-automation-result.json');
const docsResultPath = path.join(repoRoot, 'docs', 'formal-release-automation-result.json');

const result = {
  product: productProfile.repo,
  version: productProfile.version,
  generatedAt: new Date().toISOString(),
  status: 'running',
  scope: {
    releaseTarget: 'Core2',
    grayHardware: 'out-of-scope',
    grayImu: 'out-of-scope',
    multipleM5Stack: 'future-update'
  },
  steps: [],
  gates: {
    baselineAutomation: 'pending',
    longRun: 'pending',
    signedInstaller: 'pending',
    codexAppServer: 'pending'
  },
  evidence: {
    longRun: null,
    signedInstaller: null,
    codexAppServer: null
  },
  manualToAutomationPolicy: [
    'Codex側で実行可能な検証は npm script と JSON evidence に寄せる。',
    'Core2 実機、署名証明書、Codex account/model access は外部前提として残し、実行結果だけを自動収集する。',
    'Wi-Fi AP停止 / 復帰は実施指示がある場合だけ LR-02 として扱い、今回の Core2 soak gate には含めない。',
    '回答本文、token、PFX password、SSID、host IP は evidence に保存しない。'
  ],
  nextActions: []
};

try {
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  if (!skipNpmTest) {
    const npmTest = runNpm(['test'], { timeout: 240000 });
    result.steps.push(step('npm test', npmTest));
    result.gates.baselineAutomation = npmTest.status === 0 ? 'passed' : 'failed';
  } else {
    result.steps.push({ name: 'npm test', status: 'skipped' });
    result.gates.baselineAutomation = 'skipped';
  }

  if (includeLongRun) {
    const longRunMinutes = Number(argValue('--long-run-min', '480'));
    const soakArgs = ['run', 'core2:soak', '--', `--duration-min=${longRunMinutes}`];
    if (skipWifiInterruption) {
      soakArgs.push('--skip-wifi-interruption');
    }
    const longRun = runNpm(soakArgs, { timeout: (longRunMinutes * 60_000) + 120_000 });
    result.steps.push(step('core2:soak', longRun));
    result.evidence.longRun = readJson(path.join(repoRoot, 'dist', 'core2-soak-result.json'));
  } else {
    result.steps.push({ name: 'core2:soak', status: 'evidence-read' });
    result.evidence.longRun = readJson(path.join(repoRoot, 'docs', 'core2-soak-result.json'));
  }
  result.gates.longRun = longRunGate(result.evidence.longRun);

  const installer = runNpm(['run', 'installer:signed:pipeline'], { timeout: 240000 });
  result.steps.push(step('installer:signed:pipeline', installer));
  result.evidence.signedInstaller = readJson(path.join(repoRoot, 'dist', 'signed-installer-pipeline-result.json'));
  result.gates.signedInstaller = signedInstallerGate(result.evidence.signedInstaller);

  const probeArgs = ['run', 'codex:app-server:probe'];
  if (includeTurn) {
    probeArgs.push('--', '--include-turn');
  }
  const appServer = runNpm(probeArgs, { timeout: includeTurn ? 120000 : 60000 });
  result.steps.push(step(includeTurn ? 'codex:app-server:probe --include-turn' : 'codex:app-server:probe', appServer));
  result.evidence.codexAppServer = readJson(path.join(repoRoot, 'dist', 'codex-app-server-runtime-probe-result.json'));
  result.gates.codexAppServer = codexAppServerGate(result.evidence.codexAppServer, includeTurn);

  result.nextActions = buildNextActions();
  result.status = Object.values(result.gates).every((gate) => gate === 'passed' || gate === 'skipped') ? 'passed' : 'partial';
} catch (error) {
  result.status = 'blocked';
  result.error = redact(error.message);
  result.nextActions.push('失敗した step の JSON evidence と stderr 要約を確認し、同じコマンドを再実行する。');
} finally {
  fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  fs.writeFileSync(docsResultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(result, null, 2));
  if (strict && result.status !== 'passed') {
    process.exit(1);
  }
}

function signedInstallerGate(evidence) {
  if (!evidence) {
    return 'failed';
  }
  if (evidence.status !== 'passed') {
    return 'environment-required';
  }
  if (!evidence.signEnabled) {
    return 'signing-not-run';
  }
  return 'passed';
}

function longRunGate(evidence) {
  if (!evidence) {
    return 'external-device-required';
  }
  if (evidence.status !== 'passed') {
    return evidence.status === 'running' ? 'running' : 'external-device-required';
  }
  if (evidence.scope?.releaseTarget !== 'Core2') {
    return 'failed';
  }
  if (evidence.checks?.heartbeatObserved !== true || evidence.checks?.latestHeartbeatFresh !== true) {
    return 'failed';
  }
  if (evidence.checks?.noStaleDeviceAtEnd !== true || evidence.checks?.droppedEventsWithinLimit !== true) {
    return 'failed';
  }
  return 'passed';
}

function codexAppServerGate(evidence, turnRequired) {
  if (!evidence) {
    return 'failed';
  }
  if (turnRequired) {
    return evidence.status === 'passed' ? 'passed' : 'environment-required';
  }
  return evidence.status === 'partial' || evidence.status === 'passed' ? 'probe-ready' : 'environment-required';
}

function buildNextActions() {
  const actions = [];
  if (result.gates.longRun !== 'passed') {
    actions.push('Core2 を接続した soak を `npm run core2:soak -- --duration-min=480 --skip-wifi-interruption` で実行し、heartbeat / droppedEvents / stale を JSON evidence に保存する。');
  }
  if (result.gates.signedInstaller !== 'passed') {
    actions.push('WiX / Windows SDK / 署名証明書を用意し、`npm run installer:signed:pipeline -- --sign` を実行する。');
  }
  if (result.gates.codexAppServer !== 'passed') {
    actions.push('正式 API-01 では `npm run codex:app-server:probe -- --include-turn` を実行し、turn/start 成功を証跡化する。');
  }
  return actions;
}

function argValue(name, fallback) {
  const inline = rawArgs.find((arg) => arg.startsWith(`${name}=`));
  if (inline) {
    return inline.slice(name.length + 1);
  }
  const index = rawArgs.indexOf(name);
  if (index >= 0 && rawArgs[index + 1] && !rawArgs[index + 1].startsWith('--')) {
    return rawArgs[index + 1];
  }
  return fallback;
}

function runNpm(npmArgs, options = {}) {
  if (process.platform === 'win32') {
    return run('cmd.exe', ['/d', '/s', '/c', ['npm', ...npmArgs].join(' ')], options);
  }
  return run('npm', npmArgs, options);
}

function run(command, runArgs, options = {}) {
  const started = Date.now();
  const output = cp.spawnSync(command, runArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
    timeout: options.timeout ?? 60000
  });
  return {
    status: output.status,
    signal: output.signal,
    stdout: redact(output.stdout ?? '').slice(0, 1000),
    stderr: redact(output.stderr ?? '').slice(0, 1000),
    error: output.error?.message ? redact(output.error.message) : null,
    durationMs: Date.now() - started
  };
}

function step(name, output) {
  return {
    name,
    status: output.status === 0 ? 'passed' : 'failed',
    exitCode: output.status,
    signal: output.signal,
    durationMs: output.durationMs,
    stderr: output.stderr,
    error: output.error
  };
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function redact(value) {
  return String(value ?? '')
    .replace(/(token|password|secret|authorization)(=|:)\S+/gi, '$1$2[redacted]')
    .replace(/[A-Fa-f0-9]{32,}/g, '[hex-redacted]');
}
