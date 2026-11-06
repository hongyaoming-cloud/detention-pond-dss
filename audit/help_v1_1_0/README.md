# v1.1.0 checks: novice walkthrough, help centre and unchanged results

Baseline: tag `v1.0.2` (commit `96d6ca3`). v1.1.0 changes display and help only.
`dist/routing-core.js` and `dist/physics-refinement.js` are byte-identical to v1.0.2.

## Novice walkthrough (2026-11-06)

The whole interface was used as a first-time user would: default page, demonstration run, every page, invalid inputs
(Qp = −1, empty Qp, A = 0, Cw = 0, H0 above the limit), the teaching example, constrained screening with a feasible
and an infeasible case, the report download, both languages, and a 390 px phone width.

| # | Finding | v1.1.0 action |
| --- | --- | --- |
| F1 | No single place says what to do next; the opening page shows six modules at once. | "Start here" page and live next-step hint. |
| F2 | With an invalid input the run button turns grey with "complete Modules 1–3" but does not say which field; the field is not marked. | List of blocking fields above the button, red outline, jump links. |
| F3 | Terms such as Hfloor, Href, FPI95, ΠQ, Qallow are not explained where they are entered. | Glossary (36 terms) and "?" buttons beside 20 fields. |
| F4 | After a plain routing run, the three-step check says "Step 1 Computation status: Not yet run", which reads as if routing failed. | Labelled as the screening/optimization check; text says screening has not been run. |
| F5 | English interface: loading the teaching example froze the page (also in v1.0.2). | `language-en-fallback.js` writes only when the text changes. |
| F6 | English-only labels and notes in the Chinese interface (13) and Chinese texts in the English interface (13, including tooltips). | `language-v1-1.js`; tooltips follow a language switch. |
| F7 | The internal navigation acceptance button reported a failure on a correct page (also in v1.0.2). | The check allows the three-step guide card under Module 6. |
| F8 | No user manual inside the software. | 13-section bilingual manual with 14 annotated screenshots per language, downloadable; same in `docs/`. |
| F9 | After a feasible screening run the action message said "Screening was not completed". | Result-specific messages in `button-feedback.js`. |
| F10 | The screening result appears in Module 6 while the page stays on Module 5, so nothing seems to happen. | The page moves to the result. |
| F11 | No hands-on path from first run to screening. | Seven guided lessons with automatic step checks. |

Not changed (outside the v1.1 scope, noted for later): in the "water level and storage" chart, level (m) and storage (m³) share one axis, so the level line lies near zero; on a phone the left menu shows the Module 5 tab stretched to the
height of the Module 1–4 group; the empty "screening cases" chart frame is shown before any screening.

## Checks

| Check | Command | Result |
| --- | --- | --- |
| 176-case regression | `bash release_check.sh` | passed; MARE A 2.924, B 2.954, C 4.104, D 4.649 (unchanged) |
| Misuse audit, 300 random sessions | `node audit/misuse_screening/audit.js PORT 300 results/run300_v1_1_0.json` + `check.py` | no violations; screening output text identical to v1.0.2 in 300/300 sessions |
| Misuse audit, 150 eligible sessions | `... 150 results/elig150_v1_1_0.json eligible` + `check.py` | no violations; identical to v1.0.2 in 150/150 |
| Four scripted scenarios, two languages | `node audit/scenarios_v1_0_2/scenarios.js PORT results/scenarios_v1_1_0.json` | status badges and decisions identical to v1.0.2; only the intended Step 1 wording differs |
| Help centre, language, manual figures and unchanged values | `node audit/help_v1_1_0/help_checks.js PORT_v1_1_0 PORT_v1_0_2 results/help_checks_v1_1_0.json` | 37/37 |
| Guided lessons, both languages | `node audit/help_v1_1_0/lessons_check.js PORT results/lessons_check_v1_1_0.json` | 58/58 (all steps complete; no step completes early; wrong quiz answers rejected; own inputs restored) |

`help_checks.js` compares routed tables, screening and blocking outputs with v1.0.2 in both languages, scans both
interfaces for wrong-language text, follows the next-step hint through every state, checks the assistant, the
manual download, the navigation acceptance test, network requests (none leave the local server), 200 random input
sets (fix list empty exactly when the run button is enabled) and the phone width. Negative controls: N1 the language
scan finds leaks on v1.0.2; N2 the assistant declines an unrelated question; N3 the English teaching example freezes
v1.0.2.
