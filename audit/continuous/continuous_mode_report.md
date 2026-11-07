# Continuous optimization mode (`#continuousGlobal`): code description, scenarios A/C, misuse audit

Repository: detention-pond-dss, branch fix/diagnostic-language, commit 151405b (paper release). Nothing in the repo was modified.
All line numbers refer to `dist/` at 151405b. `PR` = `dist/physics-refinement.js`, `RC` = `dist/routing-core.js`, `DG` = `dist/diagnostic-guide.js`.
Run date: 2026-10-11. Headless Chromium from /opt/pw-browsers (Playwright 1194 build), dist/ served with `python3 -m http.server`.

## 1. What the code does

### Decision variables and bounds
- There are two continuous variables: the plan area A and **one** outlet size. The outlet size is the weir width b when the weir is active, and the opening area Ao otherwise (`active=last.p.weir?'b':'ao'`, PR:222). The UI note says the same (PR:53).
- The bounds on A come from two inputs used only by this mode, `contAmin` and `contAmax`, with defaults of 60 and 600 m² (PR:54). The bounds on b or Ao reuse the discrete-screening inputs `optBmin`/`optBmax` (default 0.05–1.00 m) or `optAomin`/`optAomax` (default 0.005–0.050 m²) (PR:49, PR:222). The `optB` and `optAo` checkboxes are ignored.
- The bounds must satisfy `a0>0`, `a1>=a0`, `x0>0` and `x1>=x0`, or the run is rejected (PR:223).
- Every other parameter is fixed at the routed working case `last.p`: Cw or Cd, crest or invert, H0, the inflow, Td and the residual %. Each candidate is built as `p={...last.p,area:A,bw|ao:x}` (PR:225).
- The mode needs constant-area storage, S = A(H − Hfloor) (PR:219, PR:75–76).

### Objectives and Pareto ranking
- The mode minimizes three objectives together: ΔSmax = smax − S0, Hmax and Qmax. Pareto non-dominance is computed over the feasible candidates (PR:228). The `optObjective` selector (storage or area) is **not** used, and plan area A is not an objective.
- The "selected" design is the front member that comes first in a lexicographic sort by (ΔSmax, Hmax, Qmax). In practice this is the minimum-ΔSmax point on the front (PR:231).
- **Reporting issue:** the output text says "The first Pareto alternative is selected" (PR:236). However, the table lists `front.slice(0,20)` in evaluation order, without sorting (PR:233). Table row 1 is therefore usually **not** the selected design. In scenario A, row 1 is A = 465, b = 0.1556, while the selected design is A = 346.875, b = 0.3447. The table also shows only 20 of the 147 front members.
- **The Pareto ranking does not narrow the set in practice.** For one event and one monotone outlet law, less storage means a higher outflow peak, so feasible points rarely dominate each other. In scenario A, all 147 feasible evaluations were non-dominated (147/147). Only 131 of them are distinct points, because the local stencils re-evaluate duplicates and, with strict-improvement dominance, a duplicate does not dominate its twin (replicate_A.json).

### Search algorithm, parameters, determinism and stopping rule (PR:224–229)
1. **Corners:** the 4 corners of the [A] × [x] box, tagged `'discrete-grid'` (PR:226).
2. **Global stage:** 72 Halton points, i = 1…72, with radical-inverse bases 2 (for A) and 3 (for x) (PR:224 `radical`, PR:227).
3. **Local stage:** 2 refinement passes, run only if the front is non-empty. Each pass takes the first 8 front members in evaluation order (`front.slice(0,8)`, not sorted). For each it evaluates a 3 × 3 stencil with steps (a1−a0)/8^(pass+1) and (x1−x0)/8^(pass+1): 1/8 of the range, then 1/64. Points are clamped to the bounds, and the front is recomputed after each pass (PR:229).
- **Budget:** at most 4 + 72 + 2 × 8 × 9 = 220 routings. Scenario A used 220 (204 distinct). Scenario C used 76, because with no feasible point no local pass runs.
- **Determinism:** there is no random number generator and no seed. The run is fully deterministic: 4 browser runs of A and 1 identical audit case (case 70) gave bit-identical results, and the Node re-implementation agrees.
- **Stopping rule:** the fixed budget. There is no convergence test. The search is cut short only when the front is empty after the global stage (`pass<2&&front.length`, PR:229).
- The code comment and the UI text state that this is not a proof of a continuous global optimum (PR:211–213, PR:236).

