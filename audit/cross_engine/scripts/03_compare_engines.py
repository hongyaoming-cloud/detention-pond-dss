#!/usr/bin/env python3
"""Compare each engine with the Software I (DSS RK4) reference on the common 0.25 s grid
(0-977.25 s, 3910 points). NSE uses Software I as the reference series.
Mass balance (common-window, same definition as the existing DSS x SWMM report):
  residual = trapz(Qin) - trapz(Qout) - (S_end - S_0) on the 0.25 s grid.
The EPA SWMM row is transcribed from E_W1_A005_DSS_SWMM_cross_validation_report.md
(its series is not stored in the project); its NSE there used SWMM as reference.
HEC-HMS 4.13 (prior native run, 2026-09-26) is included as a supplementary row only."""
from __future__ import annotations
import csv, json
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
DATA, RES = ROOT / "data", ROOT / "results"
H0 = 0.07399
HEC413 = ROOT / "hec_hms_4_13"

def load(name):
    with (DATA / name).open() as f:
        rows = list(csv.DictReader(f))
    g = lambda k: np.array([float(r[k]) for r in rows])
    return dict(t=g("time_s"), Qin=g("inflow_m3_s"), H=g("absolute_head_H_m"),
                S=g("storage_increment_m3"), Q=g("routed_outflow_m3_s"))

ref = load("software_i_reference_dt0p25.csv")
t = ref["t"]; n = len(t)
assert n == 3910 and np.allclose(t, np.arange(n) * 0.25)
trap = lambda y: float(np.sum((y[1:] + y[:-1]) * np.diff(t) / 2))
VIN = trap(ref["Qin"])

engines = {
    "SciPy solve_ivp DOP853 (tables)": load("scipy_DOP853_table.csv"),
    "SciPy solve_ivp LSODA (tables)": load("scipy_LSODA_table.csv"),
    "SciPy solve_ivp DOP853 (analytic S,Q; diagnostic)": load("scipy_DOP853_analytic.csv"),
}
# Supplementary: prior HEC-HMS 4.13 native outputs (1 HEC minute = 0.25 s; Q x240; storage x1000).
tab = np.loadtxt(DATA / "incremental_tables_h0p001.csv", delimiter=",", skiprows=1)
col = lambda f: np.loadtxt(HEC413 / f, delimiter=",", skiprows=1)[:n, 1]
hs = col("storage_native.csv") * 1000.0
engines["HEC-HMS 4.13 native, prior run (supplementary)"] = dict(
    t=t, Qin=col("inflow_native.csv") * 240.0, S=hs, Q=col("outflow_native.csv") * 240.0,
    H=H0 + np.interp(hs, tab[:, 2], tab[:, 0]))
for e in engines.values():
    assert np.allclose(e["t"], t)

def nse(sim, obs): return float(1 - np.sum((sim - obs) ** 2) / np.sum((obs - obs.mean()) ** 2))

def metrics(e):
    out = {}
    for k in ("H", "S", "Q"):
        i, j = int(np.argmax(ref[k])), int(np.argmax(e[k]))
        d = e[k] - ref[k]
        out[k] = dict(si_peak=float(ref[k][i]), si_t=float(t[i]), peak=float(e[k][j]), t_peak=float(t[j]),
                      diff=float(e[k][j] - ref[k][i]), rel_pct=float((e[k][j] - ref[k][i]) / ref[k][i] * 100),
                      dt_peak=float(t[j] - t[i]), nse=nse(e[k], ref[k]), mae=float(np.mean(np.abs(d))),
                      rmse=float(np.sqrt(np.mean(d ** 2))), maxabs=float(np.max(np.abs(d))),
                      maxabs_t=float(t[int(np.argmax(np.abs(d)))]))
    # Peak of incremental head h (relative) for the reader as well
    out["h_rel_peak"] = float(np.max(e["H"]) - H0)
    vout = trap(e["Q"]); ds = float(e["S"][-1] - e["S"][0])
    out["mass"] = dict(vin=VIN, vout=vout, dS=ds, residual=VIN - vout - ds, rel_pct=(VIN - vout - ds) / VIN * 100,
                       vin_engine_input=trap(e["Qin"]))
    return out

