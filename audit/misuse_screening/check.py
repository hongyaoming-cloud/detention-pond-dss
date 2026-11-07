import json,sys,re,collections
d=json.load(open(sys.argv[1]))
FEAS=re.compile(r'選定可行|Selected feasible');NOFEAS=re.compile(r'找不到可行|No feasible')
viol=collections.defaultdict(list);outcome=collections.Counter();n=0
for x in d:
    n+=1
    if 'crash' in x: viol['I7 crash'].append(x['i']);continue
    if x['errs']: viol['I7 page error'].append(x['i'])
    elig=x['outlet'] in ('weir','ori') and x['free']=='all' and x['records']=='both'
    r,g=x['r'],x['gate'];opt=r['opt'];feas=bool(FEAS.search(opt));nof=bool(NOFEAS.search(opt))
    invalid=x['hallowMode']=='belowH0'
    outcome[('eligible' if elig else 'ineligible', 'feasible' if feas else 'no-feasible' if nof else 'rejected/other')]+=1
    if (g['eligibleAttr']=='true')!=elig: viol['I3 eligibility flag != oracle'].append(x['i'])
    if g['disabled']: viol['I0 button disabled'].append(x['i'])
    if not elig and feas: viol['I1 ineligible but feasible shown'].append(x['i'])
    if not elig and not g['gateFix']: viol['I2 ineligible without gate fix link'].append(x['i'])
    if invalid and feas: viol['I9 invalid limits but feasible'].append(x['i'])
    if feas and (not re.search('通過|Pass',r['step1']) or re.search('阻擋|Blocked',r['step2'])): viol['I4 feasible but diagnostic not consistent'].append(x['i'])
    if nof and (not re.search('阻擋|Blocked',r['step1']) or r['fixButtons']<1): viol['I5 no-feasible without blocking+fix'].append(x['i'])
    if re.search('通過|Pass',r['step1']) and not feas: viol['I6 step1 pass without feasible result'].append(x['i'])
    if not feas and r['fixButtons']+(1 if g['gateFix'] else 0)<1: viol['I8 not passed and no fix link anywhere'].append(x['i'])
    if x['lang']=='zh' and re.search(r'[A-Za-z][A-Za-z ,;()/\-]{30,}',opt): viol['L1 zh output has English sentence'].append(x['i'])
    if x['lang']=='en' and re.search(r'[一-鿿]',opt): viol['L2 en output has Chinese'].append(x['i'])
    if x['lang']=='en' and re.search('[\u3000-\u303f\uff00-\uffef\u4e00-\u9fff]',r['step1']+r['step2']+r['step3']): viol['L3 en diagnostic has Chinese'].append(x['i'])
print('cases',n);print('outcomes',dict(outcome))
for k,v in sorted(viol.items()): print(k,len(v),v[:15])
if not viol: print('no violations')
