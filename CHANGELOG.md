# Changelog

## v1.3.4 (draft, 2026-11-08)

Full English editions of the book and of the step-by-step guide. No calculation changed.
- Book: English translation of all 20 chapters and 4 appendices (docs/book/en/, dist/book-data-en.js). In the English UI the Book tab shows the English edition, its PDF (dist/book/PondGate_book_v1.3.4_en.pdf, 62 pages) and example data (…_examples_en.zip); the Chinese UI still shows the Chinese edition. Appendix A keeps a Chinese-term column.
- All 25 Part II examples were re-run in the English UI (docs/book/run_examples.js 8765 en) and the figures retaken (dist/book/fig_en/). Every number equals the Chinese edition, and check_examples.py recomputes docs/book/examples_en.json independently: PASS; with --perturb: FAIL as expected.
- Full step-by-step guide: English version built by operating the English UI (docs/build_student_guide_en.js; 13 chapters, 54 steps, 40 screenshots in dist/manual/guide_en/; dist/student-guide-en.js; docs/STUDENT_GUIDE_en.md). New PDF download button in the guide tab (English PDF 65 pages; Chinese PDF 58 pages).
- English book search now accepts a single-word match (e.g. "orifice"); the Chinese threshold is unchanged.
- Checks: audit/english_docs_v1_3_4/english_docs_check.js 18/18 with negative controls; regressions videos 17/17, book 16/16, fix 14/14, manual PDF 14/14, accounts 47/47 (C1 allow-list adds the two English data files).

## v1.3.3 (draft, 2026-11-08)

- New tab Start here -> Tutorial videos with four short voiced videos (Chinese narration and captions, 1:29–1:59 each): first login and finding help; first case and reading results; changing the outlet or pond area; constrained design screening. Each can be played in the page (preload none) or downloaded as MP4 (dist/videos/).
- The offline assistant answers questions about the videos and links to the tab.
- Narration is the macOS built-in offline voice (Meijia); nothing was sent to an online speech service. Numbers on screen match the Part II base case of the book.
- No calculation change; core files unchanged. Checks: audit/videos_v1_3_3/video_check.js 17/17; regressions book 16/16, fix 14/14, manual PDF 14/14, accounts 47/47 (C1 allow-list now includes dist/manual/ and dist/videos/ display assets).

## v1.3.2 (draft, 2026-11-08)

Downloadable user manual in both languages. No calculation changed.
- Start here -> User manual (short) now has two always-visible buttons: 下載中文版（PDF） and Download English (PDF), whatever the screen language, with a message when the download starts. The HTML download is kept for the current language.
- The PDFs (dist/manual/PondGate_user_manual_v1.3.2_zh-Hant.pdf, _en.pdf) are made from the in-app manual by `docs/build_manual_pdfs.js`, so they match what the app shows.
- Downloaded manual and step-by-step guide files now carry the current version (1.3.2) instead of 1.1.0.
- Checks: `audit/manual_v1_3_2/manual_pdf_check.js` 14/14 with negative controls; earlier suites re-run.

## v1.3.1 (draft, 2026-11-07)

Fixes from a novice follow-along test of the book (ChatGPT agent mode, 3.5/5; every number matched). No calculation changed.
- Ticking the free-outflow evidence boxes or filling the record fields no longer marks the routing result as out of date ("輸入已改變"); these fields do not change the routed numbers.
- Typing in the assistant or the book search no longer resets the screening state in the diagnostic guide; only inputs in Modules 1–3 and 5 do.
- New "Back to the base case" button in the Book tab (and an assistant answer for reset questions) restores every input to the values the page opened with.
- Download feedback: the Book tab says when the PDF, ZIP or single-page HTML download has started.
- Book: chapter 2 says the official site requires sign-in; chapter 4 lists the expected numbers (Qp,i 0.1200, Qp,o 0.0903, Hmax 0.413, ε/Vin 0.000 %) and why the verdict is "不夠用"; Part II says how to return to the base case; every run step names the button "執行路由與評估".
- Checks: `audit/book_v1_3_1/fix_check.js` 14/14 with negative controls; v1.3.0 book checks 16/16; account checks 47/47; Part II numbers re-run and independently recomputed (PASS, perturbation caught).

## v1.3.0 (draft, 2026-11-07)

