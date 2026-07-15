// Forced NEUTRAL boss ("none") — scope-lock test runner. No element advantage for anyone.
//   npx tsx scripts/sim/neutral.ts <slug> [slug...]
import { runScopeLock } from './run.js';
runScopeLock(null, process.argv.slice(2));
