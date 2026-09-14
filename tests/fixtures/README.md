# Fixed laboratory regression fixtures

This directory holds 352 immutable raw histories: one inflow and one observed
outflow record for each of 176 detention-pond experiments.  `regression_176.py`
reruns every case with the documented storage/outlet equations and compares its
outputs with `rerun_case_metrics.csv`.  It is the release-gate validation suite;
the browser user interface does not silently claim to execute it.

Expected peak-discharge MARE (%): A 2.924, B 2.954, C 4.104, D 4.649.