### Constraints and feasibility (PR:225)
A candidate is feasible (`ok`) only if all of these hold, with tolerance 1e-10:
- Qmax ≤ Qallow
- Hmax ≤ Hallow
- drain-down remaining ≤ residualPct/100, where remaining = max(0, S(Te+Td) − S0)/ΔSmax. The default residualPct is 1 % (PR:49).
- `relativeMassResidual(z) <= .005`, that is, |ε|/Vin ≤ 0.5 % (PR:92)

In addition, if `routeDesignCandidate` throws because the route reached the declared S(H) boundary or did not reach Te + Td, the candidate is infeasible and counted as `boundary` (PR:143, PR:225).

Failure counters are kept for outflow, level, drain, mass and boundary. The no-feasible message, however, lists only outflow, level, drain and boundary. The `mass` count is never named; it is used only as the generic fallback text (PR:230).

### Is a 0.5 % volume-residual criterion part of feasibility?
**Yes, in both modes.**
- Discrete screening: `...&&remaining<=drainLimit&&relativeMassResidual(z)<=.005` (PR:193).
- Continuous mode: `...&&relativeMassResidual(z)<=.005` (PR:225).
- `relativeMassResidual` = |vin − vout − Sfinal + S0| / vin (PR:92; residual defined at RC:38).

The actual feasibility criteria in both modes are:
- Qmax ≤ Qallow
- Hmax ≤ Hallow
- drain-down residual at Te + Td ≤ residualPct (default 1 % of ΔSmax)
- mass-balance residual ≤ 0.5 % of Vin
- no S(H) boundary hit and the route reaches Te + Td

The two modes differ in tolerance only. Discrete uses strict `<=` with no tolerance (PR:193). Continuous allows −1e-10 on the three limits (PR:225).

A separate 0.5 % test, `Math.abs(res)<=.5` on the displayed ε/Vin %, appears in `module-shell.js:15`. It drives only the integrity badge and is not a feasibility test. The discrete no-feasible reason list does not count mass failures either (PR:202–203).

In the observed runs the mass residual was about 4e-9 % at most (replicate_A.json). The 0.5 % test was therefore never binding: the `mass` failure count was 0 in A and C.

### Routing of every candidate
**True.** `check()` calls `routeDesignCandidate(p)` (PR:225), which calls `window.DetentionRoutingCore.routeStorage` (PR:133–141). It uses dt = 2 s and a tail of max(1800 s, 30·dur, Td) (PR:140). `RC:59–61` declares this the only production integrator, and the integrator is RK4 (RC:7–19). There is no surrogate model. The selected design's routed record is passed out as `r.rows` (PR:232).

### Eligibility gate
There are three layers.

1. **Button lock** in `updateContinuousGate` (PR:239), re-run on input and click events (PR:241). It requires all of the following:
   - routing done (`last`)
   - Hallow ≥ H0
   - Qallow > 0
   - `freeDischargeEvidenceComplete()`: the `freeDischarge` boundary confirmation plus the four evidence boxes (PR:37)
   - both traceability records (PR:38)
   - exactly one of weir and opening, with no riser and no pipe
   - valid A and active-size bounds

   It does **not** check `coeffMode`.
2. **Presentation guidance** `firstContinuousGap` / `renderGuidance` (PR:439–445). This layer is "presentation-only" (PR:439). `firstContinuousGap` checks, in this order: routing ready, Hallow ≥ H0, Qallow > 0, the four evidence boxes (tailwater, backwater, submergence, operation), the evidence record, the screening-limit record, `coeffMode==='table'`, and single outlet / no riser / no pipe (PR:443). If it finds a gap, `renderGuidance` disables the button and shows the message with a "Go to fix" button (PR:444).
   - **It omits the `freeDischarge` boundary-confirmation checkbox and the bound-validity checks.** As a result, when only `freeDischarge` is unchecked the button is locked by layer 1, but no fix link is shown next to it. This was observed in audit cases 100 and 101.
   - Conversely, layer 1 omits `coeffMode`. With table coefficients the button is locked by layer 2, while the status line still reads "Continuous mode ready…" (audit cases 9 and 102).
