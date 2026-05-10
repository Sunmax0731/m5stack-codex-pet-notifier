import fs from 'node:fs';
import { summarizeAdapterReview } from '../src/codex-adapter/adapterRegistry.mjs';
import { productProfile } from '../src/core/product-profile.mjs';

const review = {
  product: productProfile.repo,
  version: productProfile.version,
  status: 'passed',
  ...summarizeAdapterReview({
    appServer: {
      listen: process.env.CODEX_APP_SERVER_LISTEN ?? 'stdio://',
      wsAuth: process.env.CODEX_APP_SERVER_WS_AUTH ?? ''
    }
  })
};

fs.mkdirSync('dist', { recursive: true });
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('dist/adapter-review-result.json', `${JSON.stringify(review, null, 2)}\n`);
fs.writeFileSync('docs/adapter-review-result.json', `${JSON.stringify(review, null, 2)}\n`);
console.log(`adapter review passed for ${productProfile.repo}`);
