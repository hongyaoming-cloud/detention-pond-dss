# Software I: detention-pond routing decision-support system

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23296722.svg)](https://doi.org/10.5281/zenodo.23296722)

Software I is a browser-based, event-scale routing system for **one detention pond with a known inflow hydrograph**.
It integrates the level-pool (storage-continuity) equation with a fixed-step fourth-order Runge–Kutta (RK4) scheme,
keeps a reproducible record of every run, and turns a routed curve into a design statement only when the statement
can be defended:

* **Constrained screening** searches candidate outlet sizes only inside a declared eligibility envelope
  (passive weir or rectangular opening, free-discharge conditions confirmed, evidence records supplied).
* **Continuous optimization** searches pond area and outlet size within the same limits.
* When no feasible design exists, or the inputs fall outside the envelope, the software **blocks** the result,
  shows a three-step diagnostic, and offers correction links. It never reports "pass" without a feasible design.

The interface is bilingual (English / Traditional Chinese).

> Scope. Agreement with other engines reported here is **numerical consistency** under identical declared physics.
> It is not field calibration and not a general validation of the method outside the tested laboratory envelope.

## Version

This repository state is **v1.0.1**. It differs from v1.0.0 (commit `334304c`, the version first described in the
accompanying software paper) only in display text: the screening-gate guidance, the on-screen run-record panel,
the E-W1 A-005 benchmark panel and one status message now appear in English in the English interface
(`dist/module-shell.js`, `dist/button-feedback.js`, `dist/index.html`, `dist/language-final.js` and the new
`dist/language-en-fallback.js`). The routing core, screening, optimization and all routed values are unchanged;
the 176-case regression and every audit give the same results. See `CHANGELOG.md`.

## Running the software

No installation is needed. Serve the `dist/` folder with any static web server and open it in a browser:

```bash
python3 -m http.server 8000 --directory dist
# then open http://localhost:8000/index.html
```

(Opening `dist/index.html` directly from disk also works for routing; the bundled benchmark comparisons need the
local server because the browser fetches their CSV files.)

## Tests

Requires Node.js ≥ 18.

```bash
node test_core.js        # routing core, mass balance and release guards
node regression_176.js   # 176 laboratory cases (352 raw series) through the browser RK4 core
```

Expected 176-case peak-discharge mean absolute relative error (MARE, %): A 2.924, B 2.954, C 4.104, D 4.649.
A Python implementation of the same regression is in `regression_176.py` (NumPy).

## Audit material used in the software paper

| Folder | Content |
| --- | --- |
| `audit/misuse_screening/` | Randomized misuse audit of constrained screening (300 random + 150 eligible sessions, headless Chromium via Playwright) and its invariant checker; results for `334304c` and for v1.0.1 (`*_v1_0_1*`, identical outcomes, no violations). |
| `audit/continuous/` | Misuse audit (104 sessions), scenario runs and an independent Node re-implementation of continuous optimization; results for `334304c`. |
| `audit/cross_engine_groups/` | Four-group (A/B/C/D-005) cross-check against SciPy and a +1% Cd negative control. |
| `audit/scenarios_334304c/`, `audit/scenarios_v1_0_1/` | Four scripted scenarios in English and Chinese on `334304c` and on v1.0.1 (same decisions). |
| `audit/language_v1_0_1/` | English-interface scan for Chinese text: 0 hits on v1.0.1, 57 on `334304c` (negative control); Chinese round-trip check. |
| `audit/cross_engine/` | E-W1 A-005 cross-engine comparison: Software I reference, SciPy `solve_ivp` (DOP853, LSODA), HEC-HMS 4.13 native outputs, EPA SWMM 5.2.4 values. |

Browser audits: `npm install playwright`, start the static server on a port, then for example
`node audit/misuse_screening/audit.js 8000 300 out.json` and `python3 audit/misuse_screening/check.py out.json`.
Cross-engine: `node audit/cross_engine/scripts/01_software_i_reference.js`, then
`python3 audit/cross_engine/scripts/02_scipy_solve_ivp.py` and `03_compare_engines.py` (NumPy, SciPy).

## Data

The 176 raw laboratory hydrographs and their numerical reruns are archived separately:
Hong, Y.-M. (2026). *Raw Hydrographs, Numerical Reruns, and Identifiability Metrics for 176 Detention Pond Routing
Experiments* (Version 1.0). Zenodo. https://doi.org/10.5281/zenodo.22673729

## Citation

Hong, Y.-M. (2026). *Software I: detention-pond routing decision-support system* (Version 1.0.1). Zenodo.
https://doi.org/10.5281/zenodo.23296721

This concept DOI always resolves to the latest version; version 1.0.0 is https://doi.org/10.5281/zenodo.23296722. See also `CITATION.cff`.

## Licence

MIT, © 2026 Yao-Ming Hong. See `LICENSE`.

## Author

Yao-Ming Hong, Department of Natural Resources and Environmental Studies, and Carbon Neutrality Research Center,
National Dong Hwa University, Hualien 974301, Taiwan.
