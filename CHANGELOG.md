# Changelog

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
