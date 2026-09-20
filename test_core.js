const g=9.80665;
function inflow(t,p){if(p.shape==='custom'){let a=p.points;if(t>a.at(-1)[0])return 0;for(let i=1;i<a.length;i++){if(t<=a[i][0]){let [t0,q0]=a[i-1],[t1,q1]=a[i];return q0+(q1-q0)*(t-t0)/(t1-t0)}}return 0}let T=p.dur*60;if(p.shape==='tri'){return t<=T/2?p.qp*2*t/T:t<=T?p.qp*2*(1-t/T):0}let r=.2*T;return t<r?p.qp*t/r:t<=T-r?p.qp:t<=T?p.qp*(T-t)/r:0}
function outflow(h,p){let q=0;if(p.weir&&h>p.crest)q+=p.cw*p.bw*Math.pow(h-p.crest,1.5);if(p.ori&&h>p.invert)q+=p.cd*p.ao*Math.sqrt(2*g*(h-p.invert));return q}
function route(p){let dt=2,T=p.dur*60+Math.max(1800,p.dur*30),h=p.h0,rows=[];let vin=0,vout=0;for(let t=0;t<=T;t+=dt){let qi=inflow(t,p),qo=outflow(h,p);rows.push({t,qi,qo,h,s:h*p.area});vin+=qi*dt;vout+=qo*dt;let f=(tt,hh)=>(inflow(tt,p)-outflow(Math.max(0,hh),p))/p.area;let k1=f(t,h),k2=f(t+dt/2,h+k1*dt/2),k3=f(t+dt/2,h+k2*dt/2),k4=f(t+dt,h+k3*dt);h=Math.max(0,h+dt*(k1+2*k2+2*k3+k4)/6)}return {rows,vin,vout,residual:vin-vout-rows.at(-1).s+rows[0].s}}
function peak(a,k){return a.reduce((m,x)=>x[k]>m[k]?x:m,a[0])}
const base={qp:.12,dur:60,shape:'tri',area:180,h0:0,weir:true,cw:1.7,bw:.2,crest:.25,ori:false,cd:.62,ao:.01,invert:.05};
const bottomOutlet=route({...base,crest:0});
if(!(bottomOutlet.rows[0].qo===0 && bottomOutlet.rows[1].qo>0))throw new Error('Bottom-outlet hydrograph must start at zero and rise immediately');
const cases={triangular:base,longDuration:{...base,shape:'long',dur:120},orifice:{...base,weir:false,ori:true},custom:{...base,shape:'custom',points:[[0,0],[1500,.1],[3000,.1],[4500,0]],dur:75,qp:.1}};
for(const [name,p] of Object.entries(cases)){const r=route(p),q=peak(r.rows,'qo').qo,relative=Math.abs(r.residual)/r.vin;if(!(q>0&&relative<.005))throw new Error(name+' routing test failed');console.log(name+': peak='+q.toFixed(6)+' m3/s; balance='+(100*relative).toFixed(4)+'%')}

