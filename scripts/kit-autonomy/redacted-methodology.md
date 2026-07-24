# Redacted methodology for blind kit-authoring roles (unit-agnostic)

Included in every blind packet (S2b/S5/S6). General failure-mode taxonomy + the 4 per-line questions + the
ALWAYS-⚑ fields. The packet-prep script strips any line naming the TARGET slug before dispatch (examples naming
other units are kept — they don't leak the target). Answer-free by construction.

## Recurring failure-mode taxonomy (the traps calibration hides — applies to ANY unit)
1. **SCOPE** — a buff scoped to "normal attacks" (or charge / crit-only) mis-encoded as a generic stat. A
   "Critical Rate of normal attacks" line is a scoped stat, NOT generic crit (generic over-credits skill/burst crit).
2. **DURATION SEMANTICS** — "for N round(s)" is a ROUND count (expires after the holder fires N rounds, spanning
   reloads), NEVER wall-clock seconds. Also distinguish stacks vs until-reload vs permanent vs "continuously".
3. **TRIGGER IDENTITY** — read the activation text literally: "when using Burst Skill" / a self mode in the
   unit's OWN burst block → burst-cast (fires only on rotations THIS unit bursts); "when entering Full Burst" /
   "during Full Burst" → full-burst-enter (fires on ANY team Full Burst); "when Full Burst ends" → full-burst-end;
   "when the last bullet hits/fires" → last-bullet (per-magazine); "every N hits" → hit-count (counts ROUNDS not
   pulls); a damage line with NO activation clause → interval. A rider can be GATED on a status/condition
   ("hits a target in <X> status"). Burst-cast vs full-burst-enter diverge whenever another same-tier unit is in
   the team — keying a burst-cast-gated effect to full-burst-enter OVER-CREDITS.
4. **TANDEM / CROSS-UNIT** — a heal/shield inert alone may drive a teammate's "on recovery / when healed" damage
   buff; never skip heal/shield/DEF/HP/lifesteal/gauge lines on isolation. "Damage Taken ▲" is a boss DEBUFF that
   benefits the whole team, not a self buff.
5. **DoT ENCODING** — the engine appends an independent DoT instance per fire and never dedups; a continuous/
   maintained DoT = ONE passive instance with duration ≥ fight length (a long duration on a repeating trigger
   MULTIPLIES).
6. **WEAPON-STATE modifiers** (reload speed/ratio, ammo capacity ▲▼, fire rate, charge speed, weapon swap) ARE
   damage — they gate shot count. Before writing "skip", ask "does this change shots fired or the weapon?" A
   "Max Ammunition ▼" halves magazines (raises last-bullet frequency).
7. **HP/DEF scalers** count the unit's OWN Max HP only; ally grants don't feed the conversion. Keep the stat buff
   even if the engine treats it inert (a future consumer/scaler).
8. **ELEMENT advantage** is a clean ×1.10 unless the kit carries an elemental-advantage damage buff
   ("Superior Elemental Code" style) — then it exceeds ×1.10 and must be modeled.
9. **noFb / range / core** — function-damage riders take Full Burst by TIMING (default ON); the +30% range bonus
   is universally OFF on riders (engine force-sets no-range); riders crit at the caster's rate but get NO core
   unless the text says "core strike damage"; burst-cast/instant damage is always FB-exempt (a burst cast lands
   before the FB window opens).
10. **STACK / currency** → steady-state with a ramp haircut; if start + consume + rebuild are kit-stated, DERIVE
    the trajectory (continuous level-scaling = time-average respecting the stated START; threshold-gated = check
    the PRE-consume count; sawtooth = ~cap/2).

## The 4 questions per kit line (the errors calibration hides)
1. **Scope** — normal attacks vs charge vs crit-only vs generic?
2. **Duration semantics** — seconds vs ROUNDS vs stacks vs until-reload vs permanent?
3. **Trigger identity** — last-bullet / shot-fired / hit-count / interval / full-burst-enter / burst-cast;
   on-cast vs on-hit; any gate (FB-gate / every-N / requires-core / requires-target-status)?
4. **Target set** — self / allies / all-including-self / the target (enemy) / caster-slot overwrite?

## ALWAYS-⚑ fields (outside the input domain — flag with estimate + reasoning + recipe; never ship silently)
A value not literally in the kit text, OR from a known-unreliable datamine field (rate_of_fire, reloadFrames),
MUST be a ⚑. The seven: (1) cadence tuple (datamine-unreliable); (2) a damage line the text gives NO trigger for
(invented trigger + cadence); (3) weapon-swap shot economy (kit-silent — estimate optimistically); (4) stack/
currency steady-state + ramp haircut (derive if stated); (5) multi-projectile split-vs-merge (kit-silent — read
popups); (6) per-kit noFb (default OFF; measured-only); (7) Hit-Rate→core magnitude (measured-only). A blind
parser that honestly flags what it can't know is CORRECT; one that guesses a precise ⚑ value is WRONG.
