# Rename check for v1.0.2 (Software I -> PondGate)

`scan_name.js <port> <en|zh> <out.json>` drives load, ineligible gate, routing, discrete and continuous screening,
a blocked case and the E-W1 A-005 panels, and lists every text node, `title` or `aria-label` (visible or not)
that still contains "Software I" or "Software II".

| Run | Old-name hits | Page errors |
| --- | --- | --- |
| v1.0.2, English (`name_en_v1_0_2.json`) | 0 | 0 |
| v1.0.2, Chinese (`name_zh_v1_0_2.json`) | 0 | 0 |
| v1.0.1, English, negative control (`name_en_v1_0_1_negative_control.json`) | 15 | 0 |

Other checks on v1.0.2: `release_check.sh` passed (176-case MARE unchanged); English-interface language scan
0 hits (`lang_en_v1_0_2.json`); Chinese round trip passed (`zh_roundtrip_v1_0_2.json`); the 450-session misuse
audit (`../misuse_screening/results/*_v1_0_2*`) and the four scenarios (`../scenarios_v1_0_2/`) give outcomes
identical to `334304c`, with no violations.
