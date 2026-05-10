import cp from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { productProfile } from '../src/core/product-profile.mjs';

const repoRoot = process.cwd();
const cliArgs = new Set(process.argv.slice(2));
const strict = cliArgs.has('--strict');
const signEnabled = cliArgs.has('--sign') || process.env.WINDOWS_SIGNING_ENABLE === '1';
const allowPfxPasswordArg = cliArgs.has('--allow-pfx-password-arg');
const formats = cliArgs.has('--msi-only')
  ? ['msi']
  : cliArgs.has('--msix-only')
    ? ['msix']
    : ['msi', 'msix'];
const distDir = path.join(repoRoot, 'dist');
const packageStageDir = path.join(distDir, `${productProfile.repo}-windows-installer`);
const workDir = path.join(distDir, 'signed-installer-work');
const resultPath = path.join(distDir, 'signed-installer-pipeline-result.json');
const docsResultPath = path.join(repoRoot, 'docs', 'signed-installer-pipeline-result.json');
const timestampUrl = process.env.WINDOWS_SIGNING_TIMESTAMP_URL ?? 'http://timestamp.digicert.com';
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  }
  return value >>> 0;
});

const result = {
  product: productProfile.repo,
  version: productProfile.version,
  generatedAt: new Date().toISOString(),
  status: 'prepared',
  formats,
  signEnabled,
  signing: {
    timestampUrlConfigured: Boolean(process.env.WINDOWS_SIGNING_TIMESTAMP_URL),
    thumbprintConfigured: Boolean(process.env.WINDOWS_SIGNING_CERT_THUMBPRINT),
    pfxPathConfigured: Boolean(process.env.WINDOWS_SIGNING_PFX_PATH),
    pfxPasswordConfigured: Boolean(process.env.WINDOWS_SIGNING_PFX_PASSWORD),
    pfxPasswordArgAllowed: allowPfxPasswordArg,
    secretsPersisted: false
  },
  tools: {
    signtool: commandExists('signtool.exe'),
    wix: commandExists('wix.exe'),
    makeappx: commandExists('makeappx.exe'),
    makepri: commandExists('makepri.exe')
  },
  packageStage: null,
  artifacts: {
    msi: null,
    msix: null
  },
  nextActions: []
};

fs.mkdirSync(distDir, { recursive: true });
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(workDir, { recursive: true });

try {
  if (!cliArgs.has('--skip-package')) {
    const packageRun = run(process.execPath, ['tools/package-beta.mjs'], { timeout: 120000 });
    result.packageStage = {
      ok: packageRun.status === 0,
      stageDir: relative(packageStageDir),
      durationMs: packageRun.durationMs,
      error: packageRun.status === 0 ? null : summarizeFailure(packageRun)
    };
    if (packageRun.status !== 0) {
      result.status = 'blocked';
      result.nextActions.push('Fix installer ZIP packaging before generating MSI/MSIX payloads.');
      finish();
    }
  } else {
    result.packageStage = {
      ok: fs.existsSync(packageStageDir),
      stageDir: relative(packageStageDir),
      skipped: true
    };
  }

  if (!fs.existsSync(packageStageDir)) {
    result.status = 'blocked';
    result.nextActions.push('Run `cmd.exe /d /s /c npm run installer:package` before the signed installer pipeline.');
    finish();
  }

  if (formats.includes('msi')) {
    result.artifacts.msi = prepareMsi();
  }
  if (formats.includes('msix')) {
    result.artifacts.msix = prepareMsix();
  }

  for (const format of formats) {
    const artifact = result.artifacts[format];
    if (!artifact?.unsignedPath) {
      continue;
    }
    artifact.signing = signArtifact(artifact.unsignedPath, format);
  }

  const prepared = formats.every((format) => {
    const artifact = result.artifacts[format];
    return artifact?.unsignedPath || artifact?.sourcePath || artifact?.payloadDir;
  });
  const unsignedGenerated = formats.every((format) => Boolean(result.artifacts[format]?.unsignedPath));
  const signedIfRequested = signEnabled && formats.every((format) => result.artifacts[format]?.signing?.status === 'signed');
  result.status = signEnabled
    ? (unsignedGenerated && signedIfRequested ? 'passed' : 'prepared')
    : (prepared ? 'prepared' : 'blocked');
  if (signEnabled && !signedIfRequested) {
    result.nextActions.push('Provide Windows SDK signing tools and a cert-store thumbprint, then rerun with `--sign`.');
  }
} catch (error) {
  result.status = 'blocked';
  result.error = redact(error.message);
  result.nextActions.push('Fix the pipeline blocker and rerun `cmd.exe /d /s /c npm run installer:signed:pipeline`.');
} finally {
  finish();
}

