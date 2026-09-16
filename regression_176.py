"""Release-gate regression suite for the 176 raw laboratory hydrograph fixtures.

The fixture files are immutable inputs.  This script reruns the published
level-pool formulation and checks the numerical peaks against the versioned
reference table created from the same raw records.
"""
from __future__ import annotations

import csv
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
FX = ROOT / "tests" / "fixtures"
RAW = FX / "raw_hydrographs"
G, K2, M, Z0, P, OW = 9.80665, 2.4, 1.0, 1.75, 0.05, 0.175
WEIR = {1.0:(.69831,-.00343),1.5:(.70602,-.00423),2.2:(.62746,.00303),3.3:(.61019,.00466),5.0:(.63826,.00139),8.0:(.57415,.00937),12.0:(.60565,.00081),17.5:(.65185,-.01444)}
ORIFICE = {1.5:(.64825,.00832),1.8:(.64702,-.01592),2.5:(.64251,-.03993),3.3:(.62318,-.00973),4.2:(.61495,.05179),5.2:(.63220,-.03976),6.5:(.62075,.08039),8.5:(.59692,.32869)}

def read(path):
    lines = [x.strip() for x in path.read_text(errors="replace").splitlines() if x.strip()]
    data = np.asarray([[float(z) for z in x.replace(",", " ").split()[:2]] for x in lines[1:]])
    return float(lines[0].split()[0]), data[:,0], data[:,1]

def resolve(group, name):
    candidate = RAW / f"{group}_{name}"
    if candidate.exists(): return candidate
    return {p.name.lower():p for p in RAW.glob(f"{group}_*")}[candidate.name.lower()]

def outlet(H, control, size):
    H=max(H,0.0)
    if control == "Overflow weir":
        a,b=WEIR[float(size)]; return 2/3*(a+b*H/P)*(float(size)/100)*np.sqrt(2*G)*H**1.5
    a,b=ORIFICE[float(size)]; D=float(size)/100; bracket=1 if H<=D or H==0 else 1-(1-D/H)**1.5
    return 2/3*(a+b*H)*OW*np.sqrt(2*G)*H**1.5*bracket

def rerun(ti, qi, h0, control, size, dt=.1):
    q0=outlet(h0,control,size); end=float(ti[-1]); limit=end+max(1800.,3*end); t=h=0.; qmax=-1.; tmax=0.
    def rhs(tt, hh):
        qin = float(np.interp(tt,ti,qi,left=qi[0],right=0.)) if tt <= end else 0.
        qout = max(outlet(h0 + max(hh, 0), control, size) - q0, 0.)
        return (qin - qout) / (K2 * (h0 + max(hh, 0) + Z0) ** M)
    while t<=limit:
        q=max(outlet(h0+max(h,0),control,size)-q0,0.)
        if q>qmax: qmax,tmax=q,t
        if t>end and h<1e-8 and q<1e-8: break
        k1=rhs(t,h); k2=rhs(t+dt/2,max(h+dt*k1/2,0)); k3=rhs(t+dt/2,max(h+dt*k2/2,0)); k4=rhs(t+dt,max(h+dt*k3,0))
        h=max(h+dt*(k1+2*k2+2*k3+k4)/6,0); t+=dt
    return qmax,tmax

def main(manifest_path=None):
    expected=pd.read_csv(FX/"rerun_case_metrics.csv")
    source=pd.read_csv(FX/"corrected_raw_case_metrics.csv")
    assert len(expected)==len(source)==176, "fixture count must be 176"
    failures=[]; computed=[]
    for _,r in source.iterrows():
        _,ti,qi=read(resolve(r.group,r.inflow_source_filename)); h0,_,_=read(resolve(r.group,r.outflow_source_filename))
        q,t=rerun(ti,qi,h0,r.outlet_control,r.outlet_size_cm); ref=expected.loc[expected.case_id==r.case_id].iloc[0]
        dq=abs(q-ref.numerical_peak_m3_s); dt=abs(t-ref.numerical_peak_time_s)
        computed.append((r.group,100*abs(q-r.raw_outflow_peak_m3_s)/r.raw_outflow_peak_m3_s))
        if dq>1e-10 or dt>1e-6: failures.append(f"{r.case_id}: ΔQ={dq:.3g}, Δt={dt:.3g}")
    mares={g:float(np.mean([x[1] for x in computed if x[0]==g])) for g in "ABCD"}
    targets={"A":2.924,"B":2.954,"C":4.104,"D":4.649}
    for g in targets:
        if abs(mares[g]-targets[g])>.001: failures.append(f"group {g} MARE={mares[g]:.3f}%")
    summary={
        "schema":"detention-routing-regression/v1",
        "fixture_suite":"fixed laboratory regression fixtures",
        "cases":176,
        "series":352,
        "groups":{"A":48,"B":48,"C":40,"D":40},
        "hydrograph_forms":{"triangular":96,"long_duration":80},
        "validated_outlets":["passive overflow weir","rectangular orifice"],
        "excluded_from_validation":["riser","circular opening or pipe","variable coefficient table","compound outlet"],
        "peak_MARE_by_group":{g:round(mares[g],3) for g in mares},
        "all_passed":not failures,
        "runner_sha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "reference_metrics_sha256":hashlib.sha256((FX/"rerun_case_metrics.csv").read_bytes()).hexdigest(),
    }
    if manifest_path:
        Path(manifest_path).write_text(json.dumps(summary,indent=2)+"\n",encoding="utf-8")
    print(summary)
    if failures: raise SystemExit("Regression failure:\n"+"\n".join(failures[:20]))

if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--manifest",help="write a traceable JSON release manifest")
    args=parser.parse_args()
    main(args.manifest)
