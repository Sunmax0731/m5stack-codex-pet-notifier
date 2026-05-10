import cp from 'node:child_process';
import fs from 'node:fs';
import { productProfile } from '../src/core/product-profile.mjs';

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

const tools = {
  signtool: commandExists('signtool.exe'),
  makeappx: commandExists('makeappx.exe'),
  makepri: commandExists('makepri.exe'),
  wix: commandExists('wix.exe')
};

const result = {
  product: productProfile.repo,
  version: productProfile.version,
  status: 'prepared',
  targetFormats: ['MSI', 'MSIX'],
  signingCertificate: {
    thumbprintEnv: 'WINDOWS_SIGNING_CERT_THUMBPRINT',
    pfxPathEnv: 'WINDOWS_SIGNING_PFX_PATH',
    pfxPasswordEnv: 'WINDOWS_SIGNING_PFX_PASSWORD',
    configured: Boolean(process.env.WINDOWS_SIGNING_CERT_THUMBPRINT || process.env.WINDOWS_SIGNING_PFX_PATH)
  },
  tools,
  readyForSignedMsi: tools.signtool.available && tools.wix.available,
  readyForSignedMsix: tools.signtool.available && tools.makeappx.available && tools.makepri.available,
  nextActions: [
    'Install WiX Toolset under E:\\DevEnv if MSI packaging is required.',
    'Use Windows SDK signtool.exe and makeappx.exe from an E:\\DevEnv-managed Windows SDK path or an existing Visual Studio SDK install.',
    'Provide either WINDOWS_SIGNING_CERT_THUMBPRINT or WINDOWS_SIGNING_PFX_PATH plus WINDOWS_SIGNING_PFX_PASSWORD before signing.',
    'Do not commit certificates, PFX files, passwords, tokens, host IPs, Wi-Fi settings, or session bodies.'
  ]
};

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/windows-signing-readiness.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