function prepareMsi() {
  const msiDir = path.join(workDir, 'msi');
  fs.mkdirSync(msiDir, { recursive: true });
  const sourcePath = path.join(msiDir, 'Product.generated.wxs');
  const unsignedPath = path.join(distDir, `${productProfile.repo}-${productProfile.tag}-unsigned.msi`);
  generateWixSource(packageStageDir, sourcePath);
  const artifact = {
    format: 'MSI',
    sourcePath: relative(sourcePath),
    unsignedPath: null,
    tool: 'wix.exe',
    build: null
  };
  if (!result.tools.wix.available) {
    artifact.build = { status: 'skipped', reason: 'wix.exe-not-found' };
    result.nextActions.push('Install WiX Toolset under E:\\DevEnv, or expose an existing wix.exe on PATH.');
    return artifact;
  }
  const build = run(result.tools.wix.paths[0], ['build', sourcePath, '-o', unsignedPath], { timeout: 180000 });
  artifact.build = summarizeRun(build);
  if (build.status === 0 && fs.existsSync(unsignedPath)) {
    artifact.unsignedPath = relative(unsignedPath);
    artifact.unsignedBytes = fs.statSync(unsignedPath).size;
  } else {
    artifact.build.error = summarizeFailure(build);
    result.nextActions.push('Review generated WiX source and WiX build output before signing the MSI.');
  }
  return artifact;
}

function prepareMsix() {
  const msixDir = path.join(workDir, 'msix');
  const payloadDir = path.join(msixDir, 'payload');
  const unsignedPath = path.join(distDir, `${productProfile.repo}-${productProfile.tag}-unsigned.msix`);
  fs.mkdirSync(payloadDir, { recursive: true });
  copyFiltered(packageStageDir, payloadDir);
  writeMsixManifest(payloadDir);
  writeMsixAssets(path.join(payloadDir, 'Assets'));
  const artifact = {
    format: 'MSIX',
    payloadDir: relative(payloadDir),
    unsignedPath: null,
    tool: 'makeappx.exe',
    build: null
  };
  if (!result.tools.makeappx.available) {
    artifact.build = { status: 'skipped', reason: 'makeappx.exe-not-found' };
    result.nextActions.push('Install or expose Windows SDK makeappx.exe before producing MSIX.');
    return artifact;
  }
  const build = run(result.tools.makeappx.paths[0], ['pack', '/d', payloadDir, '/p', unsignedPath, '/o'], { timeout: 180000 });
  artifact.build = summarizeRun(build);
  if (build.status === 0 && fs.existsSync(unsignedPath)) {
    artifact.unsignedPath = relative(unsignedPath);
    artifact.unsignedBytes = fs.statSync(unsignedPath).size;
  } else {
    artifact.build.error = summarizeFailure(build);
    result.nextActions.push('Review Package.appxmanifest, MSIX assets, and makeappx output before signing the MSIX.');
  }
  return artifact;
}

