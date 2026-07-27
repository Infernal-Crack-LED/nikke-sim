// S5 BLIND TEST (cross-family, claude-opus-5) — `asuka`, materialized to the live harness.
//
// Authored BLIND from the kit prose + effect schema alone (no sight of the committed override, the
// driver test, or any truth file). Materialized here with MECHANICAL adaptation only so it runs
// against the real harness API and the committed OverrideFile shape:
//   * import path: '../lib/harness' -> '../../tests/lib/harness.js'
//   * the blind writer iterated a hallucinated flat `ov.blocks` array; the committed OverrideFile
//     carries `skill1`/`skill2`/`burst` block arrays, so `allBlocks(ov)` flattens those three slots.
//     This preserves every patch's INTENT (iterate all blocks/effects) without touching assertions.
// No assertion logic was changed. Where the blind derivation chose a MORE literal encoding than the
// engine can express (S2a in-Shield-status gate; Gain Pierce as a timed gainPierce:25s effect), the
// assertion runs as-written against the committed override and any RED is an honest divergence for
// the S7 reconciling judge to arbitrate — not a silent pass and not a fabricated green.
import { describe, it, expect } from 'vitest';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

type Ev = any;

// ---------------------------------------------------------------- plumbing
const near = (a: any, b: number, tol = 0.05) =>
  typeof a === 'number' && Math.abs(a - b) <= tol;

function run(opts: any) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: Ev) => events.push(ev) },
  } as any);
  return { res, events };
}

function runPatched(mutate: (ov: any) => void, helm = true) {
  const b: any = controlComp('asuka', helm);
  const patched = withPatchedOverride('asuka', mutate);
  return run({ ...b, overrides: { ...(b.overrides ?? {}), asuka: patched } });
}

/** read the committed override WITHOUT running a sim — withPatchedOverride hands us the clone. */
function inspect<T>(read: (ov: any) => T): T {
  let out: any;
  withPatchedOverride('asuka', (ov: any) => {
    out = read(ov);
  });
  return out as T;
}

// MECHANICAL ADAPTATION: the committed OverrideFile splits blocks across skill1/skill2/burst.
const allBlocks = (ov: any): any[] => [
  ...(ov.skill1 ?? []),
  ...(ov.skill2 ?? []),
  ...(ov.burst ?? []),
];

const eachEffect = (ov: any, fn: (e: any, b: any) => void) => {
  for (const b of allBlocks(ov)) {for (const e of b.effects ?? []) {fn(e, b);}}
};
const setValue = (pred: (e: any) => boolean, value: number) => (ov: any) =>
  eachEffect(ov, (e) => {
    if (pred(e)) {e.value = value;}
  });
const dropEffect = (pred: (e: any) => boolean) => (ov: any) => {
  for (const b of allBlocks(ov))
    {b.effects = (b.effects ?? []).filter((e: any) => !pred(e));}
};

// Effect predicates. The prose magnitudes are unique inside this kit, so they are the identity —
// this keeps the patches independent of how the driver ordered or split the blocks.
const isAtk9698 = (e: any) =>
  e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 96.98);
const isElemAdv30 = (e: any) => e.kind === 'buff' && near(e.value, 30.02);
const isCore60 = (e: any) => e.kind === 'buff' && near(e.value, 60.07);
const isAtkDmg150 = (e: any) => e.kind === 'buff' && near(e.value, 150.04);
const isHitRate = (e: any) => e.kind === 'buff' && near(e.value, 101.37);
const isPierce = (e: any) => e.kind === 'gainPierce';
const isHeal = (e: any) => e.kind === 'heal';

const retargetCore = (target: any) => (ov: any) => {
  for (const b of allBlocks(ov))
    {if ((b.effects ?? []).some(isCore60)) {b.target = target;}}
};
const ungateShield = (ov: any) => {
  for (const b of allBlocks(ov))
    {if ((b.effects ?? []).some(isElemAdv30)) {delete b.requiresShielded;}}
};

// ---------------------------------------------------------------- runs (hoisted; each is a full 180s sim)
const base = run(controlComp('asuka', true));
const noHelm = run(controlComp('asuka', false));
const noHeal = runPatched(dropEffect(isHeal), false);
const shieldUngated = runPatched(ungateShield, true);
const coreAllAllies = runPatched(retargetCore({ kind: 'allies' }), true);
const coreWind = runPatched(
  retargetCore({ kind: 'alliesOfElement', element: 'Wind' }),
  true
);
const noAtkDmg = runPatched(setValue(isAtkDmg150, 0), true);
const noHitRate = runPatched(setValue(isHitRate, 0), true);
const noPierce = runPatched(dropEffect(isPierce), true);

