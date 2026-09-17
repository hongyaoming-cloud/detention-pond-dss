#!/usr/bin/env python3
"""Export four reproducible Software I cross-model routing benchmarks.

The exports deliberately preserve the laboratory routing equations rather than
substituting a nominal SWMM or HEC-HMS weir/orifice coefficient.  They are for
numerical cross-model verification: all platforms receive identical Qin(t),
initial head, dS/dH, and incremental Qout(H).
"""

from __future__ import annotations

import csv
import json
import math
from pathlib import Path

G = 9.80665
K2, M, Z0, P, OW = 2.4, 1.0, 1.75, 0.05, 0.175
WEIR = {1.0: (0.69831, -0.00343), 1.5: (0.70602, -0.00423), 2.2: (0.62746, 0.00303), 3.3: (0.61019, 0.00466), 5.0: (0.63826, 0.00139), 8.0: (0.57415, 0.00937), 12.0: (0.60565, 0.00081), 17.5: (0.65185, -0.01444)}
ORIFICE = {1.5: (0.64825, 0.00832), 1.8: (0.64702, -0.01592), 2.5: (0.64251, -0.03993), 3.3: (0.62318, -0.00973), 4.2: (0.61495, 0.05179), 5.2: (0.63220, -0.03976), 6.5: (0.62075, 0.08039), 8.5: (0.59692, 0.32869)}
SELECTED = ("A-005", "B-005", "C-005", "D-005")
# The finest selected laboratory record spacing is 0.25 s.  Expanding time by
# 240 maps that spacing to one model minute, while Q/k preserves every volume.
TIME_SCALE = 240.0


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def read_hydrograph(path: Path) -> tuple[float, list[tuple[float, float]]]:
    lines = [line.strip() for line in path.read_text().splitlines() if line.strip()]
    head = float(lines[0].replace(",", " ").split()[0])
    return head, [tuple(map(float, line.replace(",", " ").split()[:2])) for line in lines[1:]]


def discharge(head: float, control: str, size_cm: float) -> float:
    head = max(head, 0.0)
    if control == "Overflow weir":
        a, b = WEIR[size_cm]
        return 2.0 / 3.0 * (a + b * head / P) * (size_cm / 100.0) * math.sqrt(2.0 * G) * head**1.5
    a, b = ORIFICE[size_cm]
    diameter = size_cm / 100.0
    bracket = 1.0 if head <= diameter or head == 0.0 else 1.0 - (1.0 - diameter / head) ** 1.5
    return 2.0 / 3.0 * (a + b * head) * OW * math.sqrt(2.0 * G) * head**1.5 * bracket


