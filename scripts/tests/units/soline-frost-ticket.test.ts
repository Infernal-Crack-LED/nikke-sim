// PER-UNIT KIT SPEC — `soline-frost-ticket` (Soline: Frost Ticket, Supporter/SG/Water, Burst I, cd 40s, ammo 9,
// reloadFrames 111, chargeFrames 0, hitsPerShot 10, normalMult 201.5 / coreMult 200). Kit-autonomy gauntlet
// 2026-07-24 (driver-authored S2a; tests FIRST; reconciled vs blind S2b claude-fable-5 / S5-S7 claude-opus-4-8).
//
// ZERO direct-damage kit: nowhere in her kit does Soline deal %ATK damage / DoT / a rider. Her only damage is base
// SG spray (engine per-unit SG landing model). Every kit line is a buff / cooldown-reduction / heal, so EVERY
// assertion here is EVENT-LOG based (cfg.onEvent buffApply / burstCast / fullBurstStart), never damage-total based.
//
// One assertion group per KIT LINE (F1..F6), asserted against the override loaded from disk. `withPatchedOverride`
// builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must discriminate against) — never the
// encoding under test.
//
// Kit (data/characters.json → characters['soline-frost-ticket'].skills, levels 10/10/10 — the normalized `skills`
// prose is the SSOT):
//   S1 ■ at battle start AND when using Burst Skill → all allies: issue 1 ticket (max 2), continuous;
//         Ticket effect: Max HP ▲ (tickets × 10%) of the skill user's Max HP                       [F1]
//      ■ when entering Full Burst → all allies: Cooldown of Burst Skill ▼ 7.48 sec                  [F2]
//      ■ when entering Full Burst → all allies: Removes First Train Discount  (UNMODELED — ticket bookkeeping) [F3]
//   S2 ■ squad HP < 15% (target with tickets): Recover 12.27% caster final Max HP, ticket ▼1  (UNMODELED, whole block) [F4]
//      ■ at battle start → all allies: First Train Discount 6 sec + Function  (UNMODELED — ticket bookkeeping)        [F4]
//   BU → all allies: Recovers 32.26% of the skill user's final Max HP as HP  (heal event)          [F6]
//
// STEADY-STATE MODELING (why F1 is a flat passive 20%, not a ramping 10%→20%): the ticket is a stack/currency the
// engine has no primitive for (no cap-2/consume-on-S2 stack). She starts at 1 ticket (10% Max HP) at battle start
// and gains the 2nd (+10% → 20%, capped) on her first Burst cast; the ONLY consume is the S2 HP<15% emergency heal,
// which never fires under scope-lock (no incoming boss damage). So the pool sits at the cap (2 tickets = 20%) for
// ~97% of the fight — the faithful steady-state is the flat passive `casterMaxHpPct 20` (a DERIVED trajectory, not
// a cap-tier guess; documented ⚑). casterMaxHpPct resolves to flat Max HP at apply time (sim.ts:1772) and emits a
// buffApply under stat `maxHpFlat` whose KEY carries the effect value (`<slot>:skill1:maxHpFlat:20`) — so the 20%
// effect value is read off the key, and the flat HP amount off the value. Ally-granted Max HP is currently INERT
// for damage (atkOfMaxHpPct counts a unit's OWN Max HP only), so F1 is observed purely via the buffApply event.
//
// EVENT-LOG CONVENTIONS (measured for this fixture): the F1 casterMaxHpPct buff emits buffApply with stat
// `maxHpFlat`, casterIdx === SOLINE, one per ally target (targets [0,1,2]), frame 0, expiresFrame null (passive
// permanent). The F2 burstCdr emits NO buffApply (it mutates burstCdFrames directly, sim.ts:2047) — its only
// observable is the team burst cadence (more Full Bursts over 180s with it than without). The F6 heal emits NO
// buffApply either — it fires a RECOVERY event to its targets (sim.ts:1950), so its observable is a recovery
// CONSUMER: crown's "when recovery takes effect → team Attack Damage ▲20.99% 7s" block fires whenever crown
// RECEIVES a heal.
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   F1  "tickets × 10% of the skill user's Max HP", max 2 tickets, all allies, continuous (passive). Encoded as
//       casterMaxHpPct 20 → buffApply maxHpFlat, key ':maxHpFlat:20', all 3 slots, frame 0, permanent.
//       Nearest-wrong (a): value 10 (1 ticket only — the battle-start state, ignoring the steady-state 2nd ticket
//       she holds from her first burst onward) → key ':maxHpFlat:10', no ':20'. (b): target self → only slot 0,
//       not all 3 allies. Both RED vs shipped.
//   F2  "when entering Full Burst → all allies: Cooldown of Burst Skill ▼ 7.48 sec" = burstCdr 7.48 on
//       fullBurstEnter, all allies. burstCdr emits no event; the observable is the team cadence — with the block
//       the team completes 6 Full Bursts over 180s, without it 5 (the 7.48s off the 40s CDs pulls one extra chain
//       inside the fight). PIN: base FB count > burstCdr-removed FB count (the block is live + fires), and soline's
//       own cast count tracks it. RESIDUAL (documented, owner spot-check): the trigger identity fullBurstEnter vs
//       burstCast is NOT behaviorally discriminable for a Burst-I unit whose own cast opens every chain (her
//       burstCast and the team fullBurstEnter fire the same number of times, ~82 frames apart, so the cadence
//       effect is near-identical); the faithful reading is fullBurstEnter (prose: "when entering Full Burst"). The
//       7.48s magnitude is the prose's own (DATAMINED level-10 value).
//   F3  PIN (documented skip): "Removes First Train Discount" is UNMODELED — pure ticket-economy bookkeeping
//       (toggles whether the S2 heal consumes a ticket); no damage, no stat, no modeled consumer, inert under
//       scope-lock. The S1 SLOT is active (it emits the F1 maxHpFlat grant; the F2 burstCdr emits no buffApply).
//       Assert: soline's skill1-keyed buffApply events emit EXACTLY {maxHpFlat} and NO third (discount-removal)
//       effect — the documented skip is distinguished from a silent drop or a mis-encoding as a damage stat.
//   F4  PIN (documented skip, whole S2 block): the squad-HP<15% emergency heal (12.27% caster Max HP, ticket ▼1)
//       AND the battle-start "First Train Discount 6 sec" + Function are UNMODELED. The heal is a HEAL class with
//       an HP-threshold trigger the schema lacks and the sim cannot produce (no incoming boss damage); wiring it to
//       any available trigger would FABRICATE recovery events (measured > fudge). The discount is the same ticket
//       bookkeeping, gating a heal that never fires. skill2 is [] — Assert: soline's skill2-keyed buffApply events
//       are EMPTY (no fabricated heal, no fabricated discount buff) — the whole-block skip distinguished from a
//       silent drop. (The hard-rule-2 recovery-synergy intent is served by the F6 burst heal, which fires reliably
//       every rotation.)
//   F6  "all allies: Recovers 32.26% of the skill user's final Max HP as HP" = heal on burstCast, all allies. The
//       heal emits a RECOVERY event; with crown's own Relax self-heal removed (crownNoHeal) and ada (a non-healer
//       B3) the ONLY recovery source in the fight is soline's burst heal, so crown's recovery consumer (team
//       attackDamagePct 20.99) fires precisely on soline's burstCast frames. Nearest-wrong (a): trigger
//       fullBurstEnter → the recovery fires on fullBurstStart frames (strictly AFTER soline's burstCast frames —
//       measured 82-frame gap), not the cast frames. (b): heal removed → crown's recovery never fires (no recovery
//       source). Both RED vs shipped. The heal HP AMOUNT is event-only by engine design (no HP pool modeled).
//
// Fixture: Soline is Burst I, so a custom sole-B1 comp [soline-frost-ticket(B1,SG Water) / crown(B2) / ada(B3)] is
// used (NOT controlComp, which fields liter as a second B1). Soline is the SOLE Burst I and is camera-focused; she
// fills her gauge off SG spray and casts her burst ~6× over 180s, each cast opening a Full Burst chain (her
// burstCast frame strictly precedes each fullBurstStart). Crown is the recovery CONSUMER that makes the F6 heal
// observable; ada is a heal-free B3 (her only recovery-adjacent line is an UNMODELED lifesteal) so she never drives
// crown's recovery. Boss Fire. Deterministic (no seed). Slot order: soline 0 / crown 1 / ada 2.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const SFT = 'soline-frost-ticket';
const SOLINE = 0; // slot index in the fixture
const CROWN = 1;
const ALL_SLOTS = [0, 1, 2];

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

