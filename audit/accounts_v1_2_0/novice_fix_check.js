// Checks the fixes from the novice walkthrough of the account system (2026-11-07), with negative controls.
// Usage: node audit/accounts_v1_2_0/novice_fix_check.js <server base url> <sysadmin user> <sysadmin initial pw> <out.json>
// Needs a fresh server (only the system administrator, must_change = 1), e.g. `wrangler dev` with a new local D1.
const { chromium } = require('playwright'); const fs = require('fs');
const [BASE, SU, SP0, OUT] = [process.argv[2] || 'http://127.0.0.1:8787', process.argv[3] || 'sys', process.argv[4] || 'Init-Pass-123', process.argv[5] || 'novice_fix_check.json'];
const res = []; const ok = (id, pass, detail = '') => { res.push({ id, pass: !!pass, detail }); console.log(pass ? 'PASS' : 'FAIL', id, detail); };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const dialogs = []; ctx.on('page', p => p.on('dialog', d => { dialogs.push(d.message()); d.accept(); }));
  const pg = await ctx.newPage();
  const txt = async s => (await pg.$(s)) ? (await pg.textContent(s)).trim() : '';
  const login = async (u, p) => { await pg.fill('#acctUser', u); await pg.fill('#acctPass', p); await pg.click('#acctLoginBtn'); await pg.waitForTimeout(1400); };
  const newpw = async (o, p) => { await pg.fill('#acctOld', o); await pg.fill('#acctNew', p); await pg.fill('#acctNew2', p); await pg.click('#acctPwBtn'); await pg.waitForTimeout(1400); };
  const toastFeedback = () => pg.evaluate(() => [...document.querySelectorAll('body *')].filter(e => /已收到操作/.test(e.textContent) && e.children.length === 0 && e.getBoundingClientRect().height > 0).length);
  const setv = (id, v) => pg.evaluate(([id, v]) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
  await pg.goto(BASE + '/'); await pg.waitForTimeout(1800);
  ok('N8 sign-in screen tells a user who forgot the password what to do', /忘記密碼/.test(await txt('.acct-card')));
  await login(SU, SP0); await newpw(SP0, 'Sys-Own-Pass-1');
  await pg.click('#acctAdmin'); await pg.waitForTimeout(1000);
  ok('N6 account buttons no longer trigger the generic "已收到操作" toast', (await toastFeedback()) === 0);
  ok('N10 system administrator sees the order of first steps and what each role can do', /先新增公司/.test(await txt('#acctSteps')) && /檢視者/.test(await txt('#acctRoleHelp')));
  ok('N2 with no company yet, the company list says to add one first', /請先新增公司/.test(await txt('#acctNO')));
  await pg.fill('#acctNU', 'boss'); await pg.fill('#acctNP', 'Boss-Pass-1'); await pg.click('#acctNAdd'); await pg.waitForTimeout(900);
  ok('N2b adding an account before any company explains what to do', /先在上方「公司」新增公司/.test(await txt('#acctNErr')), await txt('#acctNErr'));
  await pg.click('#acctOAdd'); await pg.waitForTimeout(500);
  const e1 = await txt('#acctOErr');
  ok('N1 an empty company name gives a company message (was: "請輸入專案名稱")', /公司名稱/.test(e1) && !/專案/.test(e1), e1);
  await pg.fill('#acctOName', '花蓮工程顧問'); await pg.click('#acctOAdd'); await pg.waitForTimeout(1300);
  ok('N2c the username typed before adding the company is kept', (await pg.$eval('#acctNU', e => e.value)) === 'boss');
  await pg.selectOption('#acctNR', 'orgadmin'); await pg.click('#acctNAdd'); await pg.waitForTimeout(1200);
  await pg.click('#acctAClose'); await pg.click('#acctOut'); await pg.waitForTimeout(2200);
  await login('boss', 'Boss-Pass-1'); await newpw('Boss-Pass-1', 'Boss-Own-1');
  await pg.click('#acctAdmin'); await pg.waitForTimeout(900);
  for (const [u, r] of [['amy', 'engineer'], ['client', 'viewer']]) { await pg.fill('#acctNU', u); await pg.fill('#acctNP', 'Start-Pass-1'); await pg.selectOption('#acctNR', r); await pg.click('#acctNAdd'); await pg.waitForTimeout(1200); }
  await pg.click('#acctAClose'); await pg.click('#acctOut'); await pg.waitForTimeout(2200);
  await login('amy', 'Start-Pass-1'); await newpw('Start-Pass-1', 'Amy-Own-1');
  ok('N5 an engineer with no project sees a clear "存成專案" button and a "存檔／開啟專案" button', await pg.isVisible('#acctQuickSave') && /存檔／開啟專案/.test(await txt('#acctProjects')));
  await pg.click('#acctQuickSave'); await pg.waitForTimeout(800); await pg.fill('#acctPName', '光復路滯洪池'); await pg.check('#acctPShare'); await pg.click('#acctPNew'); await pg.waitForTimeout(1300);
  const clean = !(await pg.$('#acctDirty'));
  await setv('qp', '0.33'); await pg.waitForTimeout(400);
  ok('N4 after a change the bar shows "有未儲存的變更"; right after saving it does not', clean && /未儲存的變更/.test(await txt('#acctCurrent')));
  const qpBefore = await pg.$eval('#qp', e => e.value);
  dialogs.length = 0; await pg.click('#acctOut'); await pg.waitForTimeout(2200);
  ok('N4b signing out with unsaved changes asks first', dialogs.some(d => /未儲存的變更/.test(d)), dialogs.join(' | '));
  const qpAfter = await pg.$eval('#qp', e => e.value);
  ok('N3 after sign-out the page is cleared: the next person does not see the previous inputs (before: 0.33)', qpBefore === '0.33' && /登入/.test(await txt('.acct-card')) && qpAfter !== '0.33', `before=${qpBefore}, after=${qpAfter}`);
  await login('client', 'Start-Pass-1'); await newpw('Start-Pass-1', 'Client-Own-1');
  ok('N5b a viewer sees "開啟分享的專案" and no save button', /開啟分享的專案/.test(await txt('#acctProjects')) && !(await pg.$('#acctQuickSave')));
  // negative control for N6: a normal app button still shows the generic toast
  await pg.evaluate(() => document.getElementById('run').click()); await pg.waitForTimeout(600);
  ok('N6n negative control: an ordinary app button still shows its action message', (await pg.evaluate(() => /已收到操作|路由已完成/.test(document.body.innerText))));
  await b.close();
  const pass = res.filter(r => r.pass).length; console.log(`${pass}/${res.length}`);
  fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), base: BASE, pass, total: res.length, results: res }, null, 1));
  process.exit(pass === res.length ? 0 : 1);
})();