// ---------------------------------------------------------------- event helpers
const applies = (evs: Ev[], pred: (e: Ev) => boolean) =>
  evs.filter((e) => e.kind === 'buffApply' && pred(e));
const countKind = (evs: Ev[], kind: string) =>
  evs.filter((e) => e.kind === kind).length;

// asuka slot index, derived from one of her three self-only burst/skill magnitudes. Recomputed PER RUN
// because the helm=false comp has a different roster and therefore different slot indices.
const idxIn = (evs: Ev[]) => {
  for (const v of [101.37, 150.04, 96.98]) {
    const hit = evs.find(
      (e) =>
        e.kind === 'buffApply' &&
        near(e.value, v) &&
        typeof e.targetIdx === 'number'
    );
    if (hit) {return hit.targetIdx as number;}
  }
  return -1;
};
const aiBase = idxIn(base.events);
const aiNoHelm = idxIn(noHelm.events);
const fbBase = countKind(base.events, 'fullBurstStart');

const asukaDamage = (res: any) => {
  const u: any = unitOf(res, 'asuka');
  const v = u?.damage ?? u?.total ?? u?.totalDamage ?? u?.dmg;
  expect(typeof v).toBe('number');
  return v as number;
};

describe('asuka — fixture sanity (non-vacuity for everything below)', () => {
  it('the carry is resolvable and the comp actually reaches Full Burst repeatedly', () => {
    expect(aiBase).toBeGreaterThanOrEqual(0);
    expect(aiNoHelm).toBeGreaterThanOrEqual(0);
    expect(fbBase).toBeGreaterThan(1);
    expect(unitOf(base.res, 'liter')).toBeTruthy();
    expect(asukaDamage(base.res)).toBeGreaterThan(0);
  });
});

describe('asuka S1a — Damage dealt to Shield ▲601.01% (no primitive)', () => {
  it('is recorded as unmodeled text and is NOT smuggled into some other stat', () => {
    const um: any = inspect((ov: any) => ov.unmodeled ?? {});
    const s1: string[] = um.skill1 ?? [];
    expect(s1.some((l) => /Shield/i.test(String(l)))).toBe(true);
    const smuggled = inspect((ov: any) => {
      let f = false;
      eachEffect(ov, (e) => {
        if (near(e.value, 601.01, 0.5) || near(e.atkPct, 601.01, 0.5)) {f = true;}
      });
      return f;
    });
    expect(smuggled).toBe(false);
  });

  it.skip('shield-damage payload — GAP: no StatKey for damage-to-shield and the v1 boss has no shield pool', () => {});
});

describe('asuka S1b — ATK ▲96.98% for 25s when recovery takes effect', () => {
  it('fires from a recovery event, not from battle start (nearest-wrong: passive)', () => {
    const hits = applies(noHelm.events, isAtk9698Ev);
    expect(hits.length).toBeGreaterThan(0);
    const firstApply = noHelm.events.findIndex(
      (e) => e.kind === 'buffApply' && near(e.value, 96.98)
    );
    const firstBurstCast = noHelm.events.findIndex(
      (e) => e.kind === 'burstCast'
    );
    expect(firstBurstCast).toBeGreaterThanOrEqual(0);
    expect(firstApply).toBeGreaterThan(firstBurstCast);
  });

  it('is driven by her OWN burst heal — removing the heal removes the ATK buff entirely', () => {
    expect(applies(noHelm.events, isAtk9698Ev).length).toBeGreaterThan(0);
    expect(applies(noHeal.events, isAtk9698Ev).length).toBe(0);
  });

  it('is self-only (Affects self) — no ally ever receives it', () => {
    const hits = applies(noHelm.events, isAtk9698Ev);
    expect(hits.every((e) => e.targetIdx === aiNoHelm)).toBe(true);
  });

  it.skip('heal tick cadence — ⚑ MEASUREMENT-GATED: prose says over 10 sec without a per-tick rate, so refresh count (1 vs 10 recovery events) is not derivable from text', () => {});
});

describe('asuka S2a — Elemental Advantage Attack Damage ▲30.02%, shield-gated, on FB enter', () => {
  it('the in-Shield-status gate suppresses the block in a comp with no shield source', () => {
    expect(applies(base.events, isElemAdvEv).length).toBe(0);
    expect(applies(shieldUngated.events, isElemAdvEv).length).toBeGreaterThan(
      0
    );
  });

  it('is full-burst-enter keyed and self-targeted (nearest-wrong: burstCast / whole team)', () => {
    const hits = applies(shieldUngated.events, isElemAdvEv);
    const fb = countKind(shieldUngated.events, 'fullBurstStart');
    const ai = idxIn(shieldUngated.events);
    expect(hits.length).toBe(fb);
    expect(hits.every((e) => e.targetIdx === ai)).toBe(true);
  });

  it('uses the elemental-advantage stat, not generic element/attack damage', () => {
    const hits = applies(shieldUngated.events, isElemAdvEv);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((e) => e.stat === 'elemAdvantageDamagePct')).toBe(true);
  });
});