function signArtifact(relativeArtifactPath, format) {
  const artifactPath = path.join(repoRoot, relativeArtifactPath);
  const signing = {
    format: format.toUpperCase(),
    status: 'skipped',
    verifyStatus: 'skipped',
    signedPath: relativeArtifactPath
  };
  if (!signEnabled) {
    signing.reason = 'signing-not-enabled';
    return signing;
  }
  if (!result.tools.signtool.available) {
    signing.status = 'blocked';
    signing.reason = 'signtool.exe-not-found';
    result.nextActions.push('Expose Windows SDK signtool.exe on PATH before signing artifacts.');
    return signing;
  }

  const signArgs = ['sign', '/fd', 'SHA256', '/td', 'SHA256', '/tr', timestampUrl];
  if (process.env.WINDOWS_SIGNING_CERT_THUMBPRINT) {
    signArgs.push('/sha1', process.env.WINDOWS_SIGNING_CERT_THUMBPRINT);
  } else if (process.env.WINDOWS_SIGNING_PFX_PATH && process.env.WINDOWS_SIGNING_PFX_PASSWORD && allowPfxPasswordArg) {
    signArgs.push('/f', process.env.WINDOWS_SIGNING_PFX_PATH, '/p', process.env.WINDOWS_SIGNING_PFX_PASSWORD);
  } else if (process.env.WINDOWS_SIGNING_PFX_PATH && process.env.WINDOWS_SIGNING_PFX_PASSWORD) {
    signing.status = 'blocked';
    signing.reason = 'pfx-password-command-line-disabled';
    result.nextActions.push('Import the PFX into the Windows certificate store and use WINDOWS_SIGNING_CERT_THUMBPRINT for CI-safe signing.');
    return signing;
  } else {
    signing.status = 'blocked';
    signing.reason = 'signing-certificate-not-configured';
    result.nextActions.push('Set WINDOWS_SIGNING_CERT_THUMBPRINT for cert-store signing.');
    return signing;
  }
  signArgs.push(artifactPath);

  const signRun = run(result.tools.signtool.paths[0], signArgs, { timeout: 120000, redactSecrets: true });
  signing.sign = summarizeRun(signRun);
  if (signRun.status !== 0) {
    signing.status = 'failed';
    signing.error = summarizeFailure(signRun);
    return signing;
  }
  signing.status = 'signed';

  const verifyRun = run(result.tools.signtool.paths[0], ['verify', '/pa', '/v', artifactPath], { timeout: 120000 });
  signing.verify = summarizeRun(verifyRun);
  signing.verifyStatus = verifyRun.status === 0 ? 'passed' : 'failed';
  if (verifyRun.status !== 0) {
    signing.status = 'failed';
    signing.error = summarizeFailure(verifyRun);
  }
  return signing;
}

function generateWixSource(stageDir, outputPath) {
  const componentRefs = [];
  const installTree = renderWixDirectory(stageDir, 'INSTALLFOLDER', componentRefs);
  const wxs = `<?xml version="1.0" encoding="UTF-8"?>\n<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">\n  <Package Name="M5Stack Codex Pet Notifier" Manufacturer="Sunmax0731" Version="${msiVersion(productProfile.version)}" UpgradeCode="${guidFromString(`${productProfile.repo}:upgrade-code`)}" Scope="perUser">\n    <MajorUpgrade DowngradeErrorMessage="A newer version of M5Stack Codex Pet Notifier is already installed." />\n    <MediaTemplate EmbedCab="yes" />\n    <StandardDirectory Id="LocalAppDataFolder">\n${indent(installTree, 6)}\n    </StandardDirectory>\n    <Feature Id="Main" Title="M5Stack Codex Pet Notifier" Level="1">\n      <ComponentGroupRef Id="ProductComponents" />\n    </Feature>\n    <ComponentGroup Id="ProductComponents">\n${componentRefs.map((id) => `      <ComponentRef Id="${id}" />`).join('\n')}\n    </ComponentGroup>\n  </Package>\n</Wix>\n`;
  fs.writeFileSync(outputPath, wxs, 'utf8');
}

function renderWixDirectory(directory, directoryId, componentRefs) {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.name !== '.DS_Store')
    .sort((a, b) => a.name.localeCompare(b.name));
  const directoryName = path.basename(directory);
  const childXml = [];
  for (const entry of entries) {
    const childPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      childXml.push(renderWixDirectory(childPath, safeId('D', childPath), componentRefs));
    } else if (entry.isFile()) {
      const componentId = safeId('C', childPath);
      const fileId = safeId('F', childPath);
      componentRefs.push(componentId);
      childXml.push(`  <Component Id="${componentId}" Guid="${guidFromString(childPath)}">\n    <File Id="${fileId}" Source="${xmlEscape(childPath)}" KeyPath="yes" />\n  </Component>`);
    }
  }
  return `<Directory Id="${directoryId}" Name="${xmlEscape(directoryName)}">\n${indent(childXml.join('\n'), 2)}\n</Directory>`;
}

function writeMsixManifest(payloadDir) {
  const templatePath = path.join(repoRoot, 'installer', 'msix', 'Package.appxmanifest');
  let manifest = fs.readFileSync(templatePath, 'utf8');
  manifest = manifest
    .replace(/Version="[^"]+"/, `Version="${msixVersion(productProfile.version)}"`)
    .replace(/Publisher="[^"]+"/, `Publisher="${xmlEscape(process.env.WINDOWS_MSIX_PUBLISHER ?? 'CN=Sunmax0731')}"`);
  fs.writeFileSync(path.join(payloadDir, 'AppxManifest.xml'), manifest, 'utf8');
}