The PondGate book (Traditional Chinese) inside the app, and offline book search in the assistant. No calculation changed.
- New "Start here → Book" tab: 《PondGate 滯洪池演算實務：使用手冊與範例教程》, 20 chapters and 4 appendices. Part I is the user manual (including accounts and projects); Part II teaches routing, outlet formulas, RK4, design checking, screening, blocked results and cross-model checks with worked examples and exercises with answers.
- Downloads: PDF (54 pages), a single-page HTML with figures embedded, and a ZIP of the example data with an independent recomputation script.
- Every number quoted in Part II was produced by this version (`docs/book/run_examples.js`) and recomputed by an independent RK4 script (`docs/book/check_examples.py`): all match (Qp,o within 0.00005 m³/s, Hmax within 0.0005 m); a perturbed number is caught.
- The offline assistant searches the book and offers buttons that open the matching section; it still sends nothing and makes no engineering judgement.
- Beginner check: a third row compares the drain-down residual at Te + Td with the declared limit (an outlet whose invert is above the floor can no longer show "both limits met" while the pond cannot empty).
- Diagnostic guide: after a blocked screening, the condition rows say that screening ran with no feasible candidate instead of "not yet run".
- Checks: `audit/book_v1_3_0/book_check.js` 16/16 with negative controls; existing checks re-run.

## v1.2.1 (draft, 2026-11-07)

Fixes from a ChatGPT (agent mode) novice test of v1.2.0 (`audit/chatgpt_novice_v1_2_1/FINDINGS.md`). Display only; no calculation changed.
- New "Beginner check" at the top of the result page: maximum level vs Hallow and peak outflow vs Qallow, in plain words (`dist/beginner-check.js`). A value equal to a limit after rounding is never shown as a pass.
- The items still missing for constrained screening are listed right below the screening button.
- Switching the language says that routing was recomputed with the current inputs (this was already the behaviour, but it was silent).
- Three-step quick start at the top of "How to start"; the "screening not run" message follows the language; the assistant answers "is my pond good enough?".
- After a second ChatGPT run (4/5): the panel says how pond area and outlet size move the results and states its scope; missing screening items say what evidence to look for; the screening rows point to the Beginner check.
- After a third run (4/5): a note beside the language button warns before switching that it recomputes; the selected-case caption is hidden while screening has not run.
- Checks: `gpt_fix_check.js` 22/22 with negative controls; accounts 47/47, novice 13/13, beginner 11/11, help 37/37, lessons 58/58, guide 18/18.

## v1.2.0 (2026-11-07)

- Optional accounts and saved projects when served by the account server in `server/` (Cloudflare Worker + D1): organisations with four roles (system administrator, organisation administrator, engineer, viewer), sign-in, password change, project save/open/share, trash with restore, activity log, account management. Inputs only are stored; results are recomputed.
- `dist/account.js` added; it does nothing on a static copy. Calculation files unchanged. Checks: `audit/accounts_v1_2_0/accounts_check.js` 47/47.
- Fixes from a novice walkthrough of the account system (`audit/accounts_v1_2_0/NOVICE_WALKTHROUGH.md`, N1-N10): clearer messages for empty company names and accounts added before any company, kept form values, "unsaved changes" marker with a warning before sign-out, the page is cleared after sign-out, a forgotten-password hint, first steps and role help for administrators. Check: `novice_fix_check.js` 13/13.
- Fixes from a beginner walkthrough of the whole app (B1-B6): the offline assistant answers questions about saving projects, forgotten passwords, the allowed outflow, pond size and screening locks; the "cannot run" message names the fields to fix. Check: `beginner_fix_check.js` 11/11 (with negative controls). Live API check `live_api_check.js` 30/30.

## v1.1.0 (2026-11-06)

Help for first-time users and display fixes. No change to the routing core (`routing-core.js`, `physics-refinement.js`
untouched), screening, optimization or any routed value.

Added (`dist/help-content.js`, `dist/help-center.js`, `dist/language-v1-1.js`, `docs/`):
- "Start here | help and assistant" page (first item in the left menu) with a live next-step hint that follows the
  screen state: fix inputs, run, read results, screening locks, screening available, feasible result, or blocked.
  A blocked or infeasible state is always reported as blocked, never as pass.
- In-app user manual in 13 sections (bilingual) with 14 annotated screenshots per language (`dist/manual/`, made by
  `docs/capture_manual_figures.js`), downloadable as one HTML file with the figures embedded; the same text and figures
  are in `docs/USER_MANUAL_zh-Hant.md` and `docs/USER_MANUAL_en.md` (built by `docs/build_manual.js`).
- Seven guided lessons (`dist/guided-lessons.js`): first routing run, own event and pond, long-duration timing, fixing a
  wrong input, constrained screening, no feasible solution, research-inspection mode. Each step is checked from the
  screen state; "Show me" performs the step; practice inputs are loaded with consent and the learner's own inputs are
  restored at the end. Practice evidence is labelled as a teaching assumption.
