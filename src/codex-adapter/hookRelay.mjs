import { fileURLToPath } from 'node:url';
import { defaultHookStateFile, runSessionWatcherCli } from './sessionWatcher.mjs';

export async function runHookRelayCli(argv = process.argv.slice(2), options = {}) {
  const phase = process.env.CODEX_M5STACK_HOOK_PHASE ?? 'any';
  const args = [
    '--once',
    '--phase',
    phase,
    '--state-file',
    process.env.CODEX_M5STACK_HOOK_STATE ?? defaultHookStateFile(),
    ...argv
  ];
  return runSessionWatcherCli(args, options);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runHookRelayCli(process.argv.slice(2), { stdout: process.stdout, stderr: process.stderr })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
