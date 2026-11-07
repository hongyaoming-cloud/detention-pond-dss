"""Hand-calculation numbers quoted in chapters 11-13 (demonstration case: triangular Qp=0.12 m3/s, Tp=Tr=30 min, A=180 m2, weir Cw=1.70, b=0.20 m). Run: python3 -I docs/book/hand_calc.py"""
A=180;C=1.70*0.20
def qin(t):
    return 0.12*t/1800 if t<=1800 else (0.12*(3600-t)/1800 if t<=3600 else 0)
qout=lambda S: C*max(S/A,0)**1.5
f=lambda t,S: qin(t)-qout(S)
def run(dt,show=None):
    t=0;S=0;best=(0,0,0)
    while t<4*3600-1e-9:
        k1=f(t,S);k2=f(t+dt/2,S+dt/2*k1);k3=f(t+dt/2,S+dt/2*k2);k4=f(t+dt,S+dt*k3)
        if show is not None and abs(t-show)<1e-9:
            print('t=%.0f S=%.6f H=%.6f Qin=%.6f Qout=%.6f'%(t,S,S/A,qin(t),qout(S)))
            print('k1=%.8f k2=%.8f k3=%.8f k4=%.8f'%(k1,k2,k3,k4))
            Sn=S+dt/6*(k1+2*k2+2*k3+k4);print('S_next=%.6f H_next=%.6f'%(Sn,Sn/A))
        S+=dt/6*(k1+2*k2+2*k3+k4);t+=dt
        if qout(S)>best[0]:best=(qout(S),t,S/A)
    return best
print(run(2.0,show=1800))
for dt in (2,10,60,300,600,900):
    b=run(dt);print('dt=%4d Qpo=%.5f t=%.1fmin Hmax=%.4f'%(dt,b[0],b[1]/60,b[2]))
b=run(2.0);print('Qin at tpo', qin(b[1]))
# euler
def euler(dt):
    t=0;S=0;best=0;hm=0
    while t<4*3600:
        S+=dt*f(t,S);t+=dt;best=max(best,qout(S));hm=max(hm,S/A)
    return best,hm
for dt in (2,60,300,600):print('euler dt',dt,'%.5f %.4f'%euler(dt))
# rating table
for H in (0.1,0.2,0.3,0.4,0.5):
    print(H,'weir %.4f'%(C*H**1.5))