- Full step-by-step guide for students in Traditional Chinese (`dist/student-guide.js`, tab "完整版操作手冊"):
  13 chapters, 54 steps (each with "操作", "畫面應該出現" and "如果不一樣"), 40 annotated screenshots
  (`dist/manual/guide/`), a term table, an error-message table, a student checklist and six exercises with answers.
  It is generated by `docs/build_student_guide.js`, which operates PondGate as the student would; every quoted number
  and every exercise answer is read from the screen in that run. Downloadable as one HTML file with the figures
  embedded (prints to PDF, `docs/build_student_guide_pdf.js`); the same text is in `docs/STUDENT_GUIDE_zh-Hant.md`.
- Glossary of 36 terms with search, and "?" buttons beside 20 key fields.
- A list of the fields that keep "Run routing and evaluation" disabled, with red outlines and jump links. The list
  mirrors the readiness rule in `module-shell.js` (200 random input sets: no mismatch).
- Offline rule-based assistant (bottom-left button). It answers operation and terminology questions from keywords and
  the screen state, does not change inputs, makes no engineering judgement, and sends no data.

Fixed (display only):
- English interface froze when the teaching example was loaded (`language-en-fallback.js` rewrote untranslatable
  text on every mutation); it now writes only when the text changes. The teaching example records follow the
  interface language (`teaching-assistant.js`).
- English-only texts in the Chinese interface (13 found by the scan, reference citations excluded) and Chinese texts in
  the English interface (13, including button tooltips) are now shown in the interface language (`language-v1-1.js`); button tooltips follow a language switch (`button-feedback.js`).
- The three-step check under Module 6 is labelled as the screening/optimization check; after plain routing it says
  screening has not been run instead of "Not yet run" (`diagnostic-guide.js`).
- After a feasible screening run, the action message said "Screening was not completed" because the result text
  contains "未停留" (`button-feedback.js`); blocked and feasible results now get their own messages.
- The screening result is shown in Module 6 while the page stayed on Module 5; the page now moves to the result
  (`help-center.js`).
- When a run was stopped by an input (for example an S(H) table that ends below H0 or Href), the stop message sat at
  the bottom of Module 3 and could not be seen from Module 4, it was English-only, the page still moved to the old
  results, and repeated rows were added to the result table (also in v1.0.2). The message now sits beside the run
  button in the interface language with a link to the outlined field, Module 6 marks the shown results as those of the
  previous successful run, and repeated rows are removed (`run-error-display.js`).
- A further 21 English-only notes in the Chinese interface (coefficient sources, search-bound notes, the S(H) table
  note, the long-event timing note) and the chart time axis are shown in Chinese (`language-v1-1.js`, `index.html`).
- Lesson 3 pointed to a timing note that does not appear before free-discharge evidence is complete; the step now
  asks the learner to read RQ, FPI95 and the volume-time measures.
- Numbered marks in the manual screenshots no longer cover field labels.
- The internal navigation acceptance test counted the three-step guide card as an extra module and reported a failure
  (also in v1.0.2); it now allows that card under Module 6 (`quality-assurance.js`).

Checks: `release_check.sh` (176-case regression unchanged), misuse audit (300 + 150 sessions) and the four scripted
scenarios with outcomes identical to v1.0.2, and `audit/help_v1_1_0/help_checks.js` (37 checks), `audit/help_v1_1_0/lessons_check.js` (58 checks) and
`audit/help_v1_1_0/guide_check.js` (18 checks, three negative controls on v1.0.2). See
`audit/help_v1_1_0/README.md`.

## v1.0.2 (2026-10-11)

Rename only. No change to the routing core, screening, optimization or any routed value.

- The software is renamed from "Software I" to PondGate in the interface (`dist/`), README, CITATION.cff and Zenodo metadata.
- Interface references to a planned "Software II" are replaced by neutral wording ("future extensions"; multi-pond systems "are outside the scope of PondGate").
- Benchmark data files and audit scripts keep their original names (`software_i_*`) so that archived results stay traceable.

Checks: see `audit/rename_v1_0_2/`.

## v1.0.1 (2026-10-11)

Display-only correction. No change to the routing core, screening, optimization or any routed value.

- English interface: the screening-gate guidance and its fix button were shown in Chinese; they now follow the interface language (`dist/module-shell.js`).
- English interface: the on-screen run-record panel and the E-W1 A-005 benchmark panel were Chinese only; a display layer now shows them in English and restores the Chinese text in the Chinese interface (`dist/language-en-fallback.js`, loaded last in `dist/index.html`).
- The language-switch message is now shown in the target language (`dist/button-feedback.js`).
- The regression heading no longer mixes both languages (`dist/index.html`, `dist/language-final.js`).

Checks: `release_check.sh` (176-case regression unchanged), the 450-session misuse audit, the four scripted scenarios in both languages, and a full-workflow language scan (`audit/language_v1_0_1/`): 0 Chinese text nodes visible in the English interface, against 57 in v1.0.0 (negative control).

## v1.0.0 (2026-10-11)

First public release; application code identical to commit `334304c`.
