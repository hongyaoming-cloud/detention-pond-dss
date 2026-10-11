#!/usr/bin/env python3
"""E-W1 A-005: independent SciPy integration of dS/dt = Qin(t) - Qout(h(S)).

Inputs (same as Software I / EPA SWMM / HEC-HMS):
  data/inflow_timeseries.csv        Qin(t), piecewise-linear between nodes
  data/incremental_tables_h0p001.csv  incremental S(h) and Qout(h), h = 0..0.160 m step 0.001 m
H0 = 0.07399 m, S(0) = 0. Tables are interpolated piecewise-linearly (h(S) by inverse
linear interpolation of the S(h) table, Qout by linear interpolation in h), i.e. the
same tables given to SWMM (area-depth / rating) and HEC-HMS (storage-outflow).

Integration: solve_ivp with rtol=1e-10, atol=1e-12, dense output, restarted at every
Qin breakpoint so that the integrator never steps across a Qin kink. A second state
component accumulates outflow volume exactly, so the mass residual is free of
output-grid quadrature error. Methods: DOP853 (primary) and LSODA (check).
A diagnostic run with the analytic S(h), Qout(h) used by Software I separates
table-interpolation error from integration error.
"""
from __future__ import annotations
import csv, json, sys
from pathlib import Path
import numpy as np
import scipy
from scipy.integrate import solve_ivp

ROOT = Path(__file__).resolve().parent.parent
DATA, RES = ROOT / "data", ROOT / "results"
H0, B, P, G = 0.07399, 0.05, 0.05, 9.80665
RTOL, ATOL, DT = 1e-10, 1e-12, 0.25

qin_tab = np.loadtxt(DATA / "inflow_timeseries.csv", delimiter=",", skiprows=1)
tq, qq = qin_tab[:, 0], qin_tab[:, 1]
tab = np.loadtxt(DATA / "incremental_tables_h0p001.csv", delimiter=",", skiprows=1)
h_t, s_t, q_t = tab[:, 0], tab[:, 2], tab[:, 3]
assert np.all(np.diff(tq) > 0) and np.all(np.diff(s_t) > 0) and np.all(np.diff(q_t) >= 0)

def qin(t):
    return np.interp(t, tq, qq, left=qq[0], right=0.0)

# --- piecewise-linear tables (primary) ---
def h_of_s_table(s):
    if s > s_t[-1]:
        raise RuntimeError("storage beyond table")
    return np.interp(max(s, 0.0), s_t, h_t)

def q_of_h_table(h):
    return np.interp(h, h_t, q_t)

# --- analytic relations used by Software I (diagnostic only) ---
def cd(H): return 0.63826 + 0.00139 * (H / P)
def q_rating(H): return (2/3) * cd(H) * B * np.sqrt(2*G) * max(H, 0.0) ** 1.5
Q0 = q_rating(H0)
def h_of_s_analytic(s): return max(0.0, np.sqrt(max(s, 0.0)/1.2 + (H0+1.75)**2) - (H0+1.75))
def q_of_h_analytic(h): return max(q_rating(H0 + max(h, 0.0)) - Q0, 0.0)

def run(method, h_of_s, q_of_h):
    def rhs(t, y):
        qo = q_of_h(h_of_s(y[0]))
        return [qin(t) - qo, qo]
    grid = np.round(np.arange(0.0, tq[-1] + 1e-9, DT), 10)
    S = np.empty_like(grid); V = np.empty_like(grid)
    y = np.array([0.0, 0.0]); nfev = 0; nseg = 0
    for a, b in zip(tq[:-1], tq[1:]):
        sol = solve_ivp(rhs, (a, b), y, method=method, rtol=RTOL, atol=ATOL, dense_output=True)
        if not sol.success:
            raise RuntimeError(sol.message)
        nfev += sol.nfev; nseg += 1
        m = (grid >= a - 1e-12) & (grid <= b + 1e-12)
        Y = sol.sol(grid[m]); S[m], V[m] = Y[0], Y[1]
        y = sol.y[:, -1]
    h = np.array([h_of_s(s) for s in S]); qo = np.array([q_of_h(x) for x in h])
    vin_exact = float(np.sum((qq[1:] + qq[:-1]) * np.diff(tq) / 2))  # exact for piecewise-linear Qin
    return dict(t=grid, S=S, h=h, H=H0 + h, Q=qo, Qin=qin(grid), Vout_exact=V,
                vin_exact=vin_exact, vout_exact=float(V[-1]), s_end=float(S[-1]),
                residual_exact=vin_exact - float(V[-1]) - float(S[-1]), nfev=nfev, nseg=nseg)

def save(name, r):
    with (DATA / name).open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["model", "time_s", "inflow_m3_s", "relative_head_h_m", "absolute_head_H_m",
                    "storage_increment_m3", "routed_outflow_m3_s", "cumulative_outflow_volume_m3"])
        for i in range(len(r["t"])):
            w.writerow([name.split(".")[0], f"{r['t'][i]:.2f}", f"{r['Qin'][i]:.17g}", f"{r['h'][i]:.17g}",
                        f"{r['H'][i]:.17g}", f"{r['S'][i]:.17g}", f"{r['Q'][i]:.17g}", f"{r['Vout_exact'][i]:.17g}"])

if __name__ == "__main__":
    meta = {"scipy": scipy.__version__, "numpy": np.__version__, "python": sys.version.split()[0],
            "rtol": RTOL, "atol": ATOL, "segments_restarted_at_Qin_nodes": len(tq) - 1, "runs": {}}
    for label, method, hs, qh in [("scipy_DOP853_table", "DOP853", h_of_s_table, q_of_h_table),
                                  ("scipy_LSODA_table", "LSODA", h_of_s_table, q_of_h_table),
                                  ("scipy_DOP853_analytic", "DOP853", h_of_s_analytic, q_of_h_analytic)]:
        r = run(method, hs, qh)
        save(label + ".csv", r)
        meta["runs"][label] = {k: r[k] for k in ("vin_exact", "vout_exact", "s_end", "residual_exact", "nfev")}
        print(label, json.dumps(meta["runs"][label]))
    (RES / "scipy_run_meta.json").write_text(json.dumps(meta, indent=2))
