# Four-group cross-check (A-005, B-005, C-005, D-005)

Numerical reproduction check, not field validation. Added 2026-10-11 after the paper review; not part of release v1.0.0.

1. `node 01_software_i_groups.js` (writes software_i_groups.json, not tracked) routes the first event of each outlet group through `dist/routing-core.js`
   (RK4, dt = 0.1 s) with the physics of `regression_176.js`. Peaks equal `tests/fixtures/rerun_case_metrics.csv`.
2. `python3 02_scipy_groups.py` re-codes the declared relations in Python (no project code) and integrates them with
   SciPy DOP853 (rtol 1e-10, atol 1e-14), restarting at every inflow node. Output: `cross_engine_groups_results.json`.
3. Negative control: the same script with both discharge coefficients raised by 1 % gives `negative_control_cd_plus1pct.json`.

| Case | Outlet | Peak H diff (%) | Peak Q diff (%) | NSE H | NSE Q | Cd +1 % control: peak Q diff (%) |
|---|---|---|---|---|---|---|
| A-005 | weir 5 cm | 3.3e-5 | 4.0e-5 | >0.99999999994 | >0.99999999996 | 0.44 |
| B-005 | opening 4.2 cm | 2.2e-8 | 1.3e-8 | >0.99999999999 | >0.99999999998 | 0.61 |
| C-005 | weir 5 cm | 1.2e-8 | 1.4e-8 | >0.99999999997 | >0.99999999998 | 0.24 |
| D-005 | opening 4.2 cm | 1.0e-4 | 6.8e-5 | >0.99999999996 | >0.99999999991 | 0.40 |
