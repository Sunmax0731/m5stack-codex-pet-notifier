import { adapterReadiness, appServerAdapterProfile } from './appServerAdapter.mjs';

export function codexAdapterCatalog(options = {}) {
  return [
    {
      id: 'local-session-jsonl',
      label: 'Local Codex session JSONL',
      status: 'implemented',
      publicInterfaceOnly: false,
      privateApiScraping: false,
      source: '%USERPROFILE%\\.codex\\sessions',
      bodyPersistence: 'session body is read locally and not written to release evidence'
    },
    {
      id: 'codex-hook-relay',
      label: 'Codex Hooks one-shot relay',
      status: 'implemented',
      publicInterfaceOnly: true,
      privateApiScraping: false,
      source: 'Codex hook command execution',
      bodyPersistence: 'hook state stores only a body signature'
    },
    {
      ...appServerAdapterProfile,
      status: 'prepared',
      readiness: adapterReadiness(options.appServer ?? {})
    }
  ];
}

export function summarizeAdapterReview(options = {}) {
  const adapters = codexAdapterCatalog(options);
  return {
    ok: adapters.every((adapter) => adapter.privateApiScraping === false),
    publicApiWorkstream: adapters.find((adapter) => adapter.id === 'codex-app-server')?.readiness ?? null,
    implementedAdapters: adapters.filter((adapter) => adapter.status === 'implemented').map((adapter) => adapter.id),
    preparedAdapters: adapters.filter((adapter) => adapter.status === 'prepared').map((adapter) => adapter.id),
    findings: [
      'Keep local session JSONL and hook relay as supported fallback adapters.',
      'Use codex app-server as the first public Codex App integration target.',
      'Do not add private Codex App scraping paths.',
      'Require loopback or authenticated WebSocket if app-server WebSocket mode is used.'
    ],
    adapters
  };
}
