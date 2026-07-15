// Boss Iron — scope-lock test runner. The ONLY thing that differs from the other
// scripts/sim/*.ts is this element. All fixed args come from the scope-lock SSOT.
//   npx tsx scripts/sim/iron.ts <slug> [slug...]
import { runScopeLock } from './run.js';
runScopeLock('Iron', process.argv.slice(2));
