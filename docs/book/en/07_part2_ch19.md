## Chapter 19  Cross-checks with HEC-HMS and SWMM

### 19.1 Why cross-check

Different programs use different numerical methods. If the inputs are exactly the same but the results differ a lot, at least one side has an error in its inputs, units or settings. A cross-check can find such errors, but it only shows "numerical consistency". It does not show that the results match field conditions.

### 19.2 Built-in example: E-W1 A-005

PondGate has a read-only verification case, E-W1 A-005. It is a laboratory-scale case with a single weir. The event lasts from 0 to 977.25 s, and the initial level is H0 = 0.07399 m. The stage–storage and outflow equations of the case are fixed on the page and do not change your normal routing inputs.

1. On the "Results, verification and records" page, find the "E-W1 A-005 external cross-check benchmark".
2. Press "Run E-W1 A-005 benchmark RK4".
3. Then press "Time-step sensitivity (0.125 / 0.250 / 0.500 s)".

### 19.3 Comparison of three engines

The three-engine table on the page compares the stored results of PondGate (DSS RK4, Δt = 0.25 s), EPA SWMM 5.2.4 and HEC-HMS 4.13 over a common window of 3,910 time points.

| Engine | Peak outflow (m³/s) | Peak time (s) |
| --- | --- | --- |
| PondGate RK4 | 0.00613899 | 154.50 |
| HEC-HMS 4.13 | 0.00613899 | 154.50 |
| EPA SWMM 5.2.4 | 0.00614476 | 154.75 |

| Pair | Outflow RMSE (m³/s) |
| --- | --- |
| HEC-HMS and PondGate | 8.57 × 10⁻⁹ |
| HEC-HMS and SWMM | 2.30 × 10⁻⁶ |
| PondGate and SWMM | 2.30 × 10⁻⁶ |

The peaks of the three engines differ by less than 0.1 %. HEC-HMS uses the Modified Puls method. To match its one-minute computation interval, the case uses a volume-conserving conversion of time and discharge: one HEC minute stands for 0.25 s of the original record, the HEC discharge is 1/240 of the original discharge, and the output is converted back to the original scale.

### 19.4 Time-step sensitivity

| RK4 step | Maximum outflow (m³/s) | Mass residual (m³) |
| --- | --- | --- |
| 0.125 s | 6.13899 × 10⁻³ | 2.49 × 10⁻¹⁰ |
| 0.250 s | 6.13899 × 10⁻³ | 9.98 × 10⁻¹⁰ |
| 0.500 s | 6.13893 × 10⁻³ | −7.93 × 10⁻⁵ |

When the step grows from 0.125 s to 0.500 s, the maximum outflow changes by only about 0.001 %, so a 0.25-second step is enough.

### 19.5 Compare your own case

1. Build the same pond in HEC-HMS or SWMM: the same inflow, initial level, stage–storage relation, outlet equation and coefficients.
2. Save the actual simulation results of the external model as a CSV. The first row holds the column names. The required columns are time_s (or time, t) and outflow_m3_s (or qout, qo); a full comparison also needs incremental_storage_m3. Press "Download external-output CSV template" for an example of the format.
3. In the "External-model cross check", choose the reference hydrograph (the current routing result or one of the public benchmarks A-005 to D-005) and the external model, import the CSV and press "Compare external result".

Common causes of disagreement are different units (L/s and m³/s), different time bases (minutes and seconds), different datums and different coefficients in the external model.

### 19.6 Exercises

1. Why is the difference between HEC-HMS and PondGate much smaller than that between SWMM and PondGate? Hint: look at the data and methods each one uses.
2. If the outflow peak of the external model is 240 times larger than that of PondGate, what is the most likely error?