const FIXTURE = {
  slugs: [SFT, 'crown', 'ada'] as string[],
  bossElement: 'Fire' as const,
  focusSlug: SFT,
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({ ...FIXTURE, overrides, cfg: { onEvent: (e) => events.push(e) } });
  return { events };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** soline-caster buffApply events (ally/self buffs carry casterIdx === SOLINE). */
const sftBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === SOLINE && b.stat === stat);
const targetsOf = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort(
    (a, b) => (a ?? -1) - (b ?? -1)
  );
/** soline's skill1-keyed buffApply events (key prefix `<SOLINE>:skill1:`). */
const s1Keyed = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.key.startsWith(`${SOLINE}:skill1:`));
/** soline's skill2-keyed buffApply events (key prefix `<SOLINE>:skill2:`). */
const s2Keyed = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.key.startsWith(`${SOLINE}:skill2:`));
const sftBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SFT);
const castFrames = (evs: SimEvent[]) => sftBursts(evs).map((e) => e.frame);
const fbStartFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
/** crown's recovery consumer firings (team Attack Damage ▲20.99%), deduped to distinct frames. */
const crownRecoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN &&
            b.stat === 'attackDamagePct' &&
            b.value === 20.99
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
// F1 nearest-wrong (value): the ticket grant at 1 ticket (10%) instead of the steady-state 2 tickets (20%).
const cfMaxHp10 = withPatchedOverride(SFT, (ov: any) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterMaxHpPct');
  if (!e) {
    throw new Error(
      'soline S1 casterMaxHpPct effect missing — fixture is stale'
    );
  }
  e.value = 10;
});
// F1 nearest-wrong (target): all allies → self only.
const cfMaxHpSelf = withPatchedOverride(SFT, (ov: any) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'casterMaxHpPct')
  );
  if (!b) {
    throw new Error(
      'soline S1 casterMaxHpPct block missing — fixture is stale'
    );
  }
  b.target = { kind: 'self' };
});
// F2 nearest-wrong (presence): the burstCdr block removed → no team CDR → fewer Full Bursts.
const cfNoCdr = withPatchedOverride(SFT, (ov: any) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'burstCdr')
  );
  if (ov.skill1.length === before) {
    throw new Error('soline S1 burstCdr block missing — fixture is stale');
  }
});
// F6 nearest-wrong (trigger): the burst heal keyed to fullBurstEnter (FB-start frames) instead of burstCast.
const cfHealFbEnter = withPatchedOverride(SFT, (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'heal')
  );
  if (!b) {
    throw new Error('soline burst heal block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
// F6 nearest-wrong (presence): the burst heal block removed → no recovery source → crown's recovery never fires.
const cfNoHeal = withPatchedOverride(SFT, (ov: any) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.burst.length === before) {
    throw new Error('soline burst heal block missing — fixture is stale');
  }
});
// Isolation: remove crown's own Relax self-heal so soline's burst heal is the ONLY recovery source in the fight.
const crownNoHeal = withPatchedOverride('crown', (ov: any) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.skill2.length === before) {
    throw new Error('crown S2 heal block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const maxHp10 = run({ [SFT]: cfMaxHp10 });
const maxHpSelf = run({ [SFT]: cfMaxHpSelf });
const noCdr = run({ [SFT]: cfNoCdr });
const isolated = run({ crown: crownNoHeal });
const healFbEnter = run({ [SFT]: cfHealFbEnter, crown: crownNoHeal });
const noHeal = run({ [SFT]: cfNoHeal, crown: crownNoHeal });

describe('soline-frost-ticket — kit spec', () => {
  describe('fixture sanity — Soline casts her burst and opens Full Burst chains', () => {
    it('Soline casts >0 bursts and the team completes >0 Full Bursts; burstCast strictly precedes fullBurstStart', () => {
      expect(sftBursts(base.events).length).toBeGreaterThan(0);
      expect(fbStartFrames(base.events).length).toBeGreaterThan(0);
      const cf = castFrames(base.events);
      const fs = fbStartFrames(base.events);
      // trigger identity is frame-discriminable: every cast frame strictly precedes its FB-start frame
      expect(cf.every((f) => !fs.includes(f))).toBe(true);
      expect(Math.min(...cf)).toBeLessThan(Math.min(...fs));
    });
  });

  describe('F1 — S1 ticket Max-HP grant: casterMaxHpPct 20 (2 tickets × 10%), all allies, passive permanent', () => {
    const mh = sftBuff(base.events, 'maxHpFlat');
    it('grants flat Max HP to ALL allies at frame 0, permanent, keyed to the 20% effect value', () => {
      expect(mh.length).toBeGreaterThan(0);
      expect(targetsOf(mh)).toEqual(ALL_SLOTS);
      expect([...new Set(mh.map((b) => b.frame))]).toEqual([0]);
      expect([...new Set(mh.map((b) => b.expiresFrame))]).toEqual([null]);
      // the buff KEY carries the effect value (20% = 2 tickets × 10%); the flat HP amount is the value
      expect([...new Set(mh.map((b) => b.key))]).toEqual([
        `${SOLINE}:skill1:maxHpFlat:20`,
      ]);
      expect(mh.every((b) => b.value > 0)).toBe(true);
    });
    it('DISCRIMINATING (value): 1 ticket (10%, nearest-wrong) keys the buff :10, not :20', () => {
      expect(
        sftBuff(maxHp10.events, 'maxHpFlat').filter((b) =>
          b.key.endsWith(':maxHpFlat:20')
        ).length
      ).toBe(0);
      expect(
        sftBuff(maxHp10.events, 'maxHpFlat').filter((b) =>
          b.key.endsWith(':maxHpFlat:10')
        ).length
      ).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (target): self (nearest-wrong) reaches only soline, not all 3 allies', () => {
      expect(targetsOf(sftBuff(maxHpSelf.events, 'maxHpFlat'))).toEqual([
        SOLINE,
      ]);
    });
  });

  describe('F2 — S1 FB-enter burst CDR ▼7.48s to all allies (burstCdr; no event — observed via team cadence)', () => {
    it('PIN: the block is live — removing it reduces the Full Burst count over 180s', () => {
      const withCdr = fbStartFrames(base.events).length;
      const without = fbStartFrames(noCdr.events).length;
      expect(withCdr).toBeGreaterThan(without);
      // soline's own cast count tracks the team cadence
      expect(castFrames(base.events).length).toBeGreaterThanOrEqual(
        castFrames(noCdr.events).length
      );
    });
    // RESIDUAL (documented): fullBurstEnter vs burstCast trigger identity is NOT behaviorally discriminable for a
    // Burst-I unit whose own cast opens every chain (same firing count, ~82 frames apart → near-identical cadence
    // effect). The faithful reading is fullBurstEnter (prose: "when entering Full Burst"); flagged for owner
    // spot-check, not asserted here. The 7.48s magnitude is the prose's own DATAMINED level-10 value.
  });

  describe('F3 — S1 "Removes First Train Discount" is UNMODELED (ticket-economy bookkeeping)', () => {
    it("PIN: soline's skill1-keyed buffs emit EXACTLY {maxHpFlat} and NO discount-removal effect", () => {
      const s1Stats = new Set(s1Keyed(base.events).map((b) => b.stat));
      expect([...s1Stats].sort()).toEqual(['maxHpFlat']);
    });
  });

  describe('F4 — S2 whole block UNMODELED (HP<15% emergency heal + First Train Discount bookkeeping)', () => {
    it('PIN: soline emits NO skill2-keyed buffApply events (skill2 is [] — no fabricated heal or discount buff)', () => {
      expect(s2Keyed(base.events).length).toBe(0);
    });
  });

  describe('F6 — Burst heal (32.26% caster final Max HP) to all allies on burstCast, observed via crown recovery', () => {
    it("drives crown's recovery consumer (team AD ▲20.99%) precisely on soline's burstCast frames", () => {
      const casts = castFrames(isolated.events);
      const recovery = crownRecoveryFrames(isolated.events);
      expect(casts.length).toBeGreaterThan(0);
      // every soline burst cast produces a crown recovery firing on the same frame (the heal is instant on cast)
      expect(recovery).toEqual(casts);
    });
    it('DISCRIMINATING (trigger): fullBurstEnter (nearest-wrong) fires the recovery on FB-START frames, not cast frames', () => {
      const casts = castFrames(healFbEnter.events);
      const recovery = crownRecoveryFrames(healFbEnter.events);
      const starts = fbStartFrames(healFbEnter.events);
      expect(recovery.length).toBeGreaterThan(0);
      // recovery lands on FB-start frames, which are NOT soline's cast frames
      expect(recovery.every((f) => starts.includes(f))).toBe(true);
      expect(recovery.every((f) => !casts.includes(f))).toBe(true);
    });
    it('DISCRIMINATING (presence): heal removed (nearest-wrong) leaves NO recovery source — crown recovery never fires', () => {
      expect(crownRecoveryFrames(noHeal.events).length).toBe(0);
    });
  });
});
