# Checker for audit_continuous.js output. Derived from ../misuse_screening/check.py; invariants adapted to continuous mode.
import json,sys,re,collections
d=json.load(open(sys.argv[1]))
FEAS=re.compile(r'進階連續最佳化｜全域候選搜尋＋局部精修 同一權威|Advanced continuous optimization — global candidate search \+ local refinement The authoritative')
NOFEAS=re.compile(r'沒有可行解|No feasible candidate')
REJ=re.compile(r'尚未執行連續|was not run|請先輸入有效|Enter valid|上下限無效|bounds are invalid|固定面積|constant-area|無法完成|could not be completed')
ZH_EN_SENT=re.compile(r'[A-Za-z][A-Za-z ,;()/\-]{30,}');CJK=re.compile('[　-〿＀-￯一-鿿]')
viol=collections.defaultdict(list);outcome=collections.Counter();n=0;stats=collections.Counter();times=[]
for x in d:
    n+=1;i=x['i']
    if 'crash' in x: viol['I7 crash'].append(i);continue
    if x['errs']: viol['I7 page error'].append(i)
    s=x['setup'];single=x['outlet'] in ('weir','ori')
    formal=single and x['free']=='all' and x['records']=='both'          # formalScreeningEligible oracle (physics-refinement.js:39)
    elig=formal and s['hallow']>=s['h0'] and s['qallow']>0                # + Qallow/Hallow validity (:221, :239)
    b=x['before']
    if b['contDisabled']==elig: viol['I3 button enabled-state != eligibility oracle'].append(i)
    if not elig and not b['gateGuideFix']: viol['I2 ineligible without gate fix link (continuousGateGuidance)'].append(i)
    locked=bool(re.search('locked|已鎖定',b['gateStatus']))
    if locked==elig: viol['I2b gate status text != eligibility oracle'].append(i)
    if x['lang']=='zh' and (ZH_EN_SENT.search(b['gateStatus']) or ZH_EN_SENT.search(b['gateGuideText'])): viol['L4 zh gate text has English sentence'].append(i)
    if x['lang']=='en' and (CJK.search(b['gateStatus']) or CJK.search(b['gateGuideText'])): viol['L4 en gate text has Chinese'].append(i)
    reqs=[('normal',x['normal'])]+([('forced',x['forced'])] if x.get('forced') else [])
    for tag,r in reqs:
        evk=[e['kind'] for e in r['events']];opt=r['opt']
        feas=bool(FEAS.search(opt));nof=bool(NOFEAS.search(opt));rej=bool(REJ.search(opt))
        produced=not r['wasDisabled']   # the click reached the continuous handler
        if produced: stats['requests reaching handler']+=1
        if produced and feas: times.append(r['ms'])
        res='feasible' if feas else 'no-feasible' if nof else 'rejected(not run)' if rej else ('no action (button disabled)' if not produced else 'other')
        outcome[(tag,'eligible' if elig else 'ineligible',res)]+=1
        if feas!=('feasible' in evk): viol['I13 feasible text != feasible event'].append((i,tag))
        if nof!=('no-feasible' in evk): viol['I13 no-feasible text != no-feasible event'].append((i,tag))
        if produced and not (feas or nof or rej): viol['I12 handler reached but no terminal message'].append((i,tag))
        if not elig and feas: viol['I1 ineligible but feasible shown'].append((i,tag))
        if not formal and ('feasible' in evk or 'no-feasible' in evk): viol['I1b ineligible but search executed'].append((i,tag))
        if feas and (not re.search('通過|Pass',r['step1']) or re.search('阻擋|Blocked',r['step2'])): viol['I4 feasible but diagnostic not consistent'].append((i,tag))
        if nof and (not re.search('阻擋|Blocked',r['step1']) or r['fixButtons']<1 or 'warn' not in r['optClass']): viol['I5 no-feasible without blocking+fix+warn'].append((i,tag))
        if re.search('通過|Pass',r['step1']) and not feas: viol['I6 step1 pass without feasible result'].append((i,tag))
        if not feas and r['fixButtons']+(1 if r['gateGuideFix'] else 0)<1: viol['I8 not passed and no fix link anywhere'].append((i,tag))
        if feas:
            e=[e for e in r['events'] if e['kind']=='feasible'][0]
            ok=e['qmax']<=s['qallow']+1e-9 and e['hmax']<=s['hallow']+1e-9 and e['remain']<=s['residualPct']+1e-9 and s['contAmin']-1e-9<=e['area']<=s['contAmax']+1e-9
            ok=ok and ((s['optBmin']-1e-9<=e['bw']<=s['optBmax']+1e-9) if e['mode']=='b' else (s['optAomin']-1e-9<=e['ao']<=s['optAomax']+1e-9))
            if not ok: viol['I11 selected design violates a declared limit or bound'].append((i,tag))
        if produced:
            if x['lang']=='zh' and ZH_EN_SENT.search(opt): viol['L1 zh continuous output has English sentence'].append((i,tag))
            if x['lang']=='en' and CJK.search(opt): viol['L2 en continuous output has Chinese'].append((i,tag))
        else:
            if x['lang']=='zh' and ZH_EN_SENT.search(opt): viol['L1x zh optout (stale text from another module, button disabled) has English sentence'].append((i,tag))
            if x['lang']=='en' and CJK.search(opt): viol['L2x en optout (stale text, button disabled) has Chinese'].append((i,tag))
        if x['lang']=='en' and CJK.search(r['step1']+r['step2']+r['step3']): viol['L3 en diagnostic has Chinese'].append((i,tag))
        if x['lang']=='zh' and ZH_EN_SENT.search(r['step1']+r['step2']+r['step3']): viol['L3b zh diagnostic has English sentence'].append((i,tag))
print('cases',n,'(randomized',sum(1 for x in d if not x.get('targeted')),'+ targeted',sum(1 for x in d if x.get('targeted')),')')
print('eligible (oracle)',sum(1 for x in d if 'crash' not in x and x['outlet'] in ('weir','ori') and x['free']=='all' and x['records']=='both' and x['setup']['hallow']>=x['setup']['h0']))
print('stats',dict(stats))
if times: times.sort();print('feasible request wall time ms: n=%d min=%d median=%d max=%d'%(len(times),times[0],times[len(times)//2],times[-1]))
print('outcomes:');[print('  ',k,v) for k,v in sorted(outcome.items())]
for k,v in sorted(viol.items()): print(k,len(v),v[:20])
if not viol: print('no violations')
