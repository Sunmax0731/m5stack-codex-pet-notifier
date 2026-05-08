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
assert(releaseNotes.includes('手動テストはCodexでは未実施'), 'release notes must state manual tests are not run by Codex');

if (releaseEvidence.releaseStatus === 'created') {
  assert(releaseEvidence.prerelease === true, 'release evidence must confirm prerelease=true');
  assert(releaseEvidence.latest === false, 'release evidence must confirm latest=false');
  assert(releaseEvidence.assetCount >= 3, 'release evidence must confirm at least 3 assets');
} else {
  assert(releaseEvidence.releaseStatus === 'pending', 'release evidence must be pending or created');
  assert(releaseEvidence.isPrereleasePlanned === true, 'pending release evidence must plan prerelease');
}

console.log(`closed alpha guard passed for ${productProfile.repo}`);