3. **Authoritative guard** inside `continuousNumericalSearch`. It requires `formalScreeningEligible()` (PR:218; definition at PR:39, which includes fixed coefficients and `freeDischarge`). It then requires constant-area storage (PR:219), Qallow > 0 and Hallow ≥ H0 (PR:221), and valid bounds (PR:223). Each failure gives a "not run" message and dispatches no result event.

### Output and no-feasible behaviour
- **Feasible** (PR:231–236):
  - A `dss:continuous-result` event is dispatched with `{kind:'feasible', mode:'b'|'ao', p, r:{rows}, e:{hp:{h,s}, pout:{qo}}, remain:%}` (PR:232). The three-step diagnostic consumes it (DG:22) and shows "Continuous optimization completed", with Step 1 = Pass.
  - The HTML output contains: the evaluated count, the front size, a ΔSmax–Hmax scatter of the front, a table of 20 front members with their margins, a "selected vs nearest discrete candidate" line, and a routed record of about 10 sampled rows.
  - The "nearest discrete candidate" is the nearest of the 4 **corner** points (`phase==='discrete-grid'`, PR:231). It is not the discrete-screening grid.
  - **Nothing is written back.** The A and b inputs and the main plots keep the working case (PR:213). This was verified: after the run, area stays 180 and bw stays 0.20.
  - There is no bound-active warning, unlike discrete mode (PR:207–208). Audit case 6 selected A = 60 (lower bound) and b = 1.00 (upper bound) with no notice.
- **No feasible point** (PR:230):
  - A `{kind:'no-feasible', limits}` event is dispatched, and the output gets class `status warn` with the message "No feasible candidate was found. Binding conditions observed: …" or the zh equivalent "沒有可行解。…". The message advises not to relax Qallow or Hallow.
  - The diagnostic then shows Step 1 Blocked, "No feasible solution", and one "Go to fix" button per dominant limit (DG:9, DG:19–21).
  - The output text itself carries no "Blocked/阻擋" prefix, unlike the discrete message at PR:204.
- **Exception:** the output shows "Continuous numerical search could not be completed: …" and no event is dispatched (PR:237).

### How it differs from discrete constrained screening (`optimizePhysical`, PR:177–209)
| Aspect | Discrete screening | Continuous mode |
|---|---|---|
| Variables | A on a fixed grid of 60…600 m², step 20 (28 values, PR:194). Each checked size (b, Ao, D) at 5 equally spaced values (PR:188); up to 2 sizes (quick) or 3 (full) (PR:181) | A ∈ [contAmin, contAmax], continuous, plus one size (b or Ao) (PR:222) |
| Sampling | Full tensor grid, then 2 local passes around the incumbent with halving windows and A ± 20 (PR:196–198) | 4 corners, 72 Halton(2,3) points, then 2 passes of 3 × 3 stencils around up to 8 front members (PR:226–229) |
| Objective | Single objective: ΔSmax or A, from `optObjective`; ties broken by smaller A (PR:181, PR:193) | Three-objective Pareto (ΔSmax, Hmax, Qmax); report shows min ΔSmax (lexicographic) (PR:228, PR:231) |
| Feasibility | Q, H, drain, mass ≤ 0.5 %, boundary (PR:193) | Same set with 1e-10 tolerance (PR:225) |
| Router | `routeDesignCandidate` → `routeStorage` | Same |
| Result | Writes the design back to the inputs and re-routes the main view (`applyRecommendedDesign`, PR:205). Event `mode:'discrete'` (PR:208) | No write-back. Event `mode:'b'|'ao'` (PR:232) |
| Gate | `formalScreeningEligible` (PR:179). Button stays clickable; module-shell sets `data-screening-eligible` (module-shell.js:21) | Same guard (PR:218), plus a disabled button (PR:239/444) |

## 2. Scenarios A and C (default demonstration event)