function writeMsixAssets(assetDir) {
  fs.mkdirSync(assetDir, { recursive: true });
  fs.writeFileSync(path.join(assetDir, 'StoreLogo.png'), createPng(50, 50, [24, 38, 68, 255]));
  fs.writeFileSync(path.join(assetDir, 'Square44x44Logo.png'), createPng(44, 44, [24, 38, 68, 255]));
  fs.writeFileSync(path.join(assetDir, 'Square150x150Logo.png'), createPng(150, 150, [24, 38, 68, 255]));
}

function createPng(width, height, rgba) {
  const stride = 1 + width * 4;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = row + 1 + x * 4;
      raw[offset] = rgba[0];
      raw[offset + 1] = rgba[1];
      raw[offset + 2] = rgba[2];
      raw[offset + 3] = rgba[3];
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', Buffer.concat([u32(width), u32(height), Buffer.from([8, 6, 0, 0, 0])])),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuffer, data]);
  return Buffer.concat([
    u32(data.length),
    typeBuffer,
    data,
    u32(crc32(crcInput))
  ]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function copyFiltered(source, destination) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const child of fs.readdirSync(source)) {
      copyFiltered(path.join(source, child), path.join(destination, child));
    }
    return;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function commandExists(command) {
  const probe = cp.spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', [command], {
    encoding: 'utf8',
    windowsHide: true
  });
  return {
    available: probe.status === 0,
    command,
    paths: probe.status === 0
      ? probe.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      : []
  };
}

function run(executable, runArgs, options = {}) {
  const started = Date.now();
  const output = cp.spawnSync(executable, runArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
    timeout: options.timeout ?? 60000
  });
  return {
    status: output.status,
    signal: output.signal,
    stdout: options.redactSecrets ? redact(output.stdout) : output.stdout ?? '',
    stderr: options.redactSecrets ? redact(output.stderr) : output.stderr ?? '',
    error: output.error?.message ?? null,
    durationMs: Date.now() - started
  };
}

function summarizeRun(output) {
  return {
    status: output.status === 0 ? 'passed' : 'failed',
    exitCode: output.status,
    signal: output.signal,
    durationMs: output.durationMs
  };
}

function summarizeFailure(output) {
  return {
    exitCode: output.status,
    signal: output.signal,
    error: output.error ? redact(output.error) : null,
    stderr: redact(output.stderr).slice(0, 800),
    stdout: redact(output.stdout).slice(0, 800),
    durationMs: output.durationMs
  };
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

function relative(targetPath) {
  return path.relative(repoRoot, targetPath).replace(/\\/g, '/');
}

function safeId(prefix, value) {
  return `${prefix}_${crypto.createHash('sha1').update(path.relative(repoRoot, value)).digest('hex').slice(0, 28)}`;
}

function guidFromString(value) {
  const hash = crypto.createHash('sha1').update(value).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString('hex').slice(0, 32);
  return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}}`;
}

function msiVersion(version) {
  const parts = version.split(/[.-]/).filter((part) => /^\d+$/.test(part)).slice(0, 3);
  while (parts.length < 3) {
    parts.push('0');
  }
  return parts.join('.');
}

function msixVersion(version) {
  const parts = version.split(/[.-]/).filter((part) => /^\d+$/.test(part)).slice(0, 4);
  while (parts.length < 4) {
    parts.push('0');
  }
  return parts.join('.');
}

function indent(value, spaces) {
  const prefix = ' '.repeat(spaces);
  return value.split('\n').map((line) => `${prefix}${line}`).join('\n');
}

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function redact(value) {
  let text = String(value ?? '');
  if (process.env.WINDOWS_SIGNING_PFX_PASSWORD) {
    text = text.replace(new RegExp(escapeRegExp(process.env.WINDOWS_SIGNING_PFX_PASSWORD), 'g'), '[pfx-password]');
  }
  return text
    .replace(/(token|password|secret|authorization)(=|:)\S+/gi, '$1$2[redacted]')
    .replace(/[A-Fa-f0-9]{32,}/g, '[hex-redacted]');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
