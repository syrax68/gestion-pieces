// Hostinger entry point (CommonJS - root package.json has no "type": "module")
const { existsSync } = require('fs');

const distPath = './packages/backend/dist/index.js';

if (!existsSync(distPath)) {
  console.error('[server] dist/ introuvable. Le build doit avoir echoue.');
  process.exit(1);
}

import(distPath).catch((err) => {
  console.error('[server] Impossible de demarrer :', err);
  process.exit(1);
});
