// Parses the English skill prose (skill_1_en / skill_2_en / burst_skill_en) into
// structured Blocks. The text is machine-generated and highly regular:
//   ■ <trigger clause>. Affects <target>.
//   <Stat> ▲ 14.25%, stacks up to 5 time(s) and lasts for 10 sec.
// Anything we can't parse becomes an 'unsupported' effect so the report can
// surface exactly what wasn't modeled.
import type { Block, EffectDef, SkillSlot, StatKey, TargetDef, TriggerDef } from './types.js';

const STAT_MAP: Array<[RegExp, StatKey]> = [
  [/^damage dealt when attacking (the )?core$/i, 'coreDamagePct'],
  [/^damage to interruption parts$/i, 'partsDamagePct'],
  [/^damage to parts$/i, 'partsDamagePct'],
  [/^elemental advantage attack damage$/i, 'elemAdvantageDamagePct'],
  [/^true damage$/i, 'trueDamagePct'],
  [/^distributed damage$/i, 'distributedDamagePct'],
  [/^projectile explosion damage$/i, 'projectileExplosionPct'],
  [/^normal attack damage multiplier$/i, 'normalAttackPct'],
  [/^burst gauge filling speed$/i, 'burstGenPct'],
  [/^charge damage multiplier$/i, 'chargeDamagePct'],
  [/^attack damage$/i, 'attackDamagePct'],
  [/^atk$/i, 'atkPct'],
  [/^critical damage$/i, 'critDamagePct'],
  [/^critical (rate|chance)$/i, 'critRatePct'],
  [/^charge damage$/i, 'chargeDamagePct'],
  [/^charge speed$/i, 'chargeSpeedPct'],
  [/^(elemental|code) damage$/i, 'elementDamagePct'],
  [/^damage taken$/i, 'damageTakenPct'],
  [/^max ammunition capacity$/i, 'maxAmmoPct'],
  [/^reloading speed$/i, 'reloadSpeedPct'],
  [/^attack speed$/i, 'attackSpeedPct'],
  [/^fire rate$/i, 'fireRatePct'],
  [/^sustained damage$/i, 'sustainedDamagePct'],
  [/^damage (dealt )?to parts$|^parts damage$/i, 'partsDamagePct'],
  [/^pierce damage$/i, 'pierceDamagePct'],
  [/^damage dealt$/i, 'attackDamagePct'],
];

