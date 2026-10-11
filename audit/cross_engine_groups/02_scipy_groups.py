"""Independent SciPy (DOP853) routing of the four group benchmarks A/B/C/D-005.
Physics re-coded in Python from the declared relations (no project code imported);
compared with the Software I series written by 01_software_i_groups.js."""
import json, math, numpy as np
from scipy.integrate import solve_ivp
G=9.80665; K2=2.4; Z0=1.75; P=.05; OW=.175
WEIR={5.0:(.63826,.00139)}; ORIF={4.2:(.61495,.05179)}
def outlet(H,control,size):
    H=max(H,0.0)
    if control=='Overflow weir':
        a,b=WEIR[size]; return 2/3*(a+b*H/P)*(size/100)*math.sqrt(2*G)*H**1.5
    a,b=ORIF[size]; D=size/100
    br=1.0 if (H<=D or H==0) else 1-(1-D/H)**1.5
    return 2/3*(a+b*H)*OW*math.sqrt(2*G)*H**1.5*br
d=json.load(open('software_i_groups.json')); res={}
for cid,c in d.items():
    ti=np.array(c['inflow']['t']); qi=np.array(c['inflow']['q']); h0=c['h0']; ctl=c['control']; sz=c['size']
    q0=outlet(h0,ctl,sz)
    def qin(t): return 0.0 if t>ti[-1] else float(np.interp(t,ti,qi))
    def rhs(t,y):
        h=max(y[0],0.0); return [(qin(t)-max(outlet(h0+h,ctl,sz)-q0,0))/(K2*(h0+h+Z0))]
    s=np.array(c['series']); tg=s[:,0]; tend=tg[-1]
    knots=np.unique(np.concatenate([[0.0],ti[(ti>0)&(ti<tend)],[tend]]))
    y=[0.0]; segs=[]
    for a,b in zip(knots[:-1],knots[1:]):
        sol=solve_ivp(rhs,(a,b),y,method='DOP853',rtol=1e-10,atol=1e-14,dense_output=True)
        segs.append((a,b,sol.sol)); y=[sol.y[0][-1]]
    T=tg.copy(); H=np.empty_like(T); k=0
    for j,t in enumerate(T):
        while k<len(segs)-1 and t>segs[k][1]: k+=1
        H[j]=segs[k][2](min(max(t,segs[k][0]),segs[k][1]))[0]
    Hs=np.interp(T,tg,s[:,1]); Qs=np.interp(T,tg,s[:,2])
    Q=np.array([max(outlet(h0+max(h,0),ctl,sz)-q0,0) for h in H])
    S=lambda h: K2*((h0+h+Z0)**2-(h0+Z0)**2)/2  # storage from dS/dh = K2 (h0+h+Z0)
    nse=lambda o,m: 1-np.sum((o-m)**2)/np.sum((o-o.mean())**2)
    r={'control':ctl,'size_cm':sz,'n':int(T.size),
       'SoftwareI':{'Hmax_rel':float(Hs.max()),'Qmax':float(Qs.max()),'Smax':float(S(Hs.max()))},
       'SciPy':{'Hmax_rel':float(H.max()),'Qmax':float(Q.max()),'Smax':float(S(H.max()))},
       'peak_diff_pct':{'H':float(100*abs(H.max()-Hs.max())/Hs.max()),'Q':float(100*abs(Q.max()-Qs.max())/Qs.max())},
       'NSE':{'H':float(nse(Hs,H)),'Q':float(nse(Qs,Q))}}
    res[cid]=r; print(cid, json.dumps(r))
json.dump(res,open('cross_engine_groups_results.json','w'),indent=1)
