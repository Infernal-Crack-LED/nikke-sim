// Engine-primitive backfill: `mode` / `modes` (7 carriers each) — the mode-gate system (bready,
// cinderella-crystal-wave, delta-ninja-thief, emma-tactical-upgrade, milk-blooming-bunny, mint,
// prika — primitive census in docs/engine-modeling-gaps.md). TDD transition step 2
// (docs/handoffs/2026-07-23-tdd-transition-plan.md).
//
// The gate is a STATIC filter resolved once at prepare-time (sim.ts: `activeBlocks = skills.blocks
// .filter(b => !b.mode || b.mode === selectedMode)`), not a per-frame check — so a single frame-0
// `passive` flatDamage per candidate block is a complete, deterministic readout of which blocks are
// active for a given mode selection; no timing/rotation machinery is needed at all.
//
// Method: the same zeroed-kit-carrier pattern as weapon-swap.test.ts/ammo-economy.test.ts (`blanc`,
// `crown` as a bare-weapon filler), three skill1 blocks tagged mode:'modeA' / mode:'modeB' / no mode
// at all, and CompOptions.modes to select — reading which `flatDamage` atkPct signatures fired.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { bareWeaponOverride, runComp } from '../lib/harness.js';

type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;

const CARRY = 'blanc';
const MODE_A_ATK = 111;
const MODE_B_ATK = 222;
const UNGATED_ATK = 333; // the no-`mode`-field block — must be active in EVERY mode

/** Run blanc with three passive frame-0 flatDamage blocks, one per mode + one ungated. */
function modeComp(selectedMode?: string) {
  const events: SimEvent[] = [];
  runComp({
    slugs: [CARRY, 'crown'],
    bossElement: 'Iron',
    focusSlug: CARRY,
    modes: selectedMode !== undefined ? { [CARRY]: selectedMode } : undefined,
    overrides: {
      [CARRY]: {
        slug: CARRY,
        modes: ['modeA', 'modeB'],
        skill1: [
          {
            slot: 'skill1',
            trigger: { kind: 'passive' },
            target: { kind: 'self' },
            mode: 'modeA',
            effects: [{ kind: 'flatDamage', atkPct: MODE_A_ATK, crit: false }],
          },
          {
            slot: 'skill1',
            trigger: { kind: 'passive' },
            target: { kind: 'self' },
            mode: 'modeB',
            effects: [{ kind: 'flatDamage', atkPct: MODE_B_ATK, crit: false }],
          },
          {
            slot: 'skill1',
            trigger: { kind: 'passive' },
            target: { kind: 'self' },
            // no `mode` field — must fire regardless of which mode is selected
            effects: [{ kind: 'flatDamage', atkPct: UNGATED_ATK, crit: false }],
          },
        ],
        skill2: [],
        burst: [],
      } as any,
      crown: bareWeaponOverride('crown'),
    },
    cfg: { disableBursts: true, onEvent: (e) => events.push(e) },
  });
  return new Set(
    events
      .filter(
        (e): e is DamageEvent =>
          e.kind === 'damage' && e.slug === CARRY && e.srcSlot === 'skill1'
      )
      .map((e) => e.atkPct)
  );
}

describe('mode / modes (static per-block mode gate)', () => {
  it("DISCRIMINATING: an unselected mode defaults to modes[0] — only that mode's block + the ungated one fire", () => {
    const atkPcts = modeComp(undefined);
    expect(atkPcts, 'default mode should be modes[0] (modeA)').toEqual(
      new Set([MODE_A_ATK, UNGATED_ATK])
    );
  });

  it("DISCRIMINATING: selecting 'modeB' swaps which mode-gated block is live, without touching the ungated block", () => {
    const atkPcts = modeComp('modeB');
    expect(atkPcts).toEqual(new Set([MODE_B_ATK, UNGATED_ATK]));
  });

  it('DISCRIMINATING: an unrecognized mode string falls back to modes[0], not to nothing and not a crash', () => {
    const atkPcts = modeComp('not-a-real-mode');
    expect(
      atkPcts,
      'an invalid mode selection should behave exactly like the unselected (default) case'
    ).toEqual(new Set([MODE_A_ATK, UNGATED_ATK]));
  });
});