// Lines that are real effects but deliberately out of scope (defense, healing,
// utility). Matching lines are dropped without a warning.
const IGNORABLE =
  /taunt|attract|invulnerable|restores?|recovers?|shield|stun|def [▲▼]|defence|defense|hit rate|cover|potency|hp [▲▼]|max hp|explosion range|explosion radius|attention|allure|healing|damage taken [▼]|indomitability|barrier|decoy|dodge|debuff immunity|remove.*debuff|cleanse|interruption stage|stage element|bio-?rounds?|metal-?rounds?|gains? (continuous )?pierce|^destroy mode:|line of sight|auto-aim|^additional effects?[:(]?$|resurrect|camouflage|concealment|prevents being targeted|forced movement|normal attacks deal true damage/i;

function mapStat(name: string): StatKey | null {
  const trimmed = name.trim();
  for (const [re, key] of STAT_MAP) if (re.test(trimmed)) return key;
  return null;
}

function parseTrigger(header: string, slot: SkillSlot): TriggerDef {
  const m = header.match(/activates?\s+(.*)/i);
  if (!m) return slot === 'burst' ? { kind: 'burstCast' } : { kind: 'passive' };
  const clause = m[1].toLowerCase();
  if (/entering full burst|start of full burst/.test(clause)) return { kind: 'fullBurstEnter' };
  if (/using (the )?burst skill/.test(clause)) return { kind: 'burstCast' };
  if (/full burst ends|end of full burst/.test(clause)) return { kind: 'fullBurstEnd' };
  const count = clause.match(
    /(?:normal attack|attack)s? hits? (\d+) time|(?:after|when) (?:landing )?(\d+) (?:normal attack|attack)|when landing (\d+) (?:normal attack|attack)/
  );
  if (count) return { kind: 'hitCount', count: Number(count[1] ?? count[2] ?? count[3]) };
  const stageEnter = clause.match(/entering burst stage (\d)/);
  if (stageEnter) return { kind: 'stageEnter', stage: Number(stageEnter[1]) as 1 | 2 | 3 };
  const bossElem = clause.match(/attacking an? (fire|water|wind|electric|iron) code (?:target|enemy)/);
  if (bossElem) {
    return { kind: 'bossElement', element: bossElem[1][0].toUpperCase() + bossElem[1].slice(1) };
  }
  if (/normal attack hits|attack hits/.test(clause)) return { kind: 'hitCount', count: 1 };
  if (/full[- ]charge/.test(clause)) return { kind: 'shotFired' };
  if (/last (bullet|round|ammo)/.test(clause)) return { kind: 'lastBullet' };
  // v1 assumes the boss deals no damage, so everyone stays at full HP and no ally dies
  if (/when (hp is )?above [\d.]+%|start of (the )?battle/.test(clause)) return { kind: 'passive' };
  if (/ally from the same squad still on the battlefield/.test(clause)) {
    return slot === 'burst' ? { kind: 'burstCast' } : { kind: 'passive' };
  }
  return { kind: 'unsupported', raw: header.trim() };
}

function parseTarget(header: string): { target: TargetDef; warn?: string } {
  const m = header.match(/affects\s+([^.\n]*)/i);
  if (!m) return { target: { kind: 'self' } };
  const t = m[1].toLowerCase();
  if (/^self/.test(t)) return { target: { kind: 'self' } };
  if (/allies who (previously )?cast/.test(t)) return { target: { kind: 'burstCasters' } };
  if (/allies who did not/.test(t)) return { target: { kind: 'nonBurstCasters' } };
  const topAtk = t.match(/(\d+) (?:ally unit\(?s?\)?|allies) with the highest (?:final )?atk/);
  if (topAtk) return { target: { kind: 'alliesTopAtk', count: Number(topAtk[1]) } };
  const elemAllies = t.match(/all (fire|water|wind|electric|iron) code allies/);
  if (elemAllies) {
    const element = elemAllies[1][0].toUpperCase() + elemAllies[1].slice(1);
    return { target: { kind: 'alliesOfElement', element } };
  }
  const classAllies = t.match(/all (attacker|defender|supporter) allies/);
  if (classAllies) {
    const cls = classAllies[1][0].toUpperCase() + classAllies[1].slice(1);
    return { target: { kind: 'alliesOfClass', cls } };
  }
  if (/^all allies/.test(t)) return { target: { kind: 'allies' } };
  if (/target|enem/.test(t)) return { target: { kind: 'enemy' } };
  const nAllies = t.match(/(\d+) ally unit/);
  if (nAllies)
    return {
      target: { kind: 'alliesTopAtk', count: Number(nAllies[1]) },
      warn: `target "${m[1].trim()}" approximated as ${nAllies[1]} highest-ATK allies`,
    };
  return { target: { kind: 'allies' }, warn: `unrecognized target "${m[1].trim()}" — applied to all allies` };
}

function parseEffectLine(line: string): EffectDef | null {
  let l = line.trim().replace(/\s+/g, ' ');
  if (!l) return null;
  // strip a named-mechanic prefix ("Tilted Scale: Critical Rate ▲ …") when a
  // real effect follows the colon
  const named = l.match(/^[^:▲▼%.]{2,40}:\s+(.*[▲▼].*)$/);
  if (named && !/^(once|twice|three times|four times|five times):/i.test(l)) l = named[1];

  // Deals x% of final ATK as <flavor> damage [every i sec] [for t sec]
  const dmg = l.match(
    /deals? ([\d.]+)% of (?:the caster'?s? )?final atk as (?:additional |burst skill |sustained |true |distributed )?damage(?: every ([\d.]+) sec)?(?:.*?for ([\d.]+) sec)?/i
  );
  if (dmg) {
    const flavor = /as true damage/i.test(l) ? 'true' : /as distributed damage/i.test(l) ? 'distributed' : undefined;
    if (dmg[3]) {
      return {
        kind: 'dot',
        atkPct: Number(dmg[1]),
        durationSec: Number(dmg[3]),
        intervalSec: dmg[2] ? Number(dmg[2]) : 1,
      };
    }
    return flavor ? { kind: 'flatDamage', atkPct: Number(dmg[1]), flavor } : { kind: 'flatDamage', atkPct: Number(dmg[1]) };
  }

  const fillGauge = l.match(/fills? burst gauge by ([\d.]+)%/i);
  if (fillGauge) return { kind: 'fillGauge', pct: Number(fillGauge[1]) };

  const cdr = l.match(/cooldown of burst skill ▼ ([\d.]+) sec/i);
  if (cdr) {
    const once = /once per battle/i.test(l);
    return once
      ? { kind: 'burstCdr', seconds: Number(cdr[1]), oncePerBattle: true }
      : { kind: 'burstCdr', seconds: Number(cdr[1]) };
  }

  const fbExtend = l.match(/full burst time(?: duration)?\s*([▲▼])\s*([\d.]+) sec/i);
  if (fbExtend) {
    return { kind: 'fullBurstExtend', seconds: Number(fbExtend[2]) * (fbExtend[1] === '▼' ? -1 : 1) };
  }

  const unlAmmo = l.match(/unlimited ammunition for ([\d.]+) sec/i);
  if (unlAmmo) return { kind: 'unlimitedAmmo', durationSec: Number(unlAmmo[1]) };

  if (/reloads? (all )?ammunition|full(y)? reload/i.test(l)) return { kind: 'instantReload' };
  const partialReload = l.match(/reloads? ([\d.]+)% (of the )?magazine/i);
  if (partialReload) return { kind: 'instantReload', fraction: Number(partialReload[1]) / 100 };

  // <Stat> ▲/▼ x% [of caster's ATK] [, stacks up to N time(s)] [... for t sec]
  const buff = l.match(
    /^(.*?)\s*([▲▼])\s*([\d.]+)\s*%?(?: of (?:the )?caster'?s? atk)?(.*)$/i
  );
  if (buff) {
    const [, statName, dir, valueStr, rest] = buff;
    const ofCaster = / of (the )?caster'?s? atk/i.test(l);
    let stat = mapStat(statName);
    if (stat === 'atkPct' && ofCaster) stat = 'casterAtkPct';
    if (!stat) {
      if (IGNORABLE.test(l)) return { kind: 'ignored', note: l };
      return { kind: 'unsupported', raw: l };
    }
    const stacks = rest.match(/stacks up to (\d+) time/i);
    const dur = rest.match(/(?:lasts? )?for ([\d.]+) sec/i);
    let value = Number(valueStr) * (dir === '▼' ? -1 : 1);
    // "Damage Taken ▲" on the boss is an amp; "▼" on allies is defensive (caught
    // by IGNORABLE above). A negative damageTaken that reaches here targets us — drop it.
    return {
      kind: 'buff',
      stat,
      value,
      durationSec: dur ? Number(dur[1]) : undefined,
      maxStacks: stacks ? Number(stacks[1]) : undefined,
    };
  }

  if (IGNORABLE.test(l)) return { kind: 'ignored', note: l };
  return { kind: 'unsupported', raw: l };
}

// Liter-style escalating block: "Once: ... Twice: ... Three times: ..." — the
// Nth activation applies steps 1..N ("previous effects trigger repeatedly").
function parseEscalating(lines: string[]): EffectDef | null {
  const steps: EffectDef[] = [];
  for (const line of lines) {
    const m = line.match(/^(once|twice|three times|four times|five times):\s*(.*)$/i);
    if (!m) continue;
    const e = parseEffectLine(m[2]);
    if (e && e.kind !== 'ignored') steps.push(e);
  }
  return steps.length >= 2 ? { kind: 'escalating', steps } : null;
}

export function parseSkill(text: string, slot: SkillSlot): { blocks: Block[]; warnings: string[] } {
  const blocks: Block[] = [];
  const warnings: string[] = [];
  if (!text) return { blocks, warnings };
  const cleaned = text.replace(/^cooldown:.*$/im, '').replace(/\r/g, '');

  for (const rawBlock of cleaned.split('■').map((b) => b.trim()).filter(Boolean)) {
    const lines = rawBlock.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    // header = leading lines containing Activates/Affects clauses
    let headerEnd = 1;
    while (headerEnd < lines.length && /^(activates|affects)/i.test(lines[headerEnd])) headerEnd++;
    const header = lines.slice(0, headerEnd).join(' ');
    const effectLines = lines.slice(headerEnd);

    const trigger = parseTrigger(header, slot);
    const { target, warn } = parseTarget(header);

    const effects: EffectDef[] = [];
    const escalating = parseEscalating(effectLines);
    if (escalating) {
      effects.push(escalating);
    } else {
      let swap: { kind: 'weaponSwap' } & Record<string, any> | null = null;
      for (const line of effectLines) {
        if (/^effect changes according|^previous effects/i.test(line)) continue;
        // "Changes the weapon in use:" opens a key/value spec consumed here
        if (/^changes? the weapon in use/i.test(line)) {
          swap = { kind: 'weaponSwap', damagePct: 0, durationSec: 10 };
          effects.push(swap as EffectDef);
          continue;
        }
        if (swap) {
          const kv =
            line.match(/^damage:\s*([\d.]+)% of (?:final )?atk/i) ? ['damagePct', 1] :
            line.match(/^full charge damage:\s*([\d.]+)%/i) ? ['chargeMultPct', 1] :
            line.match(/^charge time:\s*([\d.]+) sec/i) ? ['chargeTimeSec', 1] :
            line.match(/^max ammunition capacity:\s*([\d.]+)/i) ? ['maxAmmo', 1] :
            line.match(/^duration:\s*([\d.]+) sec/i) ? ['durationSec', 1] : null;
          if (kv) {
            const m = line.match(/([\d.]+)/)!;
            swap[kv[0] as string] = Number(m[1]);
            continue;
          }
          if (/^(snipe mode|additional effects?|attack speed|reload|number of pellets)/i.test(line)) continue;
          // anything else ends the spec and parses normally
          swap = null;
        }
        const e = parseEffectLine(line);
        if (e) effects.push(e);
      }
    }

    const real = effects.filter((e) => e.kind !== 'ignored');
    for (const e of real) {
      if (e.kind === 'unsupported') warnings.push(`${slot}: unparsed effect "${e.raw}"`);
    }
    if (trigger.kind === 'unsupported' && real.length) {
      warnings.push(`${slot}: unsupported trigger "${trigger.raw}" — its effects are skipped`);
    }
    if (real.length) {
      if (warn) warnings.push(`${slot}: ${warn}`);
      blocks.push({ slot, trigger, target, effects: real });
    }
  }
  return { blocks, warnings };
}
