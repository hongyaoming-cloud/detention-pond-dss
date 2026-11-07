# E-W1 A-005: Software I compared with SciPy, HEC-HMS and EPA SWMM

Date: 2026-10-11. This is a numerical cross-engine check for one fixed benchmark. It is not field validation.

## Status

| Engine | Status |
|---|---|
| SciPy `solve_ivp` (DOP853 primary, LSODA check) | **DONE.** New run in this folder. |
| HEC-HMS 4.14 (Linux, headless) | **BLOCKED.** No 4.14 results exist, and none were fabricated (see below). |
| EPA SWMM 5.2.4 | Existing result. Values are copied from `08_Zenodo/05_EW1_SWMM_Validation/E_W1_A005_DSS_SWMM_cross_validation_report.md`. |
| HEC-HMS 4.13 (prior native run, 2026-09-26) | Supplementary only. It was re-scored here from its stored native CSVs. It is **not** a 4.14 run. |

## Common inputs (identical for all engines)

- **Inflow:** Qin(t) from `dist/benchmarks/E-W1-A-005/inflow_timeseries.csv` (1,920 nodes, linear between nodes, 0–977.25 s). The file is copied to `data/inflow_timeseries.csv` (sha256 `8ad340ad…f8ed`).
- **Initial state:** H0 = 0.07399 m and incremental S(0) = 0.
- **Tables:** incremental S(h) and incremental Qout(h) at h = 0 to 0.160 m, in 0.001 m steps (161 stage points), stored in `data/incremental_tables_h0p001.csv`.
  - These were generated from the relations Software I uses.
  - They equal the SWMM `STOR_CURVE` and `OUTLET_RATING` tables (×240 time scaling).
  - They equal the HEC-HMS 4.13 storage–outflow table, so storage and discharge are matched at the same stage points.
- **Comparison grid:** 0.25 s, 0–977.25 s, 3,910 points.
- **NSE:** computed with Software I as the observed series.
- **Mass residual:** trapz(Qin) − trapz(Qout) − (S_end − S_0) on the 0.25 s grid. This is the same definition as the SWMM report.

### Software I reference

`scripts/01_software_i_reference.js` calls `DetentionRoutingCore.routeStorage` (`software-i-rk4-v1`, `dist/routing-core.js`, sha256 `f8b7c450…240f`) in Node. The call is made exactly as `ew1-a005-benchmark.js` does: RK4, dt = 0.25 s, landing on the Qin nodes, tailSeconds = 0.

The result reproduces the report's DSS values:

| Quantity | Value |
|---|---|
| Hmax | 0.192767265 m @ 154.5 s |
| Qmax | 0.00613899172 m³/s |
| Vout | 1.269537269951 m³ |
| Residual | 9.976e-10 m³ |

The repository was not modified.

**Software I does not interpolate tables.** It uses the closed-form S(h) and weir Qout(h). The other engines use the piecewise-linear 0.001 m tables.

### SciPy

`scripts/02_scipy_solve_ivp.py` integrates dS/dt = Qin(t) − Qout(h(S)) with these settings:

- h(S) is the inverse linear interpolation of the S(h) table, and Qout is linear in h.
- rtol = 1e-10, atol = 1e-12, dense output.
- The integrator restarts at every Qin node, so no step crosses a Qin kink.
- An extra state variable integrates Vout exactly.
- Versions: SciPy 1.17.1, NumPy 2.4.6.

A diagnostic DOP853 run uses the closed-form relations instead of the tables.

## Combined comparison against Software I (common 0.25 s grid)

Relative difference = (engine − Software I) / Software I at each series' own peak. Software I peaks are Hmax 0.192767265 m, Smax 0.536886151 m³ and Qout,max 0.00613899172 m³/s, all at 154.50 s.

