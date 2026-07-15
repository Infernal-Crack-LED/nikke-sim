// DoT-crit test — does a unit's DoT / function-damage rider CRIT in reality?
//
//   npx tsx scripts/probe/dot-crit.ts <parsed-slug> [kind] [expectedNonCrit]
//   e.g. npx tsx scripts/probe/dot-crit.ts control-little-mermaid dot 220311
//        npx tsx scripts/probe/dot-crit.ts rrh-liberalio proc
//
// The engine gates DoT/rider crit behind env-only XCRIT (empty default) → these hits never
// crit in a normal run. ginmy.net/nikke_dot_test says DoTs DO crit (~15% base, ×1.5). This
// reads the answer off focused footage (parsed into docs/probe-data/), two ways:
//
//   (1) explicit flags — if the reader marked popups crit:true (yellow) / crit:false (white),
//       the crit rate is just the tally. AUTHORITATIVE.
//   (2) value bimodality — even without colour, a critting stream is bimodal: a main cluster
//       at value V and a smaller (~15%) cluster at ~V×1.5. A non-critting stream is unimodal
//       (only the DoT's own value drift). Works cleanly for a uniform DoT (LM); noisy for a
//       buff-ramped rider (liberalio) whose base value itself moves — trust (1) there.

import { loadParsed, type Popup } from './parsed.js';

const [, , slug, kindArg, expArg] = process.argv;
if (!slug) {
  console.error('usage: npx tsx scripts/probe/dot-crit.ts <parsed-slug> [kind] [expectedNonCrit]');
  process.exit(1);
}
const kind = kindArg ?? 'dot';
const expected = expArg ? Number(expArg) : undefined;

const p = loadParsed(slug);
const hits: Popup[] = p.popups.filter((u) => (u.kind ?? '') === kind);
console.log(`\n${slug}  —  focus ${p.focus}, boss ${p.boss ?? 'neutral'}, ${p.video}`);
console.log(`kind='${kind}': ${hits.length} popups\n`);
if (!hits.length) { console.log('no popups of that kind — nothing to test.'); process.exit(0); }

const RATIO_LO = 1.40, RATIO_HI = 1.60; // crit band around ×1.5 (base +50% crit dmg)

// (1) explicit-flag path
const flagged = hits.filter((h) => h.crit !== undefined);
if (flagged.length) {
  const crits = flagged.filter((h) => h.crit).length;
  const rate = crits / flagged.length;
  console.log(`[flags] ${flagged.length}/${hits.length} popups colour-classified: ` +
    `${crits} crit / ${flagged.length - crits} non-crit  →  crit rate ${(rate * 100).toFixed(1)}%`);
  // mean crit ratio where we can pair a crit value against the non-crit modal near its time
  const nonCritVals = flagged.filter((h) => !h.crit).map((h) => h.value).sort((a, b) => a - b);
  const modal = nonCritVals.length ? nonCritVals[Math.floor(nonCritVals.length / 2)] : undefined;
  if (modal && crits) {
    const critMean = flagged.filter((h) => h.crit).reduce((s, h) => s + h.value, 0) / crits;
    console.log(`[flags] median non-crit ${modal.toLocaleString()}, mean crit ${Math.round(critMean).toLocaleString()} ` +
      `→ ratio ×${(critMean / modal).toFixed(3)} (expect ~×1.5 + any crit-dmg buffs)`);
  }
}

// (2) value-bimodality path
const vals = hits.map((h) => h.value).sort((a, b) => a - b);
const median = vals[Math.floor(vals.length / 2)];
const base = expected ?? median; // assume the modal/median is the non-crit value
const critBand = hits.filter((h) => h.value >= base * RATIO_LO && h.value <= base * RATIO_HI);
const nearBase = hits.filter((h) => h.value >= base * 0.92 && h.value <= base * 1.08);
console.log(`\n[values] non-crit reference ${Math.round(base).toLocaleString()}` +
  `${expected ? ' (given)' : ' (median)'}  ·  crit target ~${Math.round(base * 1.5).toLocaleString()}`);
console.log(`[values] near reference (±8%): ${nearBase.length}   in crit band (×1.40–1.60): ${critBand.length}` +
  `   other: ${hits.length - nearBase.length - critBand.length}`);
if (nearBase.length) {
  const impliedRate = critBand.length / (nearBase.length + critBand.length);
  console.log(`[values] implied crit rate (band / (base+band)): ${(impliedRate * 100).toFixed(1)}%`);
}

// compact histogram (12 bins across observed range) for eyeballing modes
const lo = vals[0], hi = vals[vals.length - 1];
const BINS = 12, span = (hi - lo) || 1;
const hist = new Array(BINS).fill(0);
for (const v of vals) hist[Math.min(BINS - 1, Math.floor((v - lo) / span * BINS))]++;
console.log('\n[histogram] value distribution:');
const maxc = Math.max(...hist);
for (let i = 0; i < BINS; i++) {
  const binLo = lo + span * i / BINS;
  const bar = '█'.repeat(Math.round(hist[i] / maxc * 40));
  console.log(`  ${Math.round(binLo).toString().padStart(10)}  ${bar} ${hist[i]}`);
}

// verdict
const flagCrit = flagged.length ? flagged.filter((h) => h.crit).length : 0;
const bandCrit = critBand.length;
console.log('\n' + '-'.repeat(60));
if (flagged.length) {
  console.log(flagCrit > 0
    ? `VERDICT: DoT/rider CRITS — ${flagCrit} yellow crit popup(s) read. Engine gates this OFF → flip crit-on + recalibrate.`
    : `VERDICT: NO crit popups read across ${flagged.length} colour-classified ${kind} hits. Engine's crit-off is CORRECT for this unit.`);
} else {
  console.log(bandCrit > 0
    ? `VERDICT (value-only): a ×1.5 cluster exists (${bandCrit} popups) → likely CRITS. Confirm colour on those frames.`
    : `VERDICT (value-only): no ×1.5 cluster → no crit signature. Colour-confirm to be sure (esp. for buff-ramped riders).`);
}
console.log('-'.repeat(60) + '\n');
