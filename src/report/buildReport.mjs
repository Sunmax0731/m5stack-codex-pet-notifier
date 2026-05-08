export function buildReport(productProfile, suiteResult) {
  const scenarioIds = suiteResult.scenarios.map((scenario) => scenario.id);
  const totals = suiteResult.scenarios.reduce(
    (acc, scenario) => {
      acc.validEvents += scenario.validEvents;
      acc.invalidEvents += scenario.invalidEvents;
      acc.warnings += scenario.warningCount;
      acc.replies += scenario.replyCount;
      acc.interactions += scenario.interactionCount;
      acc.heartbeats += scenario.heartbeatCount;
      return acc;
    },
    { validEvents: 0, invalidEvents: 0, warnings: 0, replies: 0, interactions: 0, heartbeats: 0 }
  );

  return {
    product: productProfile.repo,
    version: productProfile.version,
    suiteStatus: suiteResult.status,
    scenarioIds,
    totals,
    runtimeGateSignals: productProfile.requiredRuntimeSignals
  };
}
