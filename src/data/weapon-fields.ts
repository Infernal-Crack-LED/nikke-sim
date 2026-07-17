// Derives the sim's weapon-timing character fields from the raw datamined WeaponTable row
// (`role.weapon.shot_detail`) instead of the lossy nikke-synergy weapon columns. `role` sits
// UPSTREAM of synergy and reconstructs every weapon field the sim uses (audit + validation:
// docs/handoffs/2026-07-17-role-object-audit.md, action item A+B — 74/74 on the base fields,
// by-weapon-type consistent on the rest).
//
// Unit transforms (from the audit):
//   • `damage` / `core_damage_rate` / `full_charge_damage` are BASIS-POINTS (×100 of the sim %).
//   • `charge_time` / `reload_time` are CENTISECONDS (100 = 1.00s).
//   • `reloadFrames = round(reload_time/100*60) + 21` — the +21 independently corroborates the
//     never-refit ~22-frame release latency.
//
// Carve-outs (preserved so the switch is behaviour-neutral):
//   • reloadFrames: SG (per-shell) / RL (slow manual) special reloads — and asuka's AR hand value —
//     don't map through the +21 formula; where synergy carries a frame-accurate value that
//     DISAGREES with the formula it wins (that disagreement is the tell of a special reload).
//   • chargeFrames: role is authoritative (round(charge_time/100*60)). No carve-out — SWHA was the
//     only unit whose synergy value disagreed (71 vs role 72), and that off-by-one is a synergy
//     artefact the datamine supersedes (owner ruling 2026-07-17).
//   • chargeMultiplier: raven's charge is disabled in-sim (custom RL) → forced 0.
//   • burstGaugePerShot: the engine reads burst gauge from data/gauge-per-shot.json (see sim.ts) —
//     char.burstGaugePerShot is an UNCONSUMED reference field, so it takes the CLEAN datamined
//     `(be/10000)*shot_count` and no longer resurrects synergy's per-unit-inconsistent
//     burst_gauge_per_shot (C.2). This intentionally re-values the 18 hitsPerShot/charge-quirk units.

export interface WeaponShotDetail {
  damage: number;
  core_damage_rate: number;
  max_ammo: number;
  shot_count: number;
  muzzle_count: number;
  charge_time: number;
  full_charge_damage: number;
  reload_time: number;
  burst_energy_pershot: number;
  weapon_type: string;
}

export interface DerivedWeaponFields {
  normalAttackMultiplier: number;
  coreAttackMultiplier: number;
  ammo: number;
  reloadFrames: number;
  chargeFrames: number;
  chargeMultiplier: number;
  burstGaugePerShot: number;
  hitsPerShot: number;
}

// hitsPerShot = datamined shot_count × muzzle_count (two muzzles = two projectiles per trigger,
// e.g. quency-escape-queen SMG 1×2, zwei SG 5×2). This matches the synergy value byte-for-byte on
// every unit EXCEPT the C.1-reviewed set (role-object-audit 2026-07-17), where synergy carried a
// stale 2 with no muzzle/shot backing — helm/cinderella/laplace/maiden-ice-rose corrected to 1.
// Two carve-outs KEEP 2 (their double-hit is real but NOT captured by shot_count×muzzle):
//   • modernia — genuine double-hit MG; at 1 her normal damage doubles (60 vs 30 pulls/s) → ~1.76 HOT
//     (measured COLD 0.88 at 2). Also fires her per-HIT S1 rider + burst Destroy-Mode extraHit.
//   • anis-star — LOAD-BEARING gauge-calibration hack (halves her 40-tick burst dot's over-emitted
//     skillGauge); at 1 comp "PA MiKa" makes 12 FBs vs measured 11. Remove ONLY after her dot gauge
//     is properly re-modeled (deferred owner action item, C.1).
const HITS_PER_SHOT_CARVEOUTS: Record<string, number> = { modernia: 2, 'anis-star': 2 };

// Kill float dust from the /100 and /10000 divisions so the JSON serialises identically to the
// clean synergy numbers it replaces (21430/100 must print "214.3", not "214.29999999999998").
const round6 = (v: number) => Math.round(v * 1e6) / 1e6;

// `api` is the (optional) nikke-synergy row — used ONLY to detect the special-reload / swap
// carve-outs above, never as a primary value source.
export function deriveWeaponFields(
  slug: string,
  shot: WeaponShotDetail,
  api?: { reload_time?: number | null; charge_time?: number | null } | null
): DerivedWeaponFields {
  const shotCount = shot.shot_count ?? 1;
  const isCharge = (shot.charge_time ?? 0) > 0;

  const roleReload = Math.round((shot.reload_time ?? 0) / 100 * 60) + 21;
  const reloadFrames =
    api?.reload_time != null && api.reload_time !== roleReload ? api.reload_time : roleReload;

  // Role is authoritative for charge frames (owner ruling 2026-07-17): the only synergy
  // disagreement was SWHA's 71-vs-72 off-by-one, a synergy artefact the datamine supersedes.
  const chargeFrames = isCharge ? Math.round(shot.charge_time / 100 * 60) : 0;

  // Multi-muzzle weapons (muzzle_count > 1) fire that many projectiles per trigger, and the
  // datamined `damage` is PER-MUZZLE-shot — so per-trigger normal damage = damage × muzzle_count.
  // Only quency-escape-queen (SMG) and zwei (SG) have muzzle_count=2; every other unit is ×1
  // (byte-identical). Confirmed by quency's board: 5.06→10.12 moved her 0.546 COLD → 0.989 ±3%.
  // (Core is a RATIO — coreAttackMultiplier — so it scales automatically; gauge lives in
  // gauge-per-shot.json where these two are already hand-curated quirks. Do NOT double those.)
  const muzzle = shot.muzzle_count ?? 1;
  return {
    normalAttackMultiplier: round6((shot.damage ?? 0) / 100 * muzzle),
    coreAttackMultiplier: round6((shot.core_damage_rate ?? 0) / 100),
    ammo: shot.max_ammo,
    reloadFrames,
    chargeFrames,
    chargeMultiplier: isCharge && slug !== 'raven' ? round6((shot.full_charge_damage ?? 0) / 100) : 0,
    burstGaugePerShot: round6((shot.burst_energy_pershot ?? 0) / 10000 * shotCount),
    hitsPerShot: HITS_PER_SHOT_CARVEOUTS[slug] ?? (shotCount * muzzle),
  };
}
