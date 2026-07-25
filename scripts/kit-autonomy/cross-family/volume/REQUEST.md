# Cross-family review REQUEST — `volume`

Driver model family: **(fill in — e.g. Qwen)**. Requested reviewer family: **the OTHER family (e.g. Claude)**.
Run each packet UNMODIFIED on a model of the requested family; write the result JSON to the path below.
Protocol: scripts/kit-autonomy/CROSS-FAMILY-PROTOCOL.md. Leak assertion passed on every packet at build time.

| Role | Packet | Result contract | Write result to |
| --- | --- | --- | --- |
| s2b | cross-family/volume/s2b-packet.md | TEST-FAITHFULNESS-REVIEW output contract | cross-family/volume/s2b-result.json |
| s5 | cross-family/volume/s5-packet.md | BLIND-TEST-WRITER output contract | cross-family/volume/s5-result.json |
| s6 | cross-family/volume/s6-packet.md | BLIND-OVERRIDE-WRITER output contract | cross-family/volume/s6-result.json |