M = {"Software I DSS RK4 (dt 0.25 s)": metrics(ref)}
for name, e in engines.items():
    M[name] = metrics(e)
scipy_meta = json.loads((RES / "scipy_run_meta.json").read_text())
M["_scipy_exact_residuals"] = {k: v["residual_exact"] for k, v in scipy_meta["runs"].items()}

# EPA SWMM row transcribed from the existing report (values there: DSS, SWMM, DSS-SWMM, NSE w.r.t. SWMM)
sw = dict(H=(0.192767265, 154.50, 0.192859253, 154.50, 0.999998851),
          S=(0.536886151, 154.50, 0.537315071, 154.50, 0.999998822),
          Q=(0.00613899172, 154.50, 0.0061447623, 154.75, 0.999998242))
swm = {}
for k, (si, sit, v, vt, nse_sw) in sw.items():
    swm[k] = dict(si_peak=si, si_t=sit, peak=v, t_peak=vt, diff=v - si, rel_pct=(v - si) / si * 100,
                  dt_peak=vt - sit, nse_report_swmm_reference=nse_sw)
swm["mass"] = dict(vin=1.2891228625, vout=1.269546869443, dS=0.0195600186, residual=1.59744572017e-05,
                   rel_pct=0.00123917259, native_continuity_error_pct=0.000)
M["EPA SWMM 5.2.4 (from existing report)"] = swm
(RES / "cross_engine_metrics.json").write_text(json.dumps(M, indent=2))

# Combined table CSV
hdr = ["engine", "Hmax_m", "t_Hmax_s", "dHmax_rel_pct", "Smax_m3", "t_Smax_s", "dSmax_rel_pct",
       "Qmax_m3_s", "t_Qmax_s", "dQmax_rel_pct", "NSE_H", "NSE_S", "NSE_Q", "NSE_reference",
       "Vin_m3", "Vout_m3", "dS_m3", "mass_residual_m3", "mass_residual_pct"]
rows = []
for name, m in M.items():
    if name.startswith("_"): continue
    sw_row = "SWMM" in name
    nk = "nse_report_swmm_reference" if sw_row else "nse"
    rows.append([name, m["H"]["peak"], m["H"]["t_peak"], m["H"]["rel_pct"], m["S"]["peak"], m["S"]["t_peak"],
                 m["S"]["rel_pct"], m["Q"]["peak"], m["Q"]["t_peak"], m["Q"]["rel_pct"],
                 m["H"][nk], m["S"][nk], m["Q"][nk], "SWMM" if sw_row else "Software I",
                 m["mass"]["vin"], m["mass"]["vout"], m["mass"]["dS"], m["mass"]["residual"], m["mass"]["rel_pct"]])
with (RES / "cross_engine_combined_table.csv").open("w", newline="") as f:
    w = csv.writer(f); w.writerow(hdr)
    for r in rows: w.writerow([r[0]] + [f"{x:.12g}" if isinstance(x, float) else x for x in r[1:]])

# Aligned series for plotting / audit
with (RES / "cross_engine_aligned_series.csv").open("w", newline="") as f:
    w = csv.writer(f)
    keys = [("si", ref), ("scipy_dop853", engines["SciPy solve_ivp DOP853 (tables)"]),
            ("scipy_lsoda", engines["SciPy solve_ivp LSODA (tables)"]),
            ("hec413", engines["HEC-HMS 4.13 native, prior run (supplementary)"])]
    w.writerow(["time_s", "qin_m3_s"] + [f"{p}_{v}" for p, _ in keys for v in ("H_m", "S_m3", "Q_m3_s")])
    for i in range(n):
        w.writerow([f"{t[i]:.2f}", f"{ref['Qin'][i]:.17g}"] + [f"{e[v][i]:.17g}" for _, e in keys for v in ("H", "S", "Q")])

for name, m in M.items():
    if name.startswith("_"): continue
    print(name)
    for k in ("H", "S", "Q"):
        print("  ", k, {a: m[k][a] for a in m[k]})
    print("   mass", m["mass"])
print(M["_scipy_exact_residuals"])