| Engine | Hmax (m) @ t | ΔHmax | Smax (m³) @ t | ΔSmax | Qout,max (m³/s) @ t | ΔQmax | NSE H | NSE S | NSE Qout | Mass residual (m³, % of Vin) |
|---|---|---:|---|---:|---|---:|---:|---:|---:|---|
| Software I, RK4 0.25 s (reference) | 0.192767265 @ 154.50 | — | 0.536886151 @ 154.50 | — | 0.00613899172 @ 154.50 | — | 1 | 1 | 1 | 9.98e-10 (7.7e-8 %) |
| **SciPy DOP853, tables** | 0.192767010 @ 154.50 | −1.32e-4 % | 0.536885171 @ 154.50 | −1.83e-4 % | 0.00613899021 @ 154.50 | −2.45e-5 % | 0.99999999984 | 0.99999999988 | 0.99999999998 | 3.5e-12 (2.7e-10 %); exact-integral 6.6e-15 |
| SciPy LSODA, tables | 0.192767009 @ 154.50 | −1.33e-4 % | 0.536885166 @ 154.50 | −1.84e-4 % | 0.00613899015 @ 154.50 | −2.56e-5 % | 0.99999999984 | 0.99999999988 | 0.99999999998 | 8.9e-9 (6.9e-7 %); exact-integral 1.5e-8 |
| HEC-HMS 4.14 | BLOCKED | — | BLOCKED | — | BLOCKED | — | — | — | — | — |
| EPA SWMM 5.2.4 (copied from the existing report) | 0.192859253 @ 154.50 | +0.0477 % | 0.537315071 @ 154.50 | +0.0799 % | 0.0061447623 @ 154.75 | +0.0940 % | 0.999998851† | 0.999998822† | 0.999998242† | 1.60e-5 (0.00124 %); native continuity 0.000 % |
| *Supplementary: HEC-HMS 4.13, prior native run* | 0.192767050 @ 154.50 | −1.12e-4 % | 0.536885356 @ 154.50 | −1.48e-4 % | 0.00613899254 @ 154.50 | +1.34e-5 % | 0.99999999984 | 0.99999999988 | 0.99999999998 | 3.0e-9 (2.3e-7 %)‡ |

Notes on the table:

- Every peak time equals Software I's peak time on the grid (Δt = 0), except SWMM's Qout,max, which is +0.25 s later.
- **†** These SWMM NSE values come from the report, which used **SWMM as the reference**. The SWMM time series is not stored in the project (only `.inp` and `.rpt`), so NSE with Software I as reference could not be recomputed. The SWMM relative differences above are recomputed from the peak values in the report.
- **‡** This residual uses the common Software I Qin grid. Measured against HEC's own transformed inflow, the residual is −4.4e-16 m³.
- For SWMM, Vout = 1.269546869 m³ and ΔS = 0.019560019 m³.

### Pointwise error statistics against Software I

| Engine | RMSE H (m) | RMSE S (m³) | RMSE Qout (m³/s) | max\|ΔQout\| (m³/s) |
|---|---:|---:|---:|---:|
| SciPy DOP853, tables | 4.31e-7 | 1.69e-6 | 8.63e-9 | 2.85e-8 @ 11.0 s |
| SciPy LSODA, tables | 4.31e-7 | 1.69e-6 | 8.63e-9 | 2.85e-8 @ 11.0 s |
| HEC-HMS 4.13 (supplementary) | 4.33e-7 | 1.70e-6 | 8.57e-9 | 2.83e-8 @ 11.0 s |
| EPA SWMM 5.2.4 (report) | 3.68e-5 | 1.68e-4 | 2.30e-6 | 7.59e-6 @ 178.5 s |

## Interpretation

1. **Software I's RK4 time-stepping error at 0.25 s is negligible.** The SciPy DOP853 run with the same closed-form relations reproduces Software I to within 1e-12 for all three series. The details are:
   - max\|ΔH\| = 2.3e-13 m, max\|ΔS\| = 1.1e-12 m³, max\|ΔQ\| = 1.4e-14 m³/s.
   - NSE = 1 to machine precision.
   - The file is `data/scipy_DOP853_analytic.csv`.
