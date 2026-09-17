#!/usr/bin/env python3
"""Compare transformed HEC-HMS or SWMM routing output with Software I output."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import numpy as np

TIME_SCALE = 240.0
TIME_KEY = ("model_time_min", "time_min", "time")
FLOW_KEY = ("scaled_outflow_m3_s", "outflow_m3_s", "outflow")
HEAD_KEY = ("relative_head_m", "head_m", "depth_m")
STORAGE_KEY = ("incremental_storage_m3", "storage_m3", "storage")


def pick(row: dict[str, str], names: tuple[str, ...]) -> float:
    for name in names:
        if name in row and row[name] not in ("", None):
            return float(row[name])
    raise ValueError(f"missing one of: {', '.join(names)}")


def load_reference(path: Path) -> np.ndarray:
    with path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    return np.asarray([[float(r["time_s"]), float(r["outflow_m3_s"]), float(r["relative_head_m"]), float(r["incremental_storage_m3"])] for r in rows])


def load_candidate(path: Path) -> np.ndarray:
    with path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    values = [[pick(r, TIME_KEY) * 60.0 / TIME_SCALE, pick(r, FLOW_KEY) * TIME_SCALE, pick(r, HEAD_KEY), pick(r, STORAGE_KEY)] for r in rows]
    values.sort(key=lambda x: x[0])
    return np.asarray(values)


def metrics(ref: np.ndarray, candidate: np.ndarray) -> dict:
    if candidate[0, 0] > ref[0, 0] or candidate[-1, 0] < ref[-1, 0]:
        raise ValueError("candidate output does not cover the full reference duration")
    fitted = np.column_stack([ref[:, 0]] + [np.interp(ref[:, 0], candidate[:, 0], candidate[:, i]) for i in range(1, 4)])
    qref, qmod = ref[:, 1], fitted[:, 1]
    href, hmod = ref[:, 2], fitted[:, 2]
    sref, smod = ref[:, 3], fitted[:, 3]
    residual = qmod - qref
    nse_denom = float(np.sum((qref - np.mean(qref)) ** 2))
    peak_ref, peak_mod = int(np.argmax(qref)), int(np.argmax(qmod))
    peak_q_error = 100.0 * (qmod[peak_mod] - qref[peak_ref]) / qref[peak_ref]
    max_storage_ref, max_storage_mod = float(np.max(sref)), float(np.max(smod))
    storage_error = 100.0 * (max_storage_mod - max_storage_ref) / max_storage_ref
    peak_time_error = float(ref[peak_mod, 0] - ref[peak_ref, 0])
    return {
        "records_compared": int(len(ref)),
        "outflow_rmse_m3_s": round(float(np.sqrt(np.mean(residual**2))), 9),
        "outflow_mae_m3_s": round(float(np.mean(np.abs(residual))), 9),
        "outflow_nse": round(1.0 - float(np.sum(residual**2)) / nse_denom, 7),
        "peak_outflow_error_percent": round(float(peak_q_error), 6),
        "peak_time_error_s": round(peak_time_error, 6),
        "maximum_storage_error_percent": round(float(storage_error), 6),
        "maximum_head_error_m": round(float(np.max(np.abs(hmod - href))), 9),
        "pass": bool(abs(peak_q_error) <= 0.5 and abs(storage_error) <= 0.5 and abs(peak_time_error) <= 0.25),
        "acceptance": "peak outflow and maximum storage <=0.5%; peak time <=0.25 s after back-transformation",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("reference", type=Path)
    parser.add_argument("candidate", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    result = metrics(load_reference(args.reference), load_candidate(args.candidate))
    rendered = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)


if __name__ == "__main__":
    main()
