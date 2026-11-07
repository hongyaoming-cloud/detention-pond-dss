# E-W1 A-005 HEC-HMS 4.13 native routing verification

Status: HEC-HMS native run completed (2026-09-26). This is a numerical cross-engine check, not field validation or a proof of global design optimum.

## Model and provenance

The files were generated from the included prepared inflow and storage-discharge CSVs using `build_native_hec.py`. HEC-HMS Linux 4.13 was run headlessly with `run.script`; `Route.log` records no parameter errors and the finished simulation. HEC output is in `Route.dss`, with exported series in `*_native.csv`. `read.script` reproduces the extraction.

Time similarity: 1 HEC minute = 0.25 physical second; HEC discharge = physical discharge / 240; storage is unchanged. HEC paired storage values use the required `THOU M3` units (m³ / 1000), whereas exported HEC storage values must be multiplied by 1000. The HEC discharge is multiplied by 240 for physical m³/s. Initial incremental storage is zero. Inflow after 977.25 physical seconds is assumed to decline to zero over the following grid interval; all research comparisons use only 0–977.25 s.

## Common observation window, 0–977.25 s (3910 points)

- HEC physical peak outflow: 0.006138992544600883 m³/s, at 154.5 s.
- HEC maximum incremental storage: 0.5368853556535848 m³, at 154.5 s.
- Input integral: 1.2891228594708082 m³; output integral: 1.269540120979112 m³; final incremental storage: 0.01958273849169667 m³. Trapezoidal-volume residual: -4.41e-16 m³.
- Against an independent RK4 integration at 0.25 physical-second steps, using the *same piecewise-linear transformed Qin and S–Q table*: outflow MAE 6.15e-10 m³/s, RMSE 1.15e-9 m³/s, maximum absolute difference 3.96e-9 m³/s. This checks the routing numerical result under this discretized input; it is not an independent physical calibration.

The prepared source manifest reports 1.2891228625 m³ for the original volume; the ~3.03e-9 m³ discrepancy at 977.25 s is floating-point/input interpolation precision. Over the full extended 1078.25 s, input becomes 1.2891421469714714 m³ because of the explicit one-grid-step decline from the final observed nonzero Qin to zero. Do not compare that extended integral with the original observation-window volume.

## Remaining comparison

The HEC native hydrograph is now available for pointwise DSS/SWMM alignment. The existing SWMM comparison metrics must be recomputed from the actual saved SWMM output on the same 0.25 s grid before presenting a three-engine table. No SWMM values are copied into this package.

For paper methods, describe the volume-preserving time/flow transformation and HEC's Modified Puls routing. The pairwise difference between HEC and RK4 above is not by itself proof of HEC–SWMM agreement. Preserve the native project, source CSVs, model version, and logs with the manuscript supplement.
