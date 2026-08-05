// Scratch diagnostic (2026-08-04): the trina test fixture under the refill default —
// prints the rotation log + cast/FB counts to locate the chain collapse. Read-only.
import { runComp } from '../tests/lib/harness.js';
import type { SimEvent } from '../../src/types.js';

const events: SimEvent[] = [];
const res = runComp({
  slugs: ['moran', 'liter', 'trina', 'scarlet', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'trina',
  cfg: { onEvent: (e) => events.push(e) },
});
console.log(`fullBursts=${res.fullBursts}`);
for (const e of events) {
  if (e.kind === 'burstCast' && e.slug === 'trina') {
    console.log(`trina cast @ ${e.sec.toFixed(2)}s`);
  }
}
for (const e of events) {
  if (e.kind === 'fullBurstStart') {
    console.log(`FB start   @ ${e.sec.toFixed(2)}s`);
  }
}
for (const e of events) {
  if (e.kind === 'burstCast' && e.sec > 174) {
    console.log(`late cast: ${e.slug} @ ${e.sec.toFixed(2)}s stage=${e.stage}`);
  }
}
