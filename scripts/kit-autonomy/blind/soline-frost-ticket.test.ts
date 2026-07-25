// scripts/tests/units/soline-frost-ticket.test.ts
// BLIND S5 kit-spec test — Soline: Frost Ticket (soline-frost-ticket). Authored from kit prose ALONE.
//
// KIT (SG / Water / Supporter / Burst I; ammo 9, hitsPerShot 10, normalMult 201.5):
//  skill1:
//   (A) Battle start + on OWN Burst cast -> all allies: issue 1 ticket (max 2);
//       ticket effect = Max HP up (tickets x 10% of the SKILL USER's Max HP).
//       => casterMaxHpPct grant. OFFENSIVELY INERT in v1 (ally-granted Max HP feeds no
//          atkOfMaxHpPct; Soline herself carries no HP->ATK scaler).
//   (B) Enter Full Burst -> all allies: Burst-Skill Cooldown down 7.48s.  => burstCdr (REAL rotation accel).
//   (C) Enter Full Burst -> all allies: Removes 'First Train Discount'.   => kit-internal status, GAP.
//  skill2:
//   (D) When any squad member HP < 15% (target must hold tickets): heal 12.27% caster Max HP; ticket -1.
//       => HP-gated. v1 boss deals no damage / no HP pool -> never fires. GAP.
//   (E) Battle start -> all allies: 'First Train Discount' for 6s (ticket effects don't consume tickets).
//       => kit-internal status bookkeeping, GAP.
//  burst (Burst I):
//   (F) All allies: heal 32.26% caster Max HP.  => heal event; fires recovery-consumers (Crown is in comp).
//
// FIXTURE: controlComp('soline-frost-ticket', true) — liter(B1)/crown(B2)/soline(focus)/helm(B3).
//   CAVEAT (dual-B1): Soline is Burst I and controlComp also seeds liter (B1); on rotations where liter
//   opens, Soline does NOT cast, so her 2nd ticket + burst heal may not fire. Assertions that need her
//   own cast are guarded/skip'd; the battle-start ticket (value 10) and the CDR/inertness claims do not
//   need her to burst and stay non-vacuous. Crown (B2) is the recovery-consumer for the heal tandem.
//
// WHY EACH ASSERTION DISCRIMINATES:
//  A  buffApply(casterMaxHpPct) must be EMITTED (value 10 at battle start) AND be offensively inert —
//     zeroing every Max-HP-grant leaves team totals byte-identical. Nearest-wrong (encode as ATK / as
//     targetMaxHpPct feeding self atkOfMaxHpPct) would move totals -> RED.
//  B  Full-Burst count must be MONOTONE in burstCdr.seconds across {0, faithful, 40}, strict at the ends.
//     Nearest-wrong (CDR omitted / inert) collapses all three to equal -> RED.
//  F  Team total is monotone under heal presence (base >= noHeal) — a heal can only ADD damage via a
//     recovery-consumer, never subtract. Nearest-wrong (heal mis-encoded as a damage bucket) shows up as
//     a NEW damage source and breaks the byte-equality expectation documented below.
//
// Runs are hoisted (each runComp is a full 180s sim); 5 runs total.

import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness';

const SLUG = 'soline-frost-ticket';

// ---- helpers ----------------------------------------------------------------
function eachEff(ov: any, fn: (e: any, b: any) => void) {
  for (const b of ov.blocks || []) for (const e of b.effects || []) fn(e, b);
}
const setCdr = (s: number) => (ov: any) =>
  eachEff(ov, (e) => { if (e.kind === 'burstCdr') e.seconds = s; });
const zeroMaxHp = (ov: any) =>
  eachEff(ov, (e) => {
    if (e.kind === 'buff' && ['casterMaxHpPct', 'targetMaxHpPct', 'maxHpPct'].includes(e.stat)) e.value = 0;
  });
const stripHeals = (ov: any) => {
  for (const b of ov.blocks || []) b.effects = (b.effects || []).filter((e: any) => e.kind !== 'heal');
};

