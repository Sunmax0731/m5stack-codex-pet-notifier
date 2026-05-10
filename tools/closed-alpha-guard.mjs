import fs from 'node:fs';
import { productProfile } from '../src/core/product-profile.mjs';
import { allowedGrades, enforceManualTestCap } from '../src/review-model/qcdsModel.mjs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const metrics = JSON.parse(fs.readFileSync('docs/qcds-strict-metrics.json', 'utf8'));
const releaseEvidence = JSON.parse(fs.readFileSync('docs/release-evidence.json', 'utf8'));
const releaseNotes = fs.readFileSync(`docs/releases/${productProfile.tag}.md`, 'utf8');
const runtimeGate = JSON.parse(fs.readFileSync('docs/platform-runtime-gate.json', 'utf8'));

enforceManualTestCap(metrics);
assert(JSON.stringify(metrics.gradingScale ?? metrics.gradeScale).includes(allowedGrades[0]), 'grading scale is missing');
assert(runtimeGate.pass === true, 'platform runtime gate must pass');
assert(releaseNotes.includes('ユーザーが動作を確認'), 'release notes must include the user manual confirmation result');
assert(releaseNotes.includes('GRAY 実機') && releaseNotes.includes('長時間運用'), 'release notes must state remaining beta manual-test risks');

if (releaseEvidence.releaseStatus === 'created') {
  assert(releaseEvidence.prerelease === true, 'release evidence must confirm prerelease=true');
  assert(releaseEvidence.latest === false, 'release evidence must confirm latest=false');
  assert(releaseEvidence.assetCount >= 3, 'release evidence must confirm at least 3 assets');
} else {
  assert(releaseEvidence.releaseStatus === 'pending', 'release evidence must be pending or created');
  assert(releaseEvidence.isPrereleasePlanned === true, 'pending release evidence must plan prerelease');
}

console.log(`release guard passed for ${productProfile.repo}`);
