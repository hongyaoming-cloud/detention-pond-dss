// Checks the v1.2 account server (organisations + four roles) and the account/project UI, with negative checks.
// Usage: node audit/accounts_v1_2_0/accounts_check.js <server base url> <static port> <sysadmin user> <sysadmin initial pw> <out.json>
// The server must be fresh (only the system administrator, must_change = 1). Run against `wrangler dev` (local D1).
const { chromium } = require('playwright'); const fs = require('fs'); const { execSync } = require('child_process');
const [BASE, STATIC, SU, SP0, OUT] = [process.argv[2] || 'http://127.0.0.1:8787', process.argv[3] || 8765, process.argv[4] || 'sys', process.argv[5] || 'Init-Pass-123', process.argv[6] || 'accounts_check.json'];
const res = []; const ok = (id, pass, detail = '') => { res.push({ id, pass: !!pass, detail }); console.log(pass ? 'PASS' : 'FAIL', id, detail); };
const SP = 'Sys-New-Pass-456', PW = 'Start-Pass-1';
async function req(method, path, { cookie, body, origin, ctype } = {}) {
  const h = {}; if (cookie) h.Cookie = cookie; if (origin) h.Origin = origin;
  if (body !== undefined) h['Content-Type'] = ctype || 'application/json';
  const r = await fetch(BASE + '/api/' + path, { method, headers: h, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)), redirect: 'manual' });
  let j = {}; try { j = await r.json(); } catch { }
  const sc = r.headers.get('set-cookie') || ''; const m = /pg_session=([0-9a-f]*)/.exec(sc);
  return { s: r.status, j, setCookie: sc, cookie: m && m[1] ? 'pg_session=' + m[1] : null };
}
const login = (u, p) => req('POST', 'login', { body: { username: u, password: p } });
async function ready(u) { const l = await login(u, PW); const c = await req('POST', 'password', { cookie: l.cookie, body: { old: PW, new: u + '-Own-Pass' } }); return c.cookie; }
const STATE = { schema: 1, app: '1.2.0', lang: 'zh-Hant', fields: { 'qp#1': '0.20' } };