def write_rows(path: Path, headers: list[str], rows: list[tuple]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(headers)
        writer.writerows(rows)


def interpolate(t: float, points: list[tuple[float, float]]) -> float:
    if t <= points[0][0]:
        return points[0][1]
    if t >= points[-1][0]:
        return points[-1][1]
    for i in range(1, len(points)):
        if t <= points[i][0]:
            t0, q0 = points[i - 1]
            t1, q1 = points[i]
            return q0 + (q1 - q0) * (t - t0) / (t1 - t0)
    raise RuntimeError("unreachable")


def rk4_reference(inflow: list[tuple[float, float]], h0: float, control: str, size: float) -> list[tuple[float, float, float, float]]:
    """Reference at raw-input times, using the Software I laboratory equation."""
    q0 = discharge(h0, control, size)

    def rhs(t: float, h: float) -> float:
        h = max(h, 0.0)
        qout = max(0.0, discharge(h0 + h, control, size) - q0)
        return (interpolate(t, inflow) - qout) / (K2 * (h0 + h + Z0) ** M)

    h, current_t, output = 0.0, inflow[0][0], []
    for target_t, _ in inflow:
        while current_t < target_t - 1e-12:
            step = min(0.1, target_t - current_t)
            k1 = rhs(current_t, h)
            k2 = rhs(current_t + step / 2.0, h + step * k1 / 2.0)
            k3 = rhs(current_t + step / 2.0, h + step * k2 / 2.0)
            k4 = rhs(current_t + step, h + step * k3)
            h = max(0.0, h + step * (k1 + 2.0 * k2 + 2.0 * k3 + k4) / 6.0)
            current_t += step
        storage = K2 / (M + 1.0) * ((h0 + h + Z0) ** (M + 1.0) - (h0 + Z0) ** (M + 1.0))
        qout = max(0.0, discharge(h0 + h, control, size) - q0)
        output.append((target_t, qout, h, storage))
    return output


def main() -> None:
    root = Path(__file__).resolve().parent
    fixture = root / "tests" / "fixtures"
    records = {row["case_id"]: row for row in read_csv(fixture / "corrected_raw_case_metrics.csv")}
    output = root / "cross_model_benchmarks"
    output.mkdir(exist_ok=True)
    index = []
    for case_id in SELECTED:
        row = records[case_id]
        case_dir = output / case_id
        case_dir.mkdir(exist_ok=True)
        inflow_path = fixture / "raw_hydrographs" / f"{row['group']}_{row['inflow_source_filename']}"
        outflow_path = fixture / "raw_hydrographs" / f"{row['group']}_{row['outflow_source_filename']}"
        _, inflow = read_hydrograph(inflow_path)
        h0, _ = read_hydrograph(outflow_path)
        control, size = row["outlet_control"], float(row["outlet_size_cm"])
        # The laboratory equation is dS/dH = K2(H + Z0)^M.  SWMM's tabular
        # storage curve therefore uses depth-area, while HEC-HMS can use the
        # equivalent integrated depth-storage relation.
        heads = [round(i * 0.005, 3) for i in range(0, 301)]
        storage = [K2 / (M + 1.0) * ((h0 + h + Z0) ** (M + 1.0) - (h0 + Z0) ** (M + 1.0)) for h in heads]
        areas = [K2 * (h0 + h + Z0) ** M for h in heads]
        q0 = discharge(h0, control, size)
        qinc = [max(0.0, discharge(h0 + h, control, size) - q0) for h in heads]
        reference = rk4_reference(inflow, h0, control, size)
        write_rows(case_dir / "inflow_timeseries.csv", ["time_s", "inflow_m3_s"], inflow)
        write_rows(
            case_dir / "cross_model_inflow_timeseries.csv",
            ["model_time_min", "scaled_inflow_m3_s"],
            [(t * TIME_SCALE / 60.0, q / TIME_SCALE) for t, q in inflow],
        )
        write_rows(case_dir / "hec_hms_elevation_storage.csv", ["relative_head_m", "incremental_storage_m3"], list(zip(heads, storage)))
        write_rows(case_dir / "swmm_storage_curve.csv", ["relative_head_m", "surface_area_m2"], list(zip(heads, areas)))
        write_rows(case_dir / "outlet_rating_incremental.csv", ["relative_head_m", "incremental_outflow_m3_s"], list(zip(heads, qinc)))
        write_rows(
            case_dir / "cross_model_outlet_rating.csv",
            ["relative_head_m", "scaled_incremental_outflow_m3_s"],
            [(h, q / TIME_SCALE) for h, q in zip(heads, qinc)],
        )
        write_rows(case_dir / "software_i_reference_output.csv", ["time_s", "outflow_m3_s", "relative_head_m", "incremental_storage_m3"], reference)
        write_rows(
            case_dir / "software_i_self_check_candidate.csv",
            ["model_time_min", "scaled_outflow_m3_s", "relative_head_m", "incremental_storage_m3"],
            [(t * TIME_SCALE / 60.0, q / TIME_SCALE, h, s) for t, q, h, s in reference],
        )
        spec = {
            "case_id": case_id,
            "group": row["group"],
            "inflow_family": row["inflow_family"],
            "physical_outlet": control,
            "outlet_size_cm": size,
            "initial_absolute_head_m": h0,
            "relative_head_reference": "0 m = the observed initial head; output Qout is incremental Q(H0+h)-Q(H0)",
            "time_scaling": {
                "factor": TIME_SCALE,
                "meaning": "one laboratory second equals four model minutes; Qin and Qout are divided by 240, while head and storage are unchanged",
                "comparison_back_transform": "multiply cross-model discharge by 240 and divide cross-model time in minutes by 4 to recover laboratory units",
            },
            "integration": {"software_i": "RK4, dt=0.1 s", "cross_model_interval_min": 1},
            "comparison_outputs": ["relative head", "incremental outflow", "maximum storage", "mass-balance residual"],
            "not_a_claim": "This package tests numerical routing equivalence. It does not validate HEC-HMS/SWMM hydraulic outlet coefficients or provide field validation.",
        }
        (case_dir / "model_spec.json").write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        index.append(spec)
    (output / "benchmark_index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