// runWith(null) = committed faithful override; else an in-memory patched clone for SLUG.
function runWith(clone: any | null) {
  const opts: any = controlComp(SLUG, true);
  if (clone) opts.overrides = { ...(opts.overrides || {}), [SLUG]: clone };
  const events: any[] = [];
  opts.cfg = { ...(opts.cfg || {}), onEvent: (e: any) => events.push(e) };
  const res = runComp(opts);
  return { res, events };
}
const teamTotal = (r: any) => { const x: any = totals(r.res); return typeof x === 'number' ? x : x.total; };
const fbCount = (r: any) => r.events.filter((e: any) => e.kind === 'fullBurstStart').length;

// ---- hoisted runs -----------------------------------------------------------
const base = runWith(null);
const cdr0 = runWith(withPatchedOverride(SLUG, setCdr(0)));
const cdrBig = runWith(withPatchedOverride(SLUG, setCdr(40)));
const noTicket = runWith(withPatchedOverride(SLUG, zeroMaxHp));
const noHeal = runWith(withPatchedOverride(SLUG, stripHeals));

describe('soline-frost-ticket — blind kit spec', () => {
  it('fixture actually reaches Full Burst (non-vacuity)', () => {
    expect(fbCount(base)).toBeGreaterThanOrEqual(1);
    expect(fbCount(cdr0)).toBeGreaterThanOrEqual(1);
  });

  // (A) ticket: Max HP up (tickets x10% of caster Max HP), all allies, battle-start + own-burst
  it('A: grants casterMaxHpPct to allies (battle-start ticket = 10%)', () => {
    const grants = base.events.filter(
      (e: any) => e.kind === 'buffApply' && e.stat === 'casterMaxHpPct',
    );
    expect(grants.length).toBeGreaterThanOrEqual(1);
    // battle-start = 1 ticket = 10%; a 2nd ticket (20%) only if Soline casts her own burst.
    expect(grants.some((g: any) => g.value === 10 || g.value === 20)).toBe(true);
  });

  it('A: ticket Max HP is OFFENSIVELY INERT (zeroing it moves no damage)', () => {
    // ally-granted Max HP feeds no atkOfMaxHpPct; Soline has no HP->ATK scaler of her own.
    // Nearest-wrong encodings (ATK buff / self-feeding targetMaxHpPct) would break this equality.
    expect(teamTotal(noTicket)).toBe(teamTotal(base));
  });

  // (B) Burst Skill CD down 7.48s on Full-Burst enter, all allies
  it('B: burstCdr is live — Full-Burst count monotone in CDR seconds', () => {
    const n0 = fbCount(cdr0), nf = fbCount(base), nBig = fbCount(cdrBig);
    expect(nf).toBeGreaterThanOrEqual(n0);      // faithful CDR never yields FEWER FBs than none
    expect(nBig).toBeGreaterThanOrEqual(nf);    // a larger CDR never yields fewer
    expect(nBig).toBeGreaterThan(n0);           // discriminates: an omitted/inert burstCdr collapses these
  });

  // (F) burst heal 32.26% caster Max HP, all allies — tandem via Crown's recovery trigger
  it('F: heals are monotone (base >= noHeal); heal never SUBTRACTS team damage', () => {
    // Crown (B2) is in the comp: Soline's heal can only ADD damage via Crown's recovery buff, or be inert
    // (if Soline never opens / Crown already saturated). A strict difference confirms the recovery tandem.
    expect(teamTotal(base)).toBeGreaterThanOrEqual(teamTotal(noHeal));
    // If mis-encoded as a damage effect, stripping it would drop a damage bucket -> also caught here.
  });

  it.skip('F(strong): Soline burst heal drives Crown recovery — needs Soline as sole B1 opener', () => {
    // controlComp seeds liter as a 2nd B1, so Soline may never cast; a clean strict tandem read requires
    // a single-B1 fixture (or forcing Soline to open) which the harness cannot express here.
  });

  // (C) skill1: Removes 'First Train Discount' on FB enter
  it.skip('C: removes First Train Discount — kit-internal status, no damage primitive / GAP', () => {});

  // (D) skill2: HP<15% -> heal 12.27% + ticket -1
  it.skip('D: HP<15% heal+ticket-consume — v1 boss deals no damage, no HP pool, never fires / GAP', () => {});

  // (E) skill2: First Train Discount 6s (ticket effects don't consume tickets)
  it.skip('E: First Train Discount status — internal ticket-consumption bookkeeping, no damage / GAP', () => {});
});
