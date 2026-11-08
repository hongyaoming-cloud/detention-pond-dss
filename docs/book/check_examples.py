"""Independent recomputation of every Part II example (no PondGate code is used).

Usage: python3 -I docs/book/check_examples.py [docs/book/examples.json] [--perturb]
It re-implements level-pool routing with classical RK4 (dt = 2 s) from the inputs that
run_examples.js recorded, and compares Qp,o, Hmax, dSmax and the Te+Td residual with the
numbers PondGate showed. --perturb changes one recorded number to prove the check fails.
Exit code 0 = all match, 1 = mismatch.
"""
import json, math, sys

G = 9.80665

def num(s):
    return float(str(s).replace(',', ' ').split()[0])

def inflow_fn(p):
    shape = p['shape']
    if p['case'] == 'long' or shape == 'long':
        r, pl, rc = (num(p[k]) * 60 for k in ('rise', 'plateau', 'recessLong'))
        pts = [(0, 0), (r, 1), (r + pl, 1), (r + pl + rc, 0)]
        qp = num(p['qp'])
        pts = [(t, q * qp) for t, q in pts]
    elif shape == 'custom':
        pts = [tuple(float(x) for x in ln.split(',')) for ln in p['points'].strip().splitlines()]
        pts = [(t * 60, q) for t, q in pts]
    else:
        tp, tr = num(p['tpeak']) * 60, num(p['recess']) * 60
        qp = num(p['qp'])
        pts = [(0, 0), (tp, qp), (tp + tr, 0)]
    def f(t):
        if t <= pts[0][0] or t >= pts[-1][0]:
            return 0.0
        for (t0, q0), (t1, q1) in zip(pts, pts[1:]):
            if t0 <= t <= t1:
                return q0 + (q1 - q0) * (t - t0) / (t1 - t0)
        return 0.0
    return f, pts[-1][0]

def storage_fns(p):
    if p['storageMode'] == 'table':
        tab = [tuple(float(x) for x in ln.split(',')) for ln in p['storageTable'].strip().splitlines()]
        def h_of_s(s):
            for (h0, s0), (h1, s1) in zip(tab, tab[1:]):
                if s0 <= s <= s1:
                    return h0 + (h1 - h0) * (s - s0) / (s1 - s0)
            return tab[-1][0]
        def s_of_h(h):
            for (h0, s0), (h1, s1) in zip(tab, tab[1:]):
                if h0 <= h <= h1:
                    return s0 + (s1 - s0) * (h - h0) / (h1 - h0)
            return tab[-1][1]
        return h_of_s, s_of_h
    a, fl = num(p['area']), num(p['floor'])
    return (lambda s: fl + s / a), (lambda h: a * (h - fl))

def outflow_fn(p):
    def q(h):
        out = 0.0
        if p['weirOn'] and h > num(p['crest']):
            out += num(p['cw']) * num(p['bw']) * (h - num(p['crest'])) ** 1.5
        if p['oriOn'] and h > num(p['invert']):
            y, ht = h - num(p['invert']), num(p['oriH'])
            w, cw, cd = num(p['ao']) / ht, num(p['cw']), num(p['cd'])
            if y <= ht:
                out += cw * w * y ** 1.5
            else:
                out += cw * w * ht ** 1.5 + cd * w * ht * (math.sqrt(2 * G * (y - ht / 2)) - math.sqrt(2 * G * ht / 2))
        return out
    return q

def route(p):
    qin, te = inflow_fn(p)
    h_of_s, s_of_h = storage_fns(p)
    qout = outflow_fn(p)
    td = num(p['drainHours']) * 3600
    tail = max(1800, te / 60 * 30, td)
    s0 = s_of_h(num(p['h0'])) if p['storageMode'] != 'table' else s_of_h(num(p['h0']))
    f = lambda t, s: qin(t) - qout(h_of_s(max(s, 0)))
    dt, t, s = 2.0, 0.0, s0
    qpo = smax = 0.0; s_end = None
    while t < te + tail - 1e-9:
        k1 = f(t, s); k2 = f(t + dt / 2, s + dt / 2 * k1); k3 = f(t + dt / 2, s + dt / 2 * k2); k4 = f(t + dt, s + dt * k3)
        s = max(s + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4), 0); t += dt
        qpo = max(qpo, qout(h_of_s(s))); smax = max(smax, s)
        if s_end is None and t >= te + td - 1e-9:
            s_end = s
    ds = smax - s0
    return {'qpo': qpo, 'hmax': h_of_s(smax), 'ds': ds, 'resid': 100 * (s_end - s0) / ds}