2. **The table-based differences (about 1e-4 % at the peaks) come from interpolating the 0.001 m tables, not from the solver.**
   - Linear chords of the convex weir curve give a slightly larger Q at the same h. Storage and head are therefore marginally lower, with a final ΔS of about −2.9e-6 m³.
   - DOP853 and LSODA agree to max\|ΔQ\| = 8e-11 m³/s.
3. **The HEC-HMS 4.13 Modified Puls error is small for this case.**
   - The prior 4.13 run uses a 1-minute scaled step, equal to 0.25 s physical. It differs from the converged SciPy table solution by RMSE 1.15e-9 m³/s (max 3.97e-9) in Qout and 9.5e-8 m³ in S.
   - Its peak Qout is slightly higher than Software I's (+1.3e-5 %), while H and S are lower. This fits a Modified Puls scheme on a linearly interpolated S–Q table.
   - HEC-HMS 4.14 may differ, and it was not run.
4. **SWMM's differences are about 300 times larger than the table effect.**
   - The figures are +0.048 % in Hmax, +0.080 % in Smax, +0.094 % in Qout,max, and a 0.25 s later Qout peak.
   - They likely come from SWMM's dynamic-wave storage-node and outlet scheme, its 60 s scaled routing step, and single-precision binary output, rather than from the input tables.

## HEC-HMS 4.14: BLOCKED

- **What failed:** every HTTPS request to the official HEC site was refused by the sandbox egress proxy with `CONNECT tunnel failed, response 403` (policy denial). Hosts tried: `www.hec.usace.army.mil/software/hec-hms/downloads.aspx`, `www.hec.usace.army.mil` and `hec.usace.army.mil`.
- **Logs:** the proxy status log records `connect_rejected` for both hosts (`results/hec_hms_4_14_BLOCKED_log.txt`, `scripts/04_hec_hms_414_attempt.sh`).
- **Other sources:** none were used. No HEC-HMS install exists locally. Java (OpenJDK 21.0.11) is available, so Java was not the blocker.
- **Consequences:** no 4.14 model was built or run, and no 4.14 numbers are reported.
- **Ready-made template:** the prior 4.13 project, with a Source → Reservoir element using Modified Puls on a storage–outflow table, a 1-minute step at 1 min = 0.25 s, and the `hec-hms.sh -s` Jython scripts, is at `knowledge/DP_DRIVE/05_Validation/E_W1_A005_three_engine_validation_bundle.zip__/E_W1_A005_HEC_HMS_4_13_native_run.zip__/`.
- **To unblock:** allow egress to `www.hec.usace.army.mil`, or supply the 4.14 Linux tarball. The 4.13 template can then be re-run with `Version: 4.14` to complete this row.

## Files (this folder)

- `scripts/01_software_i_reference.js`: Software I reference series and tables, produced via `routing-core.js`.
- `scripts/02_scipy_solve_ivp.py`: SciPy integration.
- `scripts/03_compare_engines.py`: metrics and the combined table.
- `scripts/04_hec_hms_414_attempt.sh`: the HEC-HMS 4.14 download attempt.
- `data/`: the inflow and tables, `software_i_reference_dt0p25.csv`, `scipy_DOP853_table.csv`, `scipy_LSODA_table.csv`, `scipy_DOP853_analytic.csv` and `software_i_run_meta.json`.
- `results/`:
  - `cross_engine_combined_table.csv`
  - `cross_engine_metrics.json`, with full-precision values including MAE, RMSE and max-abs for H, S and Q
  - `cross_engine_aligned_series.csv`
  - `scipy_run_meta.json`
  - `hec_hms_4_14_BLOCKED_log.txt`

To reproduce, run from this folder: `node scripts/01_software_i_reference.js && python3 scripts/02_scipy_solve_ivp.py && python3 scripts/03_compare_engines.py`.