/* Release guard: the interactive application may expose only one formal renderer and optimizer. */
const fs=require('fs');
const app=fs.readFileSync('dist/physics-refinement.js','utf8');
const page=fs.readFileSync('dist/index.html','utf8');
const language=fs.readFileSync('dist/language-final.js','utf8');
const count=(pattern)=>(app.match(pattern)||[]).length;
if(count(/function renderPhysical\(/g)!==1)throw new Error('Interactive app must declare exactly one authoritative renderPhysical function');
if(count(/function optimizePhysical\(/g)!==1)throw new Error('Interactive app must declare exactly one authoritative optimizePhysical function');
if(/setTimeout\(optimizePhysical/.test(app))throw new Error('Interactive app must not auto-run optimization during startup');
if(!/window\.__dssAuthoritativeRender=\(\)=>renderPhysical\(\)/.test(app)||!/function render\(\)\{if\(!window\.__dssAuthoritativeRender\)return;return window\.__dssAuthoritativeRender\(\);\}/.test(page))throw new Error('Legacy page handlers must be bridged to the authoritative renderer and must not solve hydraulics independently');
if(/function route\(/.test(page)||/oldRoute=route/.test(page)||/route\(p\)/.test(page)||!/Run constrained design screening/.test(page))throw new Error('The page scaffold must not retain a duplicate hydraulic router or a legacy optimization search handler');
if(!/window\.__dssSetLanguage=setLanguage/.test(app)||!/window\.__dssSetLanguage\)window\.__dssSetLanguage\(en\)/.test(language))throw new Error('Language switching must re-render dynamic results through the authoritative bilingual controller');
if(!/Reproducible Run Record/.test(app)||!/Q_rectangular_opening_m3s/.test(app)||!/Stage-storage boundary/.test(app))throw new Error('Run record must retain numerical, boundary, and component-outflow information');
console.log('interactive authority guard: passed');

const core=fs.readFileSync('dist/routing-core.js','utf8');
const qa=fs.readFileSync('dist/quality-assurance.js','utf8');
const cross=fs.readFileSync('dist/cross-model-compare.js','utf8');
if(!/routeStorage/.test(core)||!/rk4Scalar/.test(core)||!/rectangularOpeningDischarge/.test(core))throw new Error('Interactive routing must expose the authoritative RK4 core');
if(!/function routeDesignCandidate\(p\)[\s\S]*?DetentionRoutingCore\.routeStorage/.test(app))throw new Error('Optimization candidates must use the same authoritative routing core as displayed results');
if(!/DSSAuthority/.test(qa)||!/formalDesignAllowed/.test(qa)||!/internal_developer_quality_assurance/.test(qa))throw new Error('Release must retain a single-authority declaration, formal-design safety guard, and anonymous internal QA record');
if(/within validated envelope/.test(qa)||!/does not define universal numeric input ranges/.test(qa))throw new Error('Design screening language must not overclaim a universal validated input range');
if(!/Formal screening is limited to one passive weir or one rectangular opening/.test(app)||!/research inspection \(screening locked\)/.test(app))throw new Error('The interface must identify formal-screening eligibility before users select research-only outlets');
if(!/Selected feasible constrained-screening case — routed/.test(app)||!/not a continuous global optimum or final engineering-design validation/.test(app))throw new Error('Screening results must not be presented as final design or global optimization');
if((cross.match(/async function compare/g)||[]).length!==1||/compare=async function/.test(cross))throw new Error('External cross checking must retain one comparison implementation');
console.log('shared RK4 core guard: passed');

const Core=require('./dist/routing-core.js');
if(Core.authority!=='DetentionRoutingCore.routeStorage'||!Object.isFrozen(Core))throw new Error('Routing core must declare and freeze its single authoritative production API');
const opening={height:.20,width:.30,cw:1.70,cd:.62};
const eps=1e-8;
const qBelow=Core.rectangularOpeningDischarge({...opening,head:opening.height-eps});
const qCrown=Core.rectangularOpeningDischarge({...opening,head:opening.height});
const qAbove=Core.rectangularOpeningDischarge({...opening,head:opening.height+eps});
if(Math.abs(qCrown-qBelow)>2e-7||Math.abs(qAbove-qCrown)>2e-7||qAbove<qCrown)throw new Error('Rectangular-opening free-to-submerged transition must be continuous and non-decreasing');
console.log('rectangular-opening transition guard: passed');

const bounded=Core.routeStorage({tEnd:10,dt:1,storage0:0,maxStorage:2,inflow:()=>1,stageOfStorage:s=>s,outflow:()=>0});
if(!bounded.stateExceeded||bounded.rows.some(row=>row.s>2))throw new Error('Stage-storage ceiling must stop routing before an undefined state is reported');
console.log('stage-storage hard-boundary guard: passed');

const stoppedBeforeDrain=Core.routeStorage({tEnd:10,dt:1,storage0:0,maxStorage:2,inflow:()=>1,stageOfStorage:s=>s,outflow:()=>0,sampleTimes:[5]});
if(!stoppedBeforeDrain.stateExceeded||stoppedBeforeDrain.samples.length!==0)throw new Error('A hard S(H) stop before Te + Td must not fabricate a drawdown sample');
if(!/function storageAtDrain\(r,p\).*return row\?row\.s:null/.test(app)||!/r\.stateExceeded\|\|drainStorage===null/.test(app)||!/Not evaluated/.test(app))throw new Error('A truncated S(H) route must be reported as not evaluated, without extrapolation or an exception');
console.log('truncated drawdown decision guard: passed');

const floorBounded=Core.routeStorage({tEnd:10,dt:1,storage0:0,minStorage:0,maxStorage:10,inflow:()=>0,stageOfStorage:s=>100+s,outflow:()=>1,tailSeconds:0});
if(floorBounded.rows.some(row=>row.s<0||row.h<100)||floorBounded.finalStorage<0)throw new Error('Storage routing must preserve the declared lower storage boundary and vertical datum');
console.log('storage-floor datum guard: passed');

const accounting=Core.routeStorage({tEnd:10,dt:3,storage0:0,inflow:()=>1,stageOfStorage:s=>s,outflow:()=>0,tailSeconds:0});
if(accounting.rows.at(-1).t!==10||Math.abs(accounting.vin-10)>1e-12||Math.abs(accounting.residual)>1e-12)throw new Error('Routing record and mass accounting must cover the same exact time interval');
console.log('time-interval accounting guard: passed');

const timedSample=Core.routeStorage({tEnd:10,dt:3,storage0:0,inflow:()=>1,stageOfStorage:s=>s,outflow:()=>0,tailSeconds:20,sampleTimes:[14]});
if(timedSample.samples.length!==1||timedSample.samples[0].t!==14||Math.abs(timedSample.samples[0].s-14)>1e-12)throw new Error('Declared drain-down checks must retain the exact requested time state');
console.log('exact drain-down sample guard: passed');

const sharpEvent=Core.routeStorage({tEnd:.1,dt:2,storage0:0,tailSeconds:0,landOn:[.05],inflow:t=>t<=.05?.01*t/.05:t<=.1?.01*(1-(t-.05)/.05):0,stageOfStorage:s=>s,outflow:()=>0});
if(Math.abs(sharpEvent.vin-.0005)>1e-12||!sharpEvent.rows.some(r=>Math.abs(r.t-.05)<1e-12)||!sharpEvent.rows.some(r=>Math.abs(r.t-.1)<1e-12))throw new Error('Event endpoints and prescribed inflow breakpoints must be exact RK4 landing times, even below the nominal timestep');
if(!/function inflowLandmarks\(p\)/.test(app)||!/landOn:inflowLandmarks\(p\)/.test(app))throw new Error('Interactive and screening routes must pass event breakpoints to the authoritative core');
console.log('event-breakpoint landing guard: passed');

const componentRoute=Core.routeStorage({tEnd:2,dt:1,storage0:1,inflow:()=>0,stageOfStorage:s=>s,outflow:h=>h+h/2,outflowComponents:h=>({weir:h,rectangularOpening:h/2})});
if(componentRoute.rows.some(row=>Math.abs(row.qo-(row.components.weir+row.components.rectangularOpening))>1e-12))throw new Error('Recorded outlet components must sum exactly to total outflow');
console.log('compound-outlet component-record guard: passed');

function convergenceRoute(dt){
  return Core.routeStorage({
    tEnd:3600,dt,storage0:0,tailSeconds:1800,
    inflow:t=>t<=1800?.12*t/1800:t<=3600?.12*(1-(t-1800)/1800):0,
    stageOfStorage:s=>s/180,
    outflow:h=>1.7*.2*Math.pow(Math.max(h,0),1.5)
  });
}
function maxRow(rows,key){return rows.reduce((a,b)=>b[key]>a[key]?b:a,rows[0]);}
const c2=convergenceRoute(2),c1=convergenceRoute(1),c05=convergenceRoute(.5);
const q2=maxRow(c2.rows,'qo').qo,q05=maxRow(c05.rows,'qo').qo,h2=maxRow(c2.rows,'h').h,h05=maxRow(c05.rows,'h').h;
if(Math.abs(q2-q05)/q05>0.001||Math.abs(h2-h05)/h05>0.001||Math.abs(maxRow(c2.rows,'qo').t-maxRow(c05.rows,'qo').t)>2)throw new Error('The declared 2 s routing step does not meet the convergence guard against 0.5 s');
if(Math.abs(maxRow(c1.rows,'qo').qo-q05)/q05>0.0001)throw new Error('Intermediate 1 s routing result is not converging toward the 0.5 s reference');
console.log('2 s RK4 timestep-convergence guard: passed');

/* First-principles decision guard: event storage is measured above S0 and an
   optimum must satisfy a declared drain-down condition. */
if(!/deltaS=Math\.max\(0,e\.hp\.s-r\.rows\[0\]\.s\)/.test(app))throw new Error('Decision support must report event-added storage above S0');
if(!/remaining<=drainLimit/.test(app)||!/p\.drainHours\*3600/.test(app))throw new Error('Optimization must enforce the declared drain-down constraint');
if(!/sampleTimes:\[T\+p\.drainHours\*3600\]/.test(app)||!/storageAtDrain\(r,p\)/.test(app))throw new Error('Drain-down reporting must use the exact Te + Td state, not the routed tail endpoint');
if(!/hlim>=last\.p\.h0/.test(app)||!/hlim<=hUpper/.test(app))throw new Error('Optimization must reject physically invalid allowable levels');
if(!/x\.slice\(1,5\)\.some\(v=>v<0\)/.test(app))throw new Error('Coefficient tables must reject negative discharge coefficients');
if(!/Basin floor elevation Hfloor/.test(app)||!/p\.area\*Math\.max\(0,h-p\.floor\)/.test(app))throw new Error('Constant-area storage must use an explicit basin-floor datum');
if(!/evaluateFirstPrinciples/.test(app)||!/eventEligible/.test(app))throw new Error('Event response descriptors must be qualified against the initial hydraulic state');
if(!/caseSelect=replace\('case'\)/.test(app))throw new Error('Standard-case changes must use the authoritative routing controller');
if(!/e\.lagEvent=eventEligible/.test(app)||!/if\(eventEligible\)\{e\.qratio=e\.qratioEvent;e\.lag=e\.lagEvent;\}/.test(app))throw new Error('Event peak ratio and lag must use the same initial-state increment baseline');
if(!/id="freeDischarge"/.test(app)||!/freeDischargeEvidenceComplete/.test(app)||!/freeTailwater/.test(app)||!/freeBackwater/.test(app)||!/freeSubmergence/.test(app)||!/freeOperation/.test(app))throw new Error('Constrained screening must require documented free-discharge evidence, not one unchecked assertion');
if(!/screeningEvidenceRecordComplete/.test(app)||!/freeEvidenceRecord/.test(app)||!/screeningLimitRecord/.test(app)||!/Screening-limit basis/.test(app))throw new Error('Constrained screening must retain traceable free-discharge evidence and limit-basis records');
if(/function renderPhysicalLegacy/.test(app))throw new Error('Retired render paths must not remain alongside the authoritative renderer');
if(!/showInputGuidance/.test(app)||!/aria-invalid/.test(app))throw new Error('Input errors must identify a correction target for the user');
const teaching=fs.readFileSync('dist/teaching-assistant.js','utf8');
if(!/window\.confirm/.test(teaching)||!/snapshot\(\)/.test(teaching)||!/teachRestore/.test(teaching)||!/freeTailwater/.test(teaching)||!/freeEvidenceRecord/.test(teaching)||!/screeningLimitRecord/.test(teaching)||!/Qout\(H\) = Cw/.test(teaching))throw new Error('Teaching screening cases must save and restore the working case, declare their assumed evidence records, and state Qout(H)');
if(/Math\.max\(r\.vin,1\)/.test(app)||/Math\.max\(z\.vin,1\)/.test(app)||/Math\.max\(r\.vin,1\)/.test(page)||!/function relativeMassResidual\(r\)/.test(app)||!/massRatio=Number\.isFinite\(r\.vin\)&&r\.vin>0\?Math\.abs\(r\.residual\)\/r\.vin:Infinity/.test(page))throw new Error('Mass-balance status and constrained screening must use actual cumulative inflow, never a fixed one-cubic-metre denominator');
if(!/function dimensionlessControls/.test(app)||!/ΠQ\(Href\)/.test(app)||!/ΠS,Δ\(Href\)/.test(app))throw new Error('Decision record must retain declared dimensionless control parameters');
const modules=fs.readFileSync('dist/module-shell.js','utf8');
if(!/freeEvidence=yes\('freeDischarge'\)&&\['freeTailwater','freeBackwater','freeSubmergence','freeOperation'\]\.every\(yes\)/.test(modules)||!/designReady=ready&&freeEvidence&&!extension/.test(modules))throw new Error('Constrained screening must require complete free-discharge evidence');
if(!/extension=riser\|\|pipe\|\|variable\|\|\(weir&&ori\)/.test(modules)||!/designReady=ready&&freeEvidence&&!extension/.test(modules))throw new Error('Exploratory outlet configurations must not re-enable constrained screening');
if(!/guide\.id='userGuide'/.test(modules)||!/Start here/.test(modules)||!/建議操作順序/.test(modules))throw new Error('The user workflow guide must be present in both languages');
if(!/function currentScreeningGate\(\)/.test(modules)||!/document\.getElementById\('optimize'\)/.test(modules)||!/onePassiveOutlet/.test(modules)||!/dataset\.screeningEligible/.test(modules)||!/formalScreeningEligible/.test(app)||!/Screening was not run/.test(app))throw new Error('The visible constrained-screening button must remain clickable and reject ineligible cases inside the authoritative search path');
if(!/RQ\/RT=withheld \(non-zero event baseline\)/.test(app))throw new Error('Reports must withhold event ratios for non-zero baselines');
console.log('event-storage, drain-down, and non-negative-coefficient guard: passed');
