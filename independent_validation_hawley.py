#!/usr/bin/env python3
"""Independent event validation of the Software I storage-routing core.

The input workbook is the monitoring-data workbook supplied by Bob Hawley
(`Figure and Table Data for EPA.xlsx`).  The post-retrofit Figure 5 series is
used only to construct empirical S(H) and Q(H) lookup tables.  Figure 6's
2014-04-02 and 2014-06-04 monitored events are then held out and routed from
their observed total inflows.  Thus this test evaluates the core continuity
solver and lookup-table workflow; it does not claim validation of an outlet
geometry whose dimensions/coefficients are absent from the dataset.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
from pathlib import Path

import numpy as np
import openpyxl

CFS_TO_CMS = 0.028316846592
FT_TO_M = 0.3048
FT3_TO_M3 = 0.028316846592


def pchip_linear(x: np.ndarray, y: np.ndarray, value: float) -> float:
    """Bounded linear interpolation, with endpoint extrapolation forbidden."""
    return float(np.interp(value, x, y, left=y[0], right=y[-1]))


def monotone_table(h: np.ndarray, y: np.ndarray, step: float = 0.01) -> tuple[np.ndarray, np.ndarray]:
    bins = np.arange(0.0, float(np.nanmax(h)) + step * 0.5, step)
    hs, ys = [], []
    for lo in bins:
        values = y[(h >= lo) & (h < lo + step)]
        if values.size:
            hs.append(lo + step / 2.0)
            ys.append(float(np.nanmedian(values)))
    h_out = np.asarray(hs)
    y_out = np.asarray(ys)
    # A physical lookup table must not decrease with water level.  This is a
    # conservative envelope, not a fitted outlet-coefficient calibration.
    y_out = np.maximum.accumulate(y_out)
    return h_out, y_out


def load_post_retrofit_tables(workbook: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    ws = openpyxl.load_workbook(workbook, read_only=True, data_only=True)["Figure 5"]
    depth, storage, outflow = [], [], []
    # Post-retrofit fields, zero-indexed: time, inflow, storage ft3, storage m3,
    # elevation ft, primary outflow cfs, depth ft.
    for row in ws.iter_rows(min_row=6, values_only=True):
        values = row[9:16]
        if not all(isinstance(v, (int, float)) and math.isfinite(v) for v in values):
            continue
        depth.append(values[6] * FT_TO_M)
        storage.append(values[3])
        outflow.append(values[5] * CFS_TO_CMS)
    h = np.asarray(depth)
    s = np.asarray(storage)
    q = np.asarray(outflow)
    h_s, s_h = monotone_table(h, s)
    h_q, q_h = monotone_table(h, q)
    return h_s, s_h, h_q, q_h


def split_events(workbook: Path) -> list[tuple[str, list[tuple[dt.datetime, float, float]]]]:
    ws = openpyxl.load_workbook(workbook, read_only=True, data_only=True)["Figure 6"]
    rows = []
    for row in ws.iter_rows(min_row=8, values_only=True):
        if not isinstance(row[0], dt.datetime):
            continue
        if not isinstance(row[9], (int, float)) or not isinstance(row[13], (int, float)):
            continue
        rows.append((row[0], float(row[9]), float(row[13])))
    groups, current = [], []
    for item in rows:
        if current and (item[0] - current[-1][0]).total_seconds() > 3600:
            groups.append(current)
            current = []
        current.append(item)
    if current:
        groups.append(current)
    # Only complete monitored events with observed non-zero total inflow.
    return [
        (g[0][0].strftime("%Y-%m-%d"), g)
        for g in groups
        if max(x[1] for x in g) > 0.0 and len(g) >= 8
    ]


def inverse_lookup(x: np.ndarray, y: np.ndarray, target: float) -> float:
    unique_y, index = np.unique(y, return_index=True)
    return pchip_linear(unique_y, x[index], target)


def route_event(
    event: list[tuple[dt.datetime, float, float]],
    h_s: np.ndarray,
    s_h: np.ndarray,
    h_q: np.ndarray,
    q_h: np.ndarray,
) -> dict:
    t = np.array([(r[0] - event[0][0]).total_seconds() for r in event], dtype=float)
    qin = np.array([r[1] for r in event], dtype=float)
    qobs = np.array([r[2] for r in event], dtype=float)
    # Figure 6 already provides outflow under the explicitly labelled
    # "Shifted Time" alignment.  Keep each row paired to its corresponding
    # total inflow value rather than imposing a second lag correction.
    h = inverse_lookup(h_q, q_h, max(float(qobs[0]), float(q_h[0])))
    storage = pchip_linear(h_s, s_h, h)
    qsim = [pchip_linear(h_q, q_h, h)]
    hsim = [h]
    ssim = [storage]
    internal_step = 60.0
    for i in range(1, len(t)):
        span = t[i] - t[i - 1]
        if span <= 0:
            raise ValueError("event times must increase")
        n = max(1, int(math.ceil(span / internal_step)))
        ds = span / n
        for j in range(n):
            alpha = (j + 0.5) / n
            qin_mid = qin[i - 1] + alpha * (qin[i] - qin[i - 1])
            h = inverse_lookup(h_s, s_h, storage)
            qout = pchip_linear(h_q, q_h, h)
            storage = max(float(s_h[0]), storage + ds * (qin_mid - qout))
        h = inverse_lookup(h_s, s_h, storage)
        qsim.append(pchip_linear(h_q, q_h, h))
        hsim.append(h)
        ssim.append(storage)
    qsim = np.asarray(qsim)
    residual = qsim - qobs
    denom = float(np.sum((qobs - np.mean(qobs)) ** 2))
    nse = 1.0 - float(np.sum(residual**2)) / denom if denom else float("nan")
    rmse = float(np.sqrt(np.mean(residual**2)))
    mean_obs = float(np.mean(qobs))
    std_sim, std_obs = float(np.std(qsim)), float(np.std(qobs))
    corr = float(np.corrcoef(qsim, qobs)[0, 1]) if std_sim and std_obs else float("nan")
    alpha = std_sim / std_obs if std_obs else float("nan")
    beta = float(np.mean(qsim)) / mean_obs if mean_obs else float("nan")
    kge = 1.0 - math.sqrt((corr - 1) ** 2 + (alpha - 1) ** 2 + (beta - 1) ** 2)
    pvol_obs = float(np.trapezoid(qobs, t))
    pvol_sim = float(np.trapezoid(qsim, t))
    peak_obs_i, peak_sim_i = int(np.argmax(qobs)), int(np.argmax(qsim))
    return {
        "records": int(len(t)),
        "duration_hr": round(float(t[-1] / 3600), 3),
        "peak_inflow_m3s": round(float(np.max(qin)), 6),
        "peak_observed_outflow_m3s": round(float(np.max(qobs)), 6),
        "peak_simulated_outflow_m3s": round(float(np.max(qsim)), 6),
        "peak_error_percent": round(100.0 * (float(np.max(qsim)) - float(np.max(qobs))) / float(np.max(qobs)), 3),
        "peak_timing_error_min": round(float((t[peak_sim_i] - t[peak_obs_i]) / 60), 3),
        "nse": round(nse, 4),
        "kge": round(kge, 4),
        "rmse_m3s": round(rmse, 6),
        "pbias_percent": round(100.0 * (pvol_sim - pvol_obs) / pvol_obs, 3),
        "simulated_peak_level_m": round(float(np.max(hsim)), 4),
        "initial_storage_m3": round(float(ssim[0]), 3),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()
    h_s, s_h, h_q, q_h = load_post_retrofit_tables(args.workbook)
    results = {}
    for name, event in split_events(args.workbook):
        results[name] = route_event(event, h_s, s_h, h_q, q_h)
    payload = {
        "source": "Hawley monitoring-data workbook, Figure 5 post-retrofit lookup data and Figure 6 held-out monitored events",
        "validation_scope": "screening of known-inflow S(H)-Q(H) storage routing only; no generic physical-outlet geometry validation",
        "admissibility": {
            "status": "not accepted as a formal independent validation dataset for this application",
            "reason": "Figure 5 has no event-date key that joins its S(H)/Q(H) records to Figure 6's monitored events. The outlet geometry and coefficient history are also not supplied. The numerical comparisons are therefore retained as a reproducible data-consistency screen, not reported as a model-validation pass or failure.",
        },
        "lookup_points": {"storage": int(len(h_s)), "outflow": int(len(h_q))},
        "events": results,
    }
    rendered = json.dumps(payload, indent=2, ensure_ascii=False)
    if args.output:
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
