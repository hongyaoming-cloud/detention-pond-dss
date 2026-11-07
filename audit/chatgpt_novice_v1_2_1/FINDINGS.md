# ChatGPT agent novice test of PondGate v1.2.0 (2026-11-07)

The owner asked ChatGPT (agent mode) to act as a third-year civil-engineering student using PondGate for the first time on the live account site, with a temporary test account (`qa_novice`, company `qa_測試公司`, deleted after the test). ChatGPT rated the software 3/5 for beginners. Its findings and the v1.2.1 responses follow.

| # | Finding (ChatGPT) | Cause found | v1.2.1 response | Check |
|---|---|---|---|---|
| 1 | After changing Qp from 0.5 to 0.4 without pressing Run, switching the language showed results for 0.4. | `setLanguage()` in `physics-refinement.js` re-renders the last run with the current inputs (same as pressing Run). The values were correct for the current inputs, but nothing said so. The core file is not changed. | A message now says that routing was recomputed once with the current inputs, and the "inputs changed" hint is cleared. | G1, G1b, G1n |
| 2 | The result page did not compare the routed result with Hallow and Qallow; the limit check was only on the settings page. | The three-step panel refers to screening, not to the general routing run. | New "Beginner check" panel at the top of the result page: Hmax vs Hallow and Qp,o vs Qallow, with "within limit", "exceeds" or "check again" (a value equal after rounding is never a pass). | G2, G2n, G2c |
| 3 | The screening button can be pressed but does not screen; the reasons appear only on the result page. | Missing items were shown elsewhere. | The missing items are listed right below the screening button and update as the user fills them. | G3, G3n |
| 4 | "How to start" is dense (equations, 176-case regression). | Teaching page was written for completeness. | A three-step quick start box sits at the top of the page. | G6 |
| 5 | An English page still showed the Chinese "screening not run" message. | The message is set once in the language active at that time. | The message now follows the language. | G5, G5n |
| 6 | The assistant could not answer "how do I judge whether this pond is good enough". | No intent for it. | New intent: it answers from the current result and explains the two comparisons. | G4, G4b, G4n |

No calculation changed: `routing-core.js`, `physics-refinement.js` and `module-shell.js` are byte-identical to v1.1.0. Regression: accounts 47/47, novice 13/13, beginner 11/11, help 37/37, lessons 58/58, student guide 18/18; new checks 14/14 (`gpt_fix_check.js`).

ChatGPT did not confirm that the report download completed; the download was confirmed in earlier checks (help P-series) and is unchanged.

## Second run (same day, after deploying the fixes)

ChatGPT rated the updated version 4/5 (was 3/5). It judged the old issues 2, 4 and 5 solved and 1 and 3 partly improved. Its new points and the responses:

| Finding | Response | Check |
|---|---|---|
| Switching the language still recomputes, which can surprise a beginner. | Kept by design (the core file is not changed); the beginner panel now also reminds that switching the language recomputes when inputs have changed. | G1 |
| The screening check below still says "not yet run; Hallow = …" while the panel above says the limit is exceeded. | The screening rows now say that screening has not run and point to the Beginner check for the routing result. | G8 |
| The "not good enough" verdict is far from the note that free-discharge evidence is incomplete. | The panel states its scope beside the verdict when the evidence is incomplete. | G7, G7n |
| Beginners do not know what evidence the screening items need. | Each missing item says what to look for or what to enter. | G9 |
| Which change to try first is unclear. | The panel says how a larger pond and a smaller outlet move the level and the outflow; it does not choose a size. | G7 |
| English help buttons showed a Chinese label. | Not reproduced: after switching, the labels read "Help: Peak inflow Qp". | (none) |
| Download success is not shown on the page. | Not changed; the download was confirmed in earlier checks. | (none) |

Checks after the second round: gpt_fix_check 18/18, accounts 47/47, novice 13/13, beginner 11/11, help 37/37, lessons 58/58, guide 18/18. Calculation files unchanged.

## Third run (after deploying the second-round fixes)

ChatGPT kept the score at 4/5. It judged the second-run issues B2, B3 and F1 solved; B1, B4 and F3 partly improved; B5 (download confirmation) and F2 (no warning before the language switch) still present. New points: when screening has not run, the result area first shows the caption for a selected screening case before saying screening has not run; a short practice lesson for "change one thing and compare" would help.

The score has levelled off. The remaining points are by design (the language switch recomputes in the core file, which is not changed; formal screening needs real evidence) or could not be verified by the agent (download). Two small points were then fixed: a note beside the language button now warns before switching that it recomputes (when inputs changed after a run; checks G10, G10n), and the selected-case caption is hidden while screening has not run (G11, G11n). Checks: gpt_fix_check 22/22, accounts 47/47, novice 13/13, beginner 11/11, help 37/37, lessons 58/58, guide 18/18.

The test account `qa_novice` and company `qa_測試公司`, their sessions, projects and activity-log rows were deleted from the production database after this run; only the owner's system-administrator account remains.