**Default event:** triangular hydrograph with Qp = 0.120 m³/s, peak at 30 min, duration 60 min (Vin = 216 m³). Constant area A = 180 m² with H0 = Hfloor = 0. One weir with Cw = 1.70, b = 0.20 m and crest at 0. Qallow = 0.080 m³/s, Hallow = 1.00 m, Td = 24 h, residual limit 1 %. Continuous bounds are A 60–600 m² and b 0.05–1.00 m.

**Scenario A setup:** weir only. All five free-discharge boxes were ticked: `freeDischarge` plus the four evidence boxes, which the diagnostic counts as "4/4". Both records were filled. Routing was run, then `#continuousGlobal` was clicked. **Scenario C** is the same with Qallow = 0.010 m³/s.

| | A (4 runs: zh, zh, en, zh) | C (zh, en) |
|---|---|---|
| Button | enabled | enabled |
| Candidates evaluated | 220 (204 distinct); 147 feasible = 147 on the front (131 distinct) | 76 (4 corners + 72 Halton); 0 feasible; failures: outflow 76, level 1, drain 3, mass 0 |
| Selected design | **A = 346.875 m², b = 0.344676 m** (found in local pass 1) | none |
| ΔSmax | 91.881 m³ | – |
| Hmax | **0.2649 m** (≤ 1.00) | – |
| Qmax | **0.07988 m³/s** (≤ 0.080; the Q constraint is effectively active) | – |
| Drain-down residual | 0.066 % (≤ 1 %) | – |
| Mass-balance residual | 8.31e-11 m³ = 3.8e-11 % of Vin | – |
| Run time (click → result event, headless Chromium) | 24.4, 20.8, 20.0, 20.3 s (Node replication of the 220 routings: 10.3 s) | 5.8, 6.1 s |
| Step 1 | Pass – "Continuous optimization completed" | **Blocked** – "No feasible solution" |
| Step 2 | All Pass (outlet type, Hmax 0.265 ≤ 1.000, Qmax 0.0799 ≤ 0.0800, residual 0.07 % ≤ 1.00 %, free-discharge 4/4) | Outlet type Pass; Hmax, Qmax and drain shown as "Check – Not yet run"; free-discharge "Check" |
| Step 3 | "meets the declared conditions; final engineering-design validation is still required" | "Blocked: no feasible solution…; dominant limits: peak-outflow, maximum-level, drain-down residual", with 3 "Go to fix" buttons |
| Output message | "Advanced continuous optimization — …220 candidates; 147 nondominated…" | "No feasible candidate was found. Binding conditions observed: peak-outflow limit, water-level limit, drain-down residual…" (zh: 沒有可行解。…) |
| Page errors | 0 | 0 |

**Determinism:** all four A runs, in both languages, and audit case 70 (the same inputs) produced bit-identical A, b, Hmax, Qmax and residuals.

**Independent verification of the selected A design** (reroute_check_A.json):
- Interactive (discrete) routing, run after typing A = 346.875 and b = 0.3446759 into the inputs: Qp,o = 0.0799 m³/s, ΔSmax = 91.881 m³, Hmax = 0.265 m, drain residual 0.07 %, ε = 8.310e-11 m³. This matches.
- A direct `DetentionRoutingCore.routeStorage` call gave exactly the same values.
- An independent RK4 written without any repo code (dt = 0.5 s) gave Qmax 0.0798801 m³/s, Hmax 0.2648819 m and ΔSmax 91.88093 m³. These agree to about 1e-12 relative.
- A Node re-implementation of PR:222–231 (replicate.js) reproduces the 220/147 counts and the selected point. For C it reproduces 76 evaluations with 0 feasible.

**Comparison with discrete screening on the same scenarios** (discrete_compare_AC.json):
- Discrete A selects A = 460 m², b = 0.525 m, with ΔSmax 91.989 m³, Hmax 0.200 m and Qmax 0.07981 m³/s, in 14–15 s. It writes these values back to the inputs.
- Continuous mode lowers ΔSmax by only 0.11 m³ (0.12 %), with a quite different (A, b): the objective is flat along the Qmax ≈ Qallow ridge.
- Discrete C is also no-feasible, with the same three dominant limits.

## 3. Randomized misuse audit (continuous mode)

