// The element wheel + the "counts as" derivation.
//
// A nikke's ELEMENT is its code (data/characters.json `element`), and the wheel below says which
// boss code that element is elementally advantaged against. SOME kits additionally grant advantage
// against a SECOND boss code — Rapi: Red Hood's Skill 2 ("Applies Elemental Advantage damage to
// Electric Code enemies continuously", the `advantageVs` effect). Against an Electric-code boss she
// therefore behaves exactly like an Iron nikke, so every element-facing surface (roster filters, the
// DPS-chart element view, advantage markers) must treat her as Fire AND Iron.
//
// The extra elements are DERIVED from the unit's kit override, never hand-tagged: the override is the
// kit source-of-truth, the derivation stays true to it, and a data sync (src/data/sync.ts, which
// rebuilds characters.json from scratch) recomputes it instead of clobbering a hand-added field.
//
// The engine does NOT read any of this — it already resolves advantage from the `advantageVs` effect
// directly (src/engine/sim.ts `advantaged()`), which is why the damage numbers were always right; this
// module exists so the UI/tooling agree with the engine about which elements a unit counts as.
import type { CharacterData, Element } from './types.js';
import type { OverrideFile } from './skills/index.js';
import type { Block } from './skills/types.js';

export const ELEMENTS: Element[] = ['Fire', 'Water', 'Wind', 'Electric', 'Iron'];

// element → the boss code it is advantaged against (the engine keeps its own copy as BEATS in
// src/engine/sim.ts; both encode the same fixed game wheel, which has never changed)
export const BEATS: Record<Element, Element> = {
  Electric: 'Water',
  Iron: 'Electric',
  Wind: 'Iron',
  Fire: 'Wind',
  Water: 'Fire',
};

// inverse wheel: boss code → the element that is natively advantaged against it. An `advantageVs`
// effect names the BOSS code, so this maps it back to the element the unit is behaving as.
export const ADVANTAGED_BY: Record<Element, Element> = Object.fromEntries(
  (Object.entries(BEATS) as [Element, Element][]).map(([ele, boss]) => [boss, ele])
) as Record<Element, Element>;

// every element this unit counts as: its own code first, then one per `advantageVs` effect in the
// override. Order is stable (native, then kit order) and duplicates are dropped.
export function countsAsElements(element: Element, override?: OverrideFile): Element[] {
  const out: Element[] = [element];
  const slots: (Block[] | undefined)[] = [override?.skill1, override?.skill2, override?.burst];
  for (const blocks of slots)
    for (const b of blocks ?? [])
      for (const e of b.effects)
        if (e.kind === 'advantageVs') {
          const as = ADVANTAGED_BY[e.element as Element];
          if (as && !out.includes(as)) out.push(as);
        }
  return out;
}

// read helper for consumers of characters.json: the tag when present, else the single native code.
export function unitElements(c: Pick<CharacterData, 'element' | 'countsAsElements'>): Element[] {
  return c.countsAsElements?.length ? c.countsAsElements : [c.element];
}

export const unitHasElement = (
  c: Pick<CharacterData, 'element' | 'countsAsElements'>,
  element: string
): boolean => unitElements(c).includes(element as Element);
