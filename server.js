// Hostinger entry point
import { execSync } from 'child_process';
import { existsSync } from 'fs';

const distPath = './packages/backend/dist/index.js';

// Auto-build si dist/ n'existe pas (fresh deploy sans DEPLOY_TARGET=backend)
if (!existsSync(distPath)) {
  console.log('[server] dist/ introuvable — build en cours...');
  try {
    execSync('npm install --prefix packages/backend --omit=dev', { stdio: 'inherit' });
    execSync('npm run build --prefix packages/backend', { stdio: 'inherit' });
    console.log('[server] Build terminé.');
  } catch (err) {
    console.error('[server] Build échoué :', err.message);
    process.exit(1);
  }
}

import(distPath).catch((err) => {
  console.error('[server] Impossible de démarrer :', err);
  process.exit(1);
});
