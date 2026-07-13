# Probe run plan (U7) — validate the unmeasured overrides in minimum runs

Standard conditions: scope lock preset, 10/10/10, treasure on, full auto, 180s, partless boss.
The CLI supports 4-unit comps (site slots can simply be left empty).
Slot order below is exact (leftmost-first burst priority depends on it). "Boss" names the
weakness to select (boss element in parens) — chosen so themed kits get their advantage.
Site mode pills to set are listed per run. Sim predictions verified: no unexpected stalls.

| run | slots 1→5 | boss | probes (anchors) | modes / notes |
|---|---|---|---|---|
| A | anis-star · prika · mint · alice · red-hood | wind weak (Iron) | prika, mint, alice, red-hood (anis) | prika+mint = duet modes (Prika auto-takes the FIRST B2 regardless of slot order — burstFirst rule); red-hood operates as B3. Rotation is genuinely slow for this comp shape (~50% uptime) — expected, sim models it |
| B | moran · trina · cinderella · neon-VE | elec weak (Water) | moran, trina (cindy, neon) | 4-unit comp (no 5th needed — 12 FBs, no stall); trina's single-target buff lands on the elec carries |
| C | anis-star · tia · naga · SWHA · helm | water weak (Fire) | tia, naga (anis, SWHA, helm) | naga mode "with shielder" (tia IS the shielder); tia flexes as 2nd B1, her S1 CDR/AD still fire |
| D | emma-TU · eunhwa-TU · diesel-WS · helm | fire weak (Wind) | emma-TU, eunhwa-TU, diesel-WS (helm) | 4-unit comp per user; emma+eunhwa = duo modes; ~50% uptime expected (emma's 40s B1 + 2x40s B3s, CD-bound — real matches). BONUS: helm bursts here (4x) — first live test of her 8236.8% nuke model |
| E | rouge · crown · ein · ada · cinderella | elec weak (Water) | rouge, ein, ada (crown, cindy) | each unit judged on its OWN sim-vs-real (no delta methodology — too confounded); rouge's grant modeling surfaces as cindy reading hot/cold with rouge present |
| F | maiden-IR SOLO (field only her) | elec weak (Water) | maiden | no B1/B2 → full burst never happens (sim + real alike): pure normals + her 547.62% proc. Sim prediction: 104.4M total (41.7M normals + 62.7M procs). Real ≈104M → model right; ≈42M → proc ~absent outside FB; between → value/cadence partial |
| G | d-killer-wife · takina · milk-BB · maxwell · liberalio | iron weak (Electric) | DKW, takina, milk-BB, maxwell (liberalio) | milk auto mode (default); tests DKW's fixed CDR cadence |
| H | little-mermaid · crown · quency-EQ · dorothy-S · guillotine-WS | water weak (Fire) | quency-EQ, dorothy-S, xGuillo (LM, crown) | user lacks xLudmilla — xGuillo (fresh override) takes the slot; she never bursts here (slot 5), so her level auras/ramp get tested, not her burst dot |
| I | anis-star · grave · chisato · jill · noir | elec weak (Water) | grave, chisato, jill, noir (anis) | |

Coverage: 27 probe units in 9 runs, every run carrying 1-3 validated anchors so probe error is
attributable. Tail units not covered (lower priority, audited-clean, niche, or not owned): miranda:T, exia:T, asuka, rei-ayanami (not owned), soline-FT (40s mono-B1, stalls any comp she anchors), snow-white,
diesel-WS, ark-ranger-black, rosanna-CO, brid-ST, anchor-IM, ade-AB, soline-FT, velvet(done),
dorothy, mari — can form runs J/K later if desired.

Per run, report: per-unit damage totals (+ who actually burst if it deviated from leftmost).