def pick(d, zh, en):
    # Readings are stored under the on-screen label: Chinese in examples.json, English in examples_en.json.
    return d[zh] if zh in d else d[en]

def main():
    path = next((a for a in sys.argv[1:] if a.endswith('.json')), 'docs/book/examples.json')
    data = json.load(open(path, encoding='utf-8'))
    if '--perturb' in sys.argv:
        m0 = data['examples'][0]['metrics']; m0['出流尖峰 Qp,o' if '出流尖峰 Qp,o' in m0 else 'Peak outflow Qp,o'] = '0.0913 m³/s'
    bad = 0
    for ex in data['examples']:
        m, r = ex['metrics'], route(ex['inputs'])
        checks = [('Qp,o', num(pick(m, '出流尖峰 Qp,o', 'Peak outflow Qp,o')), r['qpo'], 0.00005 + 1e-9),
                  ('Hmax', num(pick(m, '最大水位 Hmax', 'Peak water level Hmax')), r['hmax'], 0.0005 + 1e-9),
                  ('dSmax', num(pick(m, '事件新增滯洪量 ΔSmax', 'Event-added detention volume ΔSmax')), r['ds'], 0.0005 + 1e-9),
                  ('resid%', num(pick(m, 'Te + Td 剩餘蓄水', 'Drain-down residual at Te + Td')), r['resid'], 0.005 + 1e-9)]
        for name, shown, mine, tol in checks:
            ok = abs(shown - mine) <= tol
            bad += not ok
            if not ok:
                print('MISMATCH', ex['id'], name, 'PondGate', shown, 'independent', round(mine, 6))
        if ex.get('screen') and ex['screen']['rows']:
            rows = {r[0]: r[1] for r in ex['screen']['rows'] if len(r) > 1}
            q = dict(ex['inputs'], area=ex['afterScreen']['area'], bw=ex['afterScreen']['bw'])
            rs = route(q)
            for name, shown, mine, tol in [('screen Qp,o', num(pick(rows, '出流尖峰／容許值', 'Peak outflow / allowable')), rs['qpo'], 0.00005 + 1e-9),
                                           ('screen Hmax', num(pick(rows, '最高水位／容許值', 'Peak water level / allowable')), rs['hmax'], 0.0005 + 1e-9),
                                           ('screen dSmax', num(pick(rows, '事件新增滯洪量 ΔSmax', 'Event-added detention volume ΔSmax')), rs['ds'], 0.05 + 1e-9),
                                           ('screen resid%', num(pick(rows, 'Te + Td 排空殘留', 'Drain-down residual at Te + Td')), rs['resid'], 0.005 + 1e-9)]:
                ok = abs(shown - mine) <= tol
                bad += not ok
                if not ok:
                    print('MISMATCH', ex['id'], name, 'PondGate', shown, 'independent', round(mine, 6))
            print('%-16s screened A=%s b=%s -> Qp,o %.4f Hmax %.3f dS %.1f resid %.2f%%' % (ex['id'], q['area'], q['bw'], rs['qpo'], rs['hmax'], rs['ds'], rs['resid']))
        print('%-16s Qp,o %.4f  Hmax %.3f  dS %.3f  resid %.2f%%' % (ex['id'], r['qpo'], r['hmax'], r['ds'], r['resid']))
    print('RESULT', 'PASS' if not bad else 'FAIL (%d mismatches)' % bad)
    sys.exit(1 if bad else 0)

main()
