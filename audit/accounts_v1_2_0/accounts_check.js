// Checks the v1.2 account server and the account/project UI, with negative checks.
// Usage: node audit/accounts_v1_2_0/accounts_check.js <server base url> <static port> <admin user> <admin initial pw> <out.json>
// The server must be fresh (only the admin account, must_change = 1). Runs against `wrangler dev` locally.
const { chromium } = require('playwright'); const fs = require('fs'); const { execSync } = require('child_process');
const [BASE, STATIC, AU, AP0, OUT] = [process.argv[2] || 'http://127.0.0.1:8787', process.argv[3] || 8765, process.argv[4] || 'testadmin', process.argv[5] || 'Init-Pass-123', process.argv[6] || 'accounts_check.json'];
const res = []; const ok = (id, pass, detail = '') => { res.push({ id, pass: !!pass, detail }); console.log(pass ? 'PASS' : 'FAIL', id, detail); };
const AP = 'Admin-New-Pass-456';
async function req(method, path, { cookie, body, origin, ctype } = {}) {
  const h = {}; if (cookie) h.Cookie = cookie; if (origin) h.Origin = origin;
  if (body !== undefined) h['Content-Type'] = ctype || 'application/json';
  const r = await fetch(BASE + '/api/' + path, { method, headers: h, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)), redirect: 'manual' });
  let j = {}; try { j = await r.json(); } catch { }
  const sc = r.headers.get('set-cookie') || ''; const m = /pg_session=([0-9a-f]*)/.exec(sc);
  return { s: r.status, j, setCookie: sc, cookie: m && m[1] ? 'pg_session=' + m[1] : null };
}
const login = async (u, p) => req('POST', 'login', { body: { username: u, password: p } });
const STATE = { schema: 1, app: '1.2.0', lang: 'zh-Hant', fields: { 'qp#1': '0.20' } };

