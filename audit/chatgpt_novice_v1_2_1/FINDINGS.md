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
