import fs from 'node:fs';
import { productProfile } from '../core/product-profile.mjs';
import { runSuite } from '../core/scenario-runner.mjs';

const command = process.argv[2] ?? 'demo';

if (command === 'demo') {
  const suite = JSON.parse(fs.readFileSync('samples/representative-suite.json', 'utf8'));
  const result = runSuite({ ...suite, scenarios: suite.scenarios.filter((scenario) => scenario.id === 'happy-path') });
  console.log(JSON.stringify({
    product: productProfile.repo,
    demo: 'happy-path',
    status: result.status,
    scenario: result.scenarios[0]
  }, null, 2));
} else {
  console.error(`unknown command: ${command}`);
  process.exit(1);
}