(async () => {
  /* ---------------- API ---------------- */
  let r = await login(AU, 'wrong-password');
  const unknown = await login('nobody_here', 'whatever123');
  ok('A1 wrong password and unknown user both give the same 401 (no account guessing)', r.s === 401 && unknown.s === 401 && r.j.error === 'invalid_login' && unknown.j.error === 'invalid_login');
  r = await login(AU, AP0); let admin = r.cookie;
  ok('A2 correct login sets an HttpOnly, Secure, SameSite=Strict session cookie', r.s === 200 && /HttpOnly/.test(r.setCookie) && /Secure/.test(r.setCookie) && /SameSite=Strict/.test(r.setCookie) && r.j.user.must_change === true, r.setCookie.replace(/=[0-9a-f]{64}/, '=…'));
  r = await req('GET', 'projects', { cookie: admin });
  ok('A3 before the first password change, projects are refused', r.s === 403 && r.j.error === 'must_change_password');
  r = await req('POST', 'password', { cookie: admin, body: { old: AP0, new: 'short' } });
  const r2 = await req('POST', 'password', { cookie: admin, body: { old: 'bad-old-pw', new: AP } });
  ok('A4n short new password and wrong old password are refused', r.s === 400 && r.j.error === 'password_too_short' && r2.s === 401);
  r = await req('POST', 'password', { cookie: admin, body: { old: AP0, new: AP } }); const oldAdmin = admin; admin = r.cookie;
  const stale = await req('GET', 'me', { cookie: oldAdmin });
  ok('A4 password change works, issues a new session and ends the old one', r.s === 200 && admin && stale.s === 401);
  r = await req('POST', 'admin/users', { cookie: admin, body: { username: 'bad name!', password: 'Student-123' } });
  ok('A5n invalid username refused', r.s === 400 && r.j.error === 'bad_username');
  for (const u of ['stu1', 'stu2']) { r = await req('POST', 'admin/users', { cookie: admin, body: { username: u, display_name: u.toUpperCase(), password: 'Student-123' } }); }
  const dup = await req('POST', 'admin/users', { cookie: admin, body: { username: 'STU1', password: 'Student-123' } });
  ok('A5 admin creates users; duplicate name (any letter case) refused', r.s === 201 && dup.s === 409);
  const sess = {};
  for (const u of ['stu1', 'stu2']) { const l = await login(u, 'Student-123'); const c = await req('POST', 'password', { cookie: l.cookie, body: { old: 'Student-123', new: u + '-Own-Pass' } }); sess[u] = c.cookie; }
  r = await req('POST', 'projects', { cookie: sess.stu1, body: { name: '作業一', note: 'n', state: STATE, app_version: '1.2.0' } }); const pid = r.j.id;
  const bad = await req('POST', 'projects', { cookie: sess.stu1, body: { name: '', state: STATE } });
  const bad2 = await req('POST', 'projects', { cookie: sess.stu1, body: { name: 'x', state: { nofields: 1 } } });
  ok('A6 user saves a project; empty name and malformed state refused', r.s === 201 && pid > 0 && bad.s === 400 && bad2.s === 400);
  const g = await req('GET', 'projects/' + pid, { cookie: sess.stu2 }), p = await req('PUT', 'projects/' + pid, { cookie: sess.stu2, body: { name: 'hack', state: STATE } }), d = await req('DELETE', 'projects/' + pid, { cookie: sess.stu2, body: {} });
  const l2 = await req('GET', 'projects', { cookie: sess.stu2 });
  ok('A7n another user cannot read, overwrite, delete or list the project', g.s === 404 && p.s === 404 && d.s === 404 && l2.j.projects.length === 0);
  const ad = await req('GET', 'admin/users', { cookie: sess.stu1 }), all = await req('GET', 'projects?all=1', { cookie: sess.stu1 }), mk = await req('POST', 'admin/users', { cookie: sess.stu1, body: { username: 'evil', password: 'Student-123', role: 'admin' } });
  ok('A8n a user cannot reach admin functions', ad.s === 403 && all.s === 403 && mk.s === 403);
  const own = await req('GET', 'projects/' + pid, { cookie: sess.stu1 });
  const ag = await req('GET', 'projects/' + pid, { cookie: admin }), ap = await req('PUT', 'projects/' + pid, { cookie: admin, body: { name: 'x', state: STATE } }), aall = await req('GET', 'projects?all=1', { cookie: admin });
  ok('A9 owner reads own project; admin can read it and list all, but not overwrite it', own.s === 200 && own.j.project.mine && ag.s === 200 && !ag.j.project.mine && ap.s === 403 && ap.j.error === 'read_only' && aall.j.projects.length === 1 && aall.j.projects[0].owner === 'stu1');
  const csrf = await req('POST', 'projects', { cookie: sess.stu1, origin: 'https://evil.example', body: { name: 'x', state: STATE } });
  const form = await req('POST', 'projects', { cookie: sess.stu1, body: 'name=x', ctype: 'application/x-www-form-urlencoded' });
  ok('A10n cross-site and form posts are refused', csrf.s === 403 && form.s === 415);
  const anon = await req('GET', 'projects'), fake = await req('GET', 'projects', { cookie: 'pg_session=' + 'ab'.repeat(32) });
  ok('A11n no session or a made-up session is refused', anon.s === 401 && fake.s === 401);
  for (let i = 0; i < 5; i++) await login('stu2', 'wrong-' + i);
  const lk = await login('stu2', 'stu2-Own-Pass');
  ok('A12n five wrong passwords lock the account even for the right password', lk.s === 429 && lk.j.error === 'locked');
  const users = (await req('GET', 'admin/users', { cookie: admin })).j.users; const s2 = users.find(u => u.username === 'stu2'), s1 = users.find(u => u.username === 'stu1');
  await req('POST', `admin/users/${s2.id}/reset`, { cookie: admin, body: { password: 'Reset-Pass-789' } });
  const afterReset = await login('stu2', 'Reset-Pass-789'); const mustProj = await req('GET', 'projects', { cookie: afterReset.cookie });
  ok('A13 admin reset unlocks the account and forces a password change', afterReset.s === 200 && afterReset.j.user.must_change && mustProj.s === 403 && s2.locked === 1);
  await req('POST', `admin/users/${s1.id}/disable`, { cookie: admin, body: { disabled: true } });
  const dl = await login('stu1', 'stu1-Own-Pass'), ds = await req('GET', 'projects', { cookie: sess.stu1 });
  const self = await req('POST', `admin/users/${users.find(u => u.username === AU).id}/disable`, { cookie: admin, body: { disabled: true } });
  ok('A14n disabled user cannot sign in and the open session ends; admin cannot disable self', dl.s === 401 && ds.s === 401 && self.s === 400);
  await req('POST', `admin/users/${s1.id}/disable`, { cookie: admin, body: { disabled: false } });
  const lo = await req('POST', 'logout', { cookie: sess.stu2 || afterReset.cookie, body: {} });
  const el = await login('stu1', 'stu1-Own-Pass'); const lo2 = await req('POST', 'logout', { cookie: el.cookie, body: {} }); const after = await req('GET', 'me', { cookie: el.cookie });
  ok('A15 re-enabled user signs in; logout ends the session', el.s === 200 && lo2.s === 200 && after.s === 401);
  let dump = ''; try { dump = execSync('npx wrangler d1 execute pondgate-accounts --local --json --command "SELECT * FROM users"', { cwd: __dirname + '/../../server', stdio: ['ignore', 'pipe', 'ignore'] }).toString(); } catch (e) { dump = 'ERR'; }
  const plain = ['Init-Pass-123', AP, 'Student-123', 'stu1-Own-Pass', 'Reset-Pass-789'].filter(x => dump.includes(x));
  ok('A16 the database holds no password in plain text', dump !== 'ERR' && /pw_hash/.test(dump) && plain.length === 0, plain.join(',') || 'none found');
  ok('A16n negative control: the same search finds a known stored value (username)', dump.includes('stu1'));

  /* ---------------- browser UI ---------------- */
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } }); ctx.on('page', p => p.on('dialog', d => d.accept()));
  let pg = await ctx.newPage(); await pg.goto(BASE + '/'); await pg.waitForTimeout(1800);
  ok('U1 server copy shows the sign-in screen first', await pg.isVisible('#acctLoginForm'));
  await pg.fill('#acctUser', AU); await pg.fill('#acctPass', 'nope-nope'); await pg.click('#acctLoginBtn'); await pg.waitForTimeout(1200);
  const e1 = await pg.textContent('#acctLoginErr');
  ok('U2n wrong password shows a Chinese error and stays on sign-in', /帳號或密碼錯誤/.test(e1) && await pg.isVisible('#acctLoginForm'), e1);
  await pg.fill('#acctPass', AP); await pg.click('#acctLoginBtn'); await pg.waitForTimeout(1500);
  ok('U3 admin signs in; bar shows the administrator role and the Accounts button', await pg.isVisible('#acctBar') && /管理者/.test(await pg.textContent('#acctBar')) && await pg.isVisible('#acctAdmin'));
  // add a user through the UI
  await pg.click('#acctAdmin'); await pg.waitForTimeout(800); await pg.fill('#acctNU', 'stu3'); await pg.fill('#acctNP', 'Student-333'); await pg.click('#acctNAdd'); await pg.waitForTimeout(1200);
  ok('U4 admin adds a user from the Accounts window', /已新增 stu3/.test(await pg.textContent('#acctNOk')) && /stu3/.test(await pg.textContent('#acctUList')));
  await pg.click('#acctAClose');
  // change inputs, run, save, reload, open, run, compare
  const setv = (id, v) => pg.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
  const run = async () => { await pg.evaluate(() => document.getElementById('run').click()); await pg.waitForTimeout(2200); };
  const met = () => pg.evaluate(() => [...document.querySelectorAll('#metricbody tr')].map(r => r.innerText.replace(/\s+/g, ' ').trim()).join('|'));
  await setv('qp', '0.20'); await setv('tpeak', '20'); await setv('recess', '40'); await setv('storageMode', 'table'); await setv('storageTable', '0, 0\n0.5, 300\n1.0, 700\n2.0, 1600');
  await pg.evaluate(() => { const e = document.getElementById('freeDischarge'); e.checked = true; e.dispatchEvent(new Event('change', { bubbles: true })); }); await run();
  const snap1 = await pg.evaluate(() => window.PondGateAccounts.capture().fields), met1 = await met();
  await pg.click('#acctProjects'); await pg.waitForTimeout(600); await pg.fill('#acctPName', '測試專案'); await pg.click('#acctPNew'); await pg.waitForTimeout(1200);
  ok('U5 save as new project; bar shows it as the current project', /測試專案/.test(await pg.textContent('#acctCurrent')));
  pg = await ctx.newPage(); await pg.goto(BASE + '/'); await pg.waitForTimeout(1800);
  const snap0 = await pg.evaluate(() => window.PondGateAccounts.capture().fields);
  const diff0 = Object.keys(snap1).filter(k => String(snap0[k]) !== String(snap1[k]));
  ok('U6n a fresh page does not have the saved inputs (so the next check is meaningful)', diff0.length >= 3 && await pg.isVisible('#acctBar'), `${diff0.length} fields differ`);
  await pg.click('#acctProjects'); await pg.waitForTimeout(800); await pg.click('[data-open]'); await pg.waitForTimeout(1500);
  const snap2 = await pg.evaluate(() => window.PondGateAccounts.capture().fields); const diff = Object.keys(snap1).filter(k => String(snap2[k]) !== String(snap1[k]));
  await run(); const met2 = await met();
  ok('U7 opening the project restores every input field', diff.length === 0 && Object.keys(snap1).length >= 70, `${Object.keys(snap1).length} fields, ${diff.length} differ`);
  ok('U8 running again gives the same results as before saving', met1 && met1 === met2, met2.slice(0, 90));
  await pg.click('#acctOut'); await pg.waitForTimeout(800);
  ok('U9 sign out returns to the sign-in screen', await pg.isVisible('#acctLoginForm') && !(await pg.isVisible('#acctBar')));
  // a plain user does not see admin tools
  await pg.fill('#acctUser', 'stu3'); await pg.fill('#acctPass', 'Student-333'); await pg.click('#acctLoginBtn'); await pg.waitForTimeout(1500);
  const forced = await pg.isVisible('#acctPwForm');
  await pg.fill('#acctOld', 'Student-333'); await pg.fill('#acctNew', 'stu3-Own-Pass'); await pg.fill('#acctNew2', 'stu3-Own-Pass'); await pg.click('#acctPwBtn'); await pg.waitForTimeout(1500);
  ok('U10 new user must change the password first, then sees no Accounts button', forced && await pg.isVisible('#acctBar') && !(await pg.isVisible('#acctAdmin')) && /使用者/.test(await pg.textContent('#acctBar')));
  await pg.click('#acctProjects'); await pg.waitForTimeout(800);
  ok('U11n the new user does not see the admin\'s project', /還沒有專案/.test(await pg.textContent('#acctPList')));
  // static copy: accounts off
  const st = await b.newPage(); await st.goto(`http://localhost:${STATIC}/index.html`); await st.waitForTimeout(1800);
  ok('U12 static copy (Claude page) works as before: no sign-in, no bar', !(await st.isVisible('#acctLoginForm')) && !(await st.$('#acctBar')) && !(await st.$('#acctRoot')));
  await b.close();
  /* ---------------- calculation files unchanged ---------------- */
  const diffCore = execSync('git diff --stat release/v1.1.0 -- dist/routing-core.js dist/physics-refinement.js dist/module-shell.js', { cwd: __dirname + '/../..' }).toString().trim();
  const diffAll = execSync('git diff --name-only release/v1.1.0 -- dist', { cwd: __dirname + '/../..' }).toString().trim().split('\n').filter(Boolean);
  ok('C1 calculation files identical to v1.1.0; only index.html and account.js changed in dist', diffCore === '' && diffAll.every(f => ['dist/index.html', 'dist/account.js'].includes(f)), diffAll.join(', '));
  const pass = res.filter(r => r.pass).length; console.log(`${pass}/${res.length}`);
  fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), base: BASE, pass, total: res.length, results: res }, null, 1));
  process.exit(pass === res.length ? 0 : 1);
})();