(async () => {
  /* ---------------- sign-in basics ---------------- */
  let r = await login(SU, 'wrong-password'); const unknown = await login('nobody_here', 'whatever123');
  ok('A1n wrong password and unknown user both give the same 401 (no account guessing)', r.s === 401 && unknown.s === 401 && r.j.error === 'invalid_login' && unknown.j.error === 'invalid_login');
  r = await login(SU, SP0); let sys = r.cookie;
  ok('A2 correct sign-in sets an HttpOnly, Secure, SameSite=Strict cookie; role is system administrator', r.s === 200 && /HttpOnly/.test(r.setCookie) && /Secure/.test(r.setCookie) && /SameSite=Strict/.test(r.setCookie) && r.j.user.role === 'sysadmin' && r.j.user.must_change);
  r = await req('GET', 'admin/users', { cookie: sys });
  ok('A3n before the first password change, everything else is refused', r.s === 403 && r.j.error === 'must_change_password');
  const s1 = await req('POST', 'password', { cookie: sys, body: { old: SP0, new: 'short' } }), s2 = await req('POST', 'password', { cookie: sys, body: { old: 'bad-old', new: SP } });
  ok('A4n short new password and wrong old password are refused', s1.s === 400 && s1.j.error === 'password_too_short' && s2.s === 401);
  r = await req('POST', 'password', { cookie: sys, body: { old: SP0, new: SP } }); const oldSys = sys; sys = r.cookie;
  ok('A4 password change works, issues a new session and ends the old one', r.s === 200 && sys && (await req('GET', 'me', { cookie: oldSys })).s === 401);
  /* ---------------- organisations and roles ---------------- */
  const acme = (await req('POST', 'admin/orgs', { cookie: sys, body: { name: 'Acme 工程' } })).j.id, beta = (await req('POST', 'admin/orgs', { cookie: sys, body: { name: 'Beta 顧問' } })).j.id;
  const dupO = await req('POST', 'admin/orgs', { cookie: sys, body: { name: 'acme 工程' } });
  ok('O1 system administrator creates organisations; duplicate name refused', acme > 0 && beta > 0 && dupO.s === 409);
  const mk = (cookie, username, role, org_id) => req('POST', 'admin/users', { cookie, body: { username, password: PW, role, org_id } });
  r = await mk(sys, 'acmeadmin', 'orgadmin', acme); const noOrg = await mk(sys, 'floating', 'engineer', 9999); const badU = await mk(sys, 'bad name!', 'engineer', acme);
  ok('O2 system administrator creates an organisation administrator; missing organisation and bad username refused', r.s === 201 && noOrg.s === 400 && noOrg.j.error === 'org_required' && badU.s === 400);
  const oa = await ready('acmeadmin');
  const e1 = await mk(oa, 'e01', 'engineer'), e2 = await mk(oa, 'e02', 'engineer'), v1 = await mk(oa, 'v01', 'viewer'), cross = await mk(oa, 'sneaky', 'engineer', beta), esc = await mk(oa, 'root2', 'sysadmin');
  await mk(sys, 'b01', 'engineer', beta);
  const ulist = (await req('GET', 'admin/users', { cookie: oa })).j.users;
  ok('O3 organisation administrator adds engineers and viewers to its own organisation only', e1.s === 201 && e2.s === 201 && v1.s === 201 && cross.s === 201 && ulist.find(u => u.username === 'sneaky').org_id === acme && !ulist.some(u => u.username === 'b01'));
  ok('O4n organisation administrator cannot create a system administrator', esc.s === 400 && esc.j.error === 'bad_role');
  const c = {}; for (const u of ['e01', 'e02', 'v01', 'b01']) c[u] = await ready(u);
  /* ---------------- projects ---------------- */
  const P = (await req('POST', 'projects', { cookie: c.e01, body: { name: '私人專案', state: STATE } })).j.id;
  const S = (await req('POST', 'projects', { cookie: c.e01, body: { name: '分享專案', state: STATE, shared: true } })).j.id;
  const bad = await req('POST', 'projects', { cookie: c.e01, body: { name: '', state: STATE } }), bad2 = await req('POST', 'projects', { cookie: c.e01, body: { name: 'x', state: { nofields: 1 } } });
  ok('P1 engineer saves a private and a shared project; empty name and malformed state refused', P > 0 && S > 0 && bad.s === 400 && bad2.s === 400);
  const e2P = await req('GET', 'projects/' + P, { cookie: c.e02 }), e2S = await req('GET', 'projects/' + S, { cookie: c.e02 }), e2W = await req('PUT', 'projects/' + S, { cookie: c.e02, body: { name: 'x', state: STATE } }), e2D = await req('DELETE', 'projects/' + S, { cookie: c.e02, body: {} });
  ok('P2 a colleague can open the shared project read-only', e2S.s === 200 && e2S.j.project.writable === false);
  ok('P2n a colleague cannot see the private project, nor overwrite or delete the shared one', e2P.s === 404 && e2W.s === 403 && e2D.s === 403);
  const vS = await req('GET', 'projects?scope=shared', { cookie: c.v01 }), vC = await req('POST', 'projects', { cookie: c.v01, body: { name: 'v', state: STATE } }), vP = await req('GET', 'projects/' + P, { cookie: c.v01 });
  ok('P3 viewer sees only the shared project and cannot save', vS.j.projects.length === 1 && vS.j.projects[0].id === S && vC.s === 403 && vP.s === 404);
  const bP = await req('GET', 'projects/' + P, { cookie: c.b01 }), bS = await req('GET', 'projects/' + S, { cookie: c.b01 }), bL = await req('GET', 'projects?scope=shared', { cookie: c.b01 });
  ok('P4n another company cannot see either project, even the shared one', bP.s === 404 && bS.s === 404 && bL.j.projects.length === 0);
  const oL = await req('GET', 'projects?scope=org', { cookie: oa }), oR = await req('GET', 'projects/' + P, { cookie: oa }), oW = await req('PUT', 'projects/' + P, { cookie: oa, body: { name: 'x', state: STATE } }), eOrg = await req('GET', 'projects?scope=org', { cookie: c.e01 });
  ok('P5 organisation administrator lists and opens all company projects but cannot overwrite them; engineers cannot list them all', oL.j.projects.length === 2 && oR.s === 200 && oW.s === 403 && eOrg.s === 403);
  const oD = await req('DELETE', 'projects/' + P, { cookie: oa, body: {} }); const mineAfter = await req('GET', 'projects?scope=mine', { cookie: c.e01 }), trash = await req('GET', 'projects?scope=trash', { cookie: c.e01 });
  const rs = await req('POST', `projects/${P}/restore`, { cookie: c.e01, body: {} }); const mineBack = await req('GET', 'projects?scope=mine', { cookie: c.e01 });
  ok('P6 delete moves a project to the trash (nothing erased) and the owner can restore it', oD.s === 200 && mineAfter.j.projects.length === 1 && trash.j.projects.length === 1 && rs.s === 200 && mineBack.j.projects.length === 2);
  const sP = await req('GET', 'projects/' + P, { cookie: sys }), sL = await req('GET', 'projects?scope=mine', { cookie: sys });
  ok('P7n the system administrator cannot open company projects', sP.s === 403 && sL.s === 403);
  const b1id = (await req('GET', 'admin/users', { cookie: sys })).j.users.find(u => u.username === 'b01').id;
  const oaReset = await req('POST', `admin/users/${b1id}/reset`, { cookie: oa, body: { password: 'Hacked-Pass-1' } }), eAdm = await req('GET', 'admin/users', { cookie: c.e01 }), vAdm = await req('POST', 'admin/orgs', { cookie: oa, body: { name: 'x' } });
  ok('P8n organisation administrator cannot manage another company; engineers have no admin access; only the system administrator adds companies', oaReset.s === 404 && eAdm.s === 403 && vAdm.s === 403);
  const v1id = ulist.find(u => u.username === 'v01').id, oaid = ulist.find(u => u.username === 'acmeadmin').id;
  const rc = await req('POST', `admin/users/${v1id}/role`, { cookie: oa, body: { role: 'engineer' } }), old = await req('GET', 'me', { cookie: c.v01 });
  const self = await req('POST', `admin/users/${oaid}/role`, { cookie: oa, body: { role: 'engineer' } }), toSys = await req('POST', `admin/users/${v1id}/role`, { cookie: oa, body: { role: 'sysadmin' } });
  const v1b = (await login('v01', 'v01-Own-Pass')).cookie, v1c = await req('POST', 'projects', { cookie: v1b, body: { name: 'v1 now engineer', state: STATE } });
  ok('P9 changing a role takes effect at once (old session ends; viewer promoted to engineer can save)', rc.s === 200 && old.s === 401 && v1c.s === 201);
  ok('P9n nobody can change their own role or promote to system administrator', self.s === 400 && toSys.s === 400);
  const dOrg = await req('POST', `admin/orgs/${beta}/disable`, { cookie: sys, body: { disabled: true } }), bLogin = await login('b01', 'b01-Own-Pass'), bOld = await req('GET', 'me', { cookie: c.b01 });
  ok('P10n disabling a company stops its users signing in and ends open sessions', dOrg.s === 200 && bLogin.s === 401 && bLogin.j.error === 'org_disabled' && bOld.s === 401);
  /* ---------------- security ---------------- */
  const csrf = await req('POST', 'projects', { cookie: c.e01, origin: 'https://evil.example', body: { name: 'x', state: STATE } }), form = await req('POST', 'projects', { cookie: c.e01, body: 'name=x', ctype: 'application/x-www-form-urlencoded' });
  ok('S1n cross-site and form posts are refused', csrf.s === 403 && form.s === 415);
  const anon = await req('GET', 'projects'), fake = await req('GET', 'projects', { cookie: 'pg_session=' + 'ab'.repeat(32) });
  ok('S2n no session or a made-up session is refused', anon.s === 401 && fake.s === 401);
  for (let i = 0; i < 5; i++) await login('e02', 'wrong-' + i);
  const lk = await login('e02', 'e02-Own-Pass');
  ok('S3n five wrong passwords lock the account even for the right password', lk.s === 429 && lk.j.error === 'locked');
  const e2id = ulist.find(u => u.username === 'e02').id; await req('POST', `admin/users/${e2id}/reset`, { cookie: oa, body: { password: 'Reset-Pass-789' } });
  const ar = await login('e02', 'Reset-Pass-789'), arP = await req('GET', 'projects?scope=mine', { cookie: ar.cookie });
  ok('S4 administrator reset unlocks the account and forces a password change', ar.s === 200 && ar.j.user.must_change && arP.s === 403);
  const e1id = ulist.find(u => u.username === 'e01').id; await req('POST', `admin/users/${e1id}/disable`, { cookie: oa, body: { disabled: true } });
  const dl = await login('e01', 'e01-Own-Pass'), ds = await req('GET', 'projects?scope=mine', { cookie: c.e01 }), dself = await req('POST', `admin/users/${oaid}/disable`, { cookie: oa, body: { disabled: true } });
  ok('S5n disabled user cannot sign in and the open session ends; nobody can disable themselves', dl.s === 401 && ds.s === 401 && dself.s === 400);
  await req('POST', `admin/users/${e1id}/disable`, { cookie: oa, body: { disabled: false } });
  const el = await login('e01', 'e01-Own-Pass'); await req('POST', 'logout', { cookie: el.cookie, body: {} });
  ok('S6 re-enabled user signs in; sign-out ends the session', el.s === 200 && (await req('GET', 'me', { cookie: el.cookie })).s === 401);
  /* ---------------- activity log ---------------- */
  const la = (await req('GET', 'admin/audit', { cookie: oa })).j.audit, ls = (await req('GET', 'admin/audit', { cookie: sys })).j.audit, le = await req('GET', 'admin/audit', { cookie: el.cookie });
  const acts = new Set(la.map(a => a.action));
  ok('L1 activity log records sign-in, project save, trash, restore, role change, reset and disable', ['login', 'project_created', 'project_trashed', 'project_restored', 'role_changed', 'password_reset', 'user_disabled', 'account_locked'].every(a => acts.has(a)), [...acts].join(','));
  ok('L1n organisation administrator sees only its own company in the log; the system administrator sees all', la.every(a => a.org_id === acme) && ls.some(a => a.org_id === beta) && la.length < ls.length);
  const logText = JSON.stringify(ls);
  ok('L2n the log holds no passwords', ![PW, SP, 'Reset-Pass-789', 'e01-Own-Pass'].some(x => logText.includes(x)));
  let dump = ''; try { dump = execSync('npx wrangler d1 execute pondgate-accounts --local --json --command "SELECT * FROM users"', { cwd: __dirname + '/../../server', stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch (e) { dump = 'ERR'; }
  const plain = [SP0, SP, PW, 'e01-Own-Pass', 'Reset-Pass-789'].filter(x => dump.includes(x));
  ok('S7 the database holds no password in plain text', dump !== 'ERR' && /pw_hash/.test(dump) && plain.length === 0, plain.join(',') || 'none found');
  ok('S7n negative control: the same search finds a known stored value (username)', dump.includes('acmeadmin'));

  /* ---------------- browser UI ---------------- */
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); ctx.on('page', p => p.on('dialog', d => d.accept()));
  let pg = await ctx.newPage(); await pg.goto(BASE + '/'); await pg.waitForTimeout(1800);
  const signIn = async (u, p, newPw) => { await pg.fill('#acctUser', u); await pg.fill('#acctPass', p); await pg.click('#acctLoginBtn'); await pg.waitForTimeout(1400);
    if (newPw && await pg.isVisible('#acctPwForm')) { await pg.fill('#acctOld', p); await pg.fill('#acctNew', newPw); await pg.fill('#acctNew2', newPw); await pg.click('#acctPwBtn'); await pg.waitForTimeout(1400); } };
  const signOut = async () => { await pg.click('#acctOut'); await pg.waitForTimeout(2400); };
  ok('U1 the server copy shows the sign-in screen first', await pg.isVisible('#acctLoginForm'));
  await pg.fill('#acctUser', SU); await pg.fill('#acctPass', 'nope-nope'); await pg.click('#acctLoginBtn'); await pg.waitForTimeout(1200);
  ok('U1n wrong password shows a Chinese error and stays on the sign-in screen', /帳號或密碼錯誤/.test(await pg.textContent('#acctLoginErr')) && await pg.isVisible('#acctLoginForm'));
  await signIn(SU, SP);
  ok('U2 system administrator: bar shows the role and Accounts, and no Projects button', /系統管理者/.test(await pg.textContent('#acctRole')) && await pg.isVisible('#acctAdmin') && !(await pg.$('#acctProjects')));
  await pg.click('#acctAdmin'); await pg.waitForTimeout(900); await pg.fill('#acctOName', '示範學校'); await pg.click('#acctOAdd'); await pg.waitForTimeout(1200);
  await pg.fill('#acctNU', 'teacher'); await pg.fill('#acctNP', PW); await pg.selectOption('#acctNR', 'orgadmin'); await pg.selectOption('#acctNO', { label: '示範學校' }); await pg.click('#acctNAdd'); await pg.waitForTimeout(1300);
  ok('U3 system administrator adds a company and its administrator from the Accounts window', /示範學校/.test(await pg.textContent('#acctOrgList')) && /已新增 teacher/.test(await pg.textContent('#acctNOk')));
  await pg.click('#acctAClose'); await signOut(); await signIn('teacher', PW, 'teacher-Own-Pass');
  ok('U4 company administrator must change the password first, then sees the company name', /公司管理者/.test(await pg.textContent('#acctRole')) && /示範學校/.test(await pg.textContent('#acctBar')));
  await pg.click('#acctAdmin'); await pg.waitForTimeout(900);
  const roleOpts = await pg.$$eval('#acctNR option', o => o.map(x => x.value));
  for (const [u, r] of [['stu', 'engineer'], ['guest', 'viewer']]) { await pg.fill('#acctNU', u); await pg.fill('#acctNP', PW); await pg.selectOption('#acctNR', r); await pg.click('#acctNAdd'); await pg.waitForTimeout(1300); }
  ok('U5 company administrator adds an engineer and a viewer; no system-administrator choice offered', /stu/.test(await pg.textContent('#acctUList')) && /guest/.test(await pg.textContent('#acctUList')) && !roleOpts.includes('sysadmin') && !(await pg.$('#acctNO')));
  await pg.click('#acctAClose'); await signOut(); await signIn('stu', PW, 'stu-Own-Pass');
  const setv = (id, v) => pg.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
  const run = async () => { await pg.evaluate(() => document.getElementById('run').click()); await pg.waitForTimeout(2200); };
  const met = () => pg.evaluate(() => [...document.querySelectorAll('#metricbody tr')].map(r => r.innerText.replace(/\s+/g, ' ').trim()).join('|'));
  await setv('qp', '0.20'); await setv('tpeak', '20'); await setv('recess', '40'); await setv('storageMode', 'table'); await setv('storageTable', '0, 0\n0.5, 300\n1.0, 700\n2.0, 1600');
  await pg.evaluate(() => { const e = document.getElementById('freeDischarge'); e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true })); }); await run();
  const snap1 = await pg.evaluate(() => window.PondGateAccounts.capture().fields), met1 = await met();
  await pg.click('#acctProjects'); await pg.waitForTimeout(800); await pg.fill('#acctPName', '滯洪池作業'); await pg.check('#acctPShare'); await pg.click('#acctPNew'); await pg.waitForTimeout(1300);
  ok('U6 engineer saves a shared project; the bar shows it', /滯洪池作業/.test(await pg.textContent('#acctCurrent')) && /已分享/.test(await pg.textContent('#acctCurrent')));
  pg = await ctx.newPage(); await pg.goto(BASE + '/'); await pg.waitForTimeout(1800);
  const snap0 = await pg.evaluate(() => window.PondGateAccounts.capture().fields); const diff0 = Object.keys(snap1).filter(k => String(snap0[k]) !== String(snap1[k]));
  ok('U7n a fresh page does not have the saved inputs (so the next check is meaningful)', diff0.length >= 3, `${diff0.length} fields differ`);
  await pg.click('#acctProjects'); await pg.waitForTimeout(900); await pg.click('#acctPList [data-open]'); await pg.waitForTimeout(1500);
  const snap2 = await pg.evaluate(() => window.PondGateAccounts.capture().fields), diff = Object.keys(snap1).filter(k => String(snap2[k]) !== String(snap1[k]));
  await run(); const met2 = await met();
  ok('U7 opening the project restores every input field', diff.length === 0 && Object.keys(snap1).length >= 70, `${Object.keys(snap1).length} fields, ${diff.length} differ`);
  ok('U8 running again gives the same results as before saving', met1 && met1 === met2, met2.slice(0, 80));
  await pg.click('#acctProjects'); await pg.waitForTimeout(900); await pg.click('#acctPList [data-del]'); await pg.waitForTimeout(1300);
  const inTrash = /滯洪池作業/.test(await pg.textContent('#acctTList')) && /沒有資料/.test(await pg.textContent('#acctPList'));
  await pg.click('#acctTList [data-restore]'); await pg.waitForTimeout(1300);
  ok('U9 engineer moves the project to the trash and restores it', inTrash && /滯洪池作業/.test(await pg.textContent('#acctPList')));
  await pg.click('#acctPClose'); await signOut(); await signIn('guest', PW, 'guest-Own-Pass');
  await pg.click('#acctProjects'); await pg.waitForTimeout(900);
  const vNoSave = !(await pg.$('#acctPNew')); await pg.click('#acctSList [data-open]'); await pg.waitForTimeout(1500);
  ok('U10 viewer opens the shared project read-only: no save buttons', vNoSave && /唯讀/.test(await pg.textContent('#acctCurrent')) && !(await pg.$('#acctSave')) && !(await pg.$('#acctAdmin')));
  await signOut(); await signIn('teacher', 'teacher-Own-Pass');
  await pg.click('#acctAdmin'); await pg.waitForTimeout(900); await pg.click('.acct-veil details summary'); const logUI = await pg.textContent('#acctLog');
  ok('U11 company administrator sees the activity log for the company only', /project_created/.test(logUI) && /project_trashed/.test(logUI) && !/Acme|Beta|acmeadmin/.test(logUI));
  const st = await b.newPage(); await st.goto(`http://localhost:${STATIC}/index.html`); await st.waitForTimeout(1800);
  ok('U12 static copy (Claude page) works as before: no sign-in, no bar', !(await st.isVisible('#acctLoginForm')) && !(await st.$('#acctBar')) && !(await st.$('#acctRoot')));
  await b.close();
  /* ---------------- calculation files unchanged ---------------- */
  const diffCore = execSync('git diff --stat release/v1.1.0 -- dist/routing-core.js dist/physics-refinement.js dist/module-shell.js', { cwd: __dirname + '/../..' }).toString().trim();
  const diffAll = execSync('git diff --name-only release/v1.1.0 -- dist', { cwd: __dirname + '/../..' }).toString().trim().split('\n').filter(Boolean);
  ok('C1 calculation files identical to v1.1.0; only display files (index.html, account.js, button-feedback.js, help-center.js, help-content.js, beginner-check.js, diagnostic-guide.js, book, English book and guide data, manual PDF and tutorial video files) changed in dist', diffCore === '' && diffAll.every(f => ['dist/index.html', 'dist/account.js', 'dist/button-feedback.js', 'dist/help-center.js', 'dist/help-content.js', 'dist/beginner-check.js', 'dist/diagnostic-guide.js', 'dist/book-data.js', 'dist/book-data-en.js', 'dist/student-guide-en.js', 'dist/book-viewer.js'].includes(f) || /^dist\/(book|manual|videos)\//.test(f)), diffAll.join(', '));
  const pass = res.filter(r => r.pass).length; console.log(`${pass}/${res.length}`);
  fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), base: BASE, pass, total: res.length, results: res }, null, 1));
  process.exit(pass === res.length ? 0 : 1);
})();
