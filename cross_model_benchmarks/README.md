# Cross-model routing benchmarks

Run `python3 export_cross_model_benchmarks.py` from the project root to create
the four benchmark folders. Cases A-005, B-005, C-005 and D-005 cover triangular
and trapezoidal inflows, overflow-weir and rectangular-orifice laboratory cases.

## Common physical definition

All platforms use the same relative head, `h`, whose zero is the initial
observed head `H0`. The exported relationships are:

\[
S(h)=\frac{K_2}{M+1}\left[(H_0+h+Z_0)^{M+1}-(H_0+Z_0)^{M+1}\right]
\]

and `Qinc(h) = Q(H0+h) − Q(H0)`, limited to zero below the initial head.
This treatment is necessary because the laboratory records and Software I route
incremental inflow and outflow about their observed base condition.

## HEC-HMS configuration

Create one reservoir per case. Import `cross_model_inflow_timeseries.csv` as
the inlet hydrograph; set initial storage to zero; import
`hec_hms_elevation_storage.csv` as the relative elevation-storage curve; and
use `cross_model_outlet_rating.csv` as the relative elevation-discharge curve.
Use a one-minute computation and reporting interval. Do not substitute the HEC-HMS default weir or
orifice form for the exported rating curve in this numerical-equivalence test.

## SWMM configuration

Create one storage unit with zero initial depth, no infiltration/exfiltration,
and a tabular storage curve from `swmm_storage_curve.csv` (depth versus surface
area). Apply `cross_model_inflow_timeseries.csv` as direct external inflow. Connect a
TABULAR outlet with `cross_model_outlet_rating.csv` (depth versus flow) to a
free outfall. Use CMS flow units and a one-minute routing/report interval. Do not
use an equation-based SWMM weir/orifice for this test.

## Acceptance rule

The cross-model files use a conservative time expansion: one laboratory second
equals four model minutes, and both inflow and outflow are divided by 240.
Before comparison, multiply HEC-HMS/SWMM discharge by 240 and divide model time
in minutes by four. Compare the transformed outputs with Software I at common
laboratory-time points. For each case, require absolute peak-outflow difference ≤ 0.5%,
peak-time difference ≤ one reporting interval, maximum-storage difference
≤ 0.5%, and mass-balance residual ≤ 0.1%. A failure is a cross-model
investigation trigger, not evidence that any single implementation is wrong.

This is verification, not independent field validation. The 176 raw laboratory
histories remain the experimental-validation dataset; a field pass requires
time-aligned monitored inflow, pond stage, observed outflow, stage-storage
relation and outlet geometry for the same event.

`software_i_reference_output.csv` is the Software I RK4 result at raw
laboratory times. After exporting HEC-HMS or SWMM results with columns for
model time, scaled outflow, relative head and storage, run
`compare_cross_model_outputs.py reference.csv candidate.csv`. The comparator
restores the time and discharge scales, then reports RMSE, MAE, NSE, peak,
head and maximum-storage differences. `software_i_self_check_candidate.csv`
is included only to confirm the comparison workflow; it is not an external
model result.