**Harness:** `audit_continuous.js`, derived from misuse_screening/audit.js, which was not modified. It uses the same LCG and case fields with seed **20261011** and N = 100. Two changes:
- To get enough eligible requests, each case is "eligibility-biased" with probability ½ (weir or ori, all evidence, both records). The other cases use the original misuse distribution, plus a new free-evidence mode `noBoundary` in which only `freeDischarge` is unchecked.
- Four targeted gate probes were appended: weir or ori with `noBoundary`, weir + table coefficients, and Hallow < H0.

**Procedure:** each session runs routing and then clicks `#continuousGlobal`. If the button is disabled, it is then **force-enabled and clicked**. This bypass probe tests the authoritative guard at PR:218.

**Checker:** `check_continuous.py`. Output is in `check_continuous_output.txt`; data is in `audit_continuous_100_151405b.json`. The audit took 200 s wall time with 5 parallel pages.

**Outcomes** (104 sessions; 42 eligible by the oracle):
- Eligible: 5 feasible and 37 no-feasible.
- Ineligible: 62/62 had the button disabled. All 62 forced clicks were rejected with "not run", with no search executed and no event dispatched.
- Feasible run times: 20.1–30.8 s, median 23.8 s.

| Invariant | Result |
|---|---|
| I1 Ineligible request shows a feasible case (normal or forced click) | **0** |
| I1b Search executed on an ineligible request | **0** |
| I3 Button enabled-state matches the eligibility oracle | 0 mismatches |
| I4 Feasible result → Step 1 Pass and no Blocked in Step 2 | 0 violations |
| I5 No-feasible result → Step 1 Blocked, ≥ 1 fix button, warn class | 0 violations (37/37 hold) |
| I6 Step 1 Pass without a feasible result | 0 |
| I8 Not passed and no fix link anywhere | 0 |
| I11 Selected design within Qallow, Hallow, residual and the declared A, b/Ao bounds | 0 violations |
| I12/I13 Terminal message present and text matches dispatched event | 0 |
| I7 Page errors or crashes | 0 |
| L1/L2 Continuous-mode output in the wrong language | 0 |
| L3 Diagnostic text in the wrong language (both directions) | 0 |
| L4 Gate text in the wrong language (after interaction) | 0 |
| **I2** Ineligible but no fix link next to the continuous button | **2** (cases 100, 101: only `freeDischarge` unchecked; `firstContinuousGap` omits it, PR:443). The diagnostic still offers "Go to fix: Four free-discharge evidence checks", but its reason text names tailwater/backwater/submergence/operation rather than the boundary confirmation (DG:16). |
| **I2b** Gate status text contradicts the lock | **2** (cases 9, 102: table coefficients; the status says "Continuous mode ready…" although the button is locked and guidance says "not eligible"; `updateContinuousGate` omits `coeffMode`, PR:239) |
| L1x Stale text in the output box while the button was disabled | 27 zh sessions show "Outlet configuration or dimensions changed. Run the design search again…" or the half-translated "出口組合 or dimensions changed…". The source is `invalidateOptimization` (PR:129, English-only), not the continuous code. It is still visible in the same box. |

**Additional observation (probe at initial load):** with the default zh-Hant page and before any input, `continuousGateStatus` and the gate guidance were rendered in English ("Continuous mode locked: …", "Missing free-discharge evidence"). They become zh after the first input or change event.

**Safety invariants held in all 104 sessions:**
- no ineligible request produced a feasible case, even with the disabled attribute bypassed;
- every no-feasible result was marked Blocked in the diagnostic and had fix links;
- the diagnostic was consistent with the result;
- there were no page errors.

The gate-text and fix-link gaps found are presentation-layer issues only.

## Files
In the original working folder (copied here under audit/continuous/):
- Scripts: `scenario.js`, `discrete_compare.js`, `reroute.js`, `replicate.js`, `audit_continuous.js`, `check_continuous.py`
- Scenario and verification outputs: `scenarios_AC.json`, `discrete_compare_AC.json`, `reroute_check_A.json`, `replicate_A.json`, `replicate_C.json`
- Audit outputs: `audit_continuous_100_151405b.json`, `audit_run.log`, `check_continuous_output.txt`

Nothing was BLOCKED.
