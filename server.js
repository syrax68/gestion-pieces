// Hostinger entry point
import('./packages/backend/dist/index.js').catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