describe('asuka S2b — core damage ▲60.07% to all Fire Code allies on FB enter', () => {
  it('applies once per Full Burst, to asuka included (nearest-wrong: burstCast keying, or excludeSelf)', () => {
    const hits = applies(base.events, isCore60Ev);
    const toAsuka = hits.filter((e) => e.targetIdx === aiBase);
    expect(toAsuka.length).toBe(fbBase);
    expect(hits.every((e) => e.stat === 'coreDamagePct')).toBe(true);
  });

  it('is Fire-Code scoped, not team-wide', () => {
    const recip = (evs: Ev[]) =>
      new Set(applies(evs, isCore60Ev).map((e) => e.targetIdx));
    const committed = recip(base.events);
    const allAllies = recip(coreAllAllies.events);
    expect(committed.size).toBeGreaterThan(0);
    expect([...committed].every((i) => allAllies.has(i))).toBe(true);
    expect(committed.size).toBeLessThan(allAllies.size);
  });

  it('the element key is Fire — asuka drops out of the target set when it is changed', () => {
    const ai = idxIn(coreWind.events);
    const toAsuka = applies(coreWind.events, isCore60Ev).filter(
      (e) => e.targetIdx === ai
    );
    expect(toAsuka.length).toBe(0);
    expect(
      applies(base.events, isCore60Ev).filter((e) => e.targetIdx === aiBase)
        .length
    ).toBeGreaterThan(0);
  });
});

describe('asuka burst — Attack damage ▲150.04% for 10s (self)', () => {
  it('is burst-cast keyed, self-targeted, and lands in the Damage-Up bucket not the ATK stat', () => {
    const hits = applies(base.events, isAtkDmgEv);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThan(fbBase);
    expect(hits.every((e) => e.targetIdx === aiBase)).toBe(true);
    expect(hits.every((e) => e.stat === 'attackDamagePct')).toBe(true);
    expect(
      applies(base.events, (e) => e.stat === 'atkPct' && near(e.value, 150.04))
        .length
    ).toBe(0);
  });

  it('moves asuka damage and nothing else (self scope)', () => {
    expect(asukaDamage(noAtkDmg.res)).toBeLessThan(asukaDamage(base.res));
    expect(unitOf(noAtkDmg.res, 'liter')).toEqual(unitOf(base.res, 'liter'));
    expect(unitOf(noAtkDmg.res, 'crown')).toEqual(unitOf(base.res, 'crown'));
  });
});

describe('asuka burst — Hit Rate ▲101.37% for 10s (self)', () => {
  it('applies once per own burst, to self only', () => {
    const hits = applies(base.events, isHitRateEv);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThan(fbBase);
    expect(
      hits.every((e) => e.targetIdx === aiBase && e.stat === 'hitRatePct')
    ).toBe(true);
    expect(hits.length).toBe(applies(base.events, isAtkDmgEv).length);
  });

  it('carries real damage through the hit-rate core lift, and only for asuka', () => {
    expect(asukaDamage(noHitRate.res)).toBeLessThan(asukaDamage(base.res));
    expect(unitOf(noHitRate.res, 'liter')).toEqual(unitOf(base.res, 'liter'));
  });

  it.skip('hit-rate -> core MAGNITUDE — ⚑ measured-only (hrCoreMult is a derived engine constant, not a kit value)', () => {});
});

describe('asuka burst — Gain Pierce for 25 sec (self)', () => {
  it('carries the 25s window, not the 10s window the other three burst lines use', () => {
    const p: any = inspect((ov: any) => {
      let hit: any = null;
      eachEffect(ov, (e) => {
        if (!hit && e.kind === 'gainPierce') {hit = e;}
      });
      return hit;
    });
    expect(p).toBeTruthy();
    expect(p.durationSec).toBe(25);
  });

  it('is damage-inert in v1 (pierceDamagePct is parsed but inert) — documents, not asserts, a payload', () => {
    expect(totals(noPierce.res)).toEqual(totals(base.res));
  });
});

// isXEv wrappers keep the event predicates separate from the override-effect predicates above:
// buffApply events carry stat+value, override effects carry kind+stat+value.
function isAtk9698Ev(e: Ev) {
  return e.stat === 'atkPct' && near(e.value, 96.98);
}
function isElemAdvEv(e: Ev) {
  return near(e.value, 30.02);
}
function isCore60Ev(e: Ev) {
  return near(e.value, 60.07);
}
function isAtkDmgEv(e: Ev) {
  return near(e.value, 150.04);
}
function isHitRateEv(e: Ev) {
  return near(e.value, 101.37);
}
