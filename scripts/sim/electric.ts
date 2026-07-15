// Boss Electric — scope-lock test runner. The ONLY thing that differs from the other
// scripts/sim/*.ts is this element. All fixed args come from the scope-lock SSOT.
//   npx tsx scripts/sim/electric.ts <slug> [slug...]
import { runScopeLock } from './run.js';
runScopeLock('Electric', process.argv.slice(2));
