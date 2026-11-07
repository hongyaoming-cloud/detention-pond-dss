/* PondGate v1.2 accounts and projects (display and storage only).
   Roles: sysadmin (organisations and accounts only), orgadmin (own organisation's accounts and projects),
   engineer (own projects, may share with the organisation), viewer (reads shared projects).
   Active only when the page is served by the PondGate account server (header X-PondGate-Accounts).
   On a static copy (Claude page, local file) it does nothing.
   A project stores the input fields of Modules 1-3, 5 and 6 and the language; it never stores
   or alters routed results. After opening a project the user presses Run again. */
(() => {
  const APP_VERSION = '1.2.0';
  const SECTIONS = ['mod-inflow', 'mod-storage', 'mod-outlet', 'mod-optimization', 'mod-evaluation'];
  const zh = () => document.documentElement.lang === 'zh-Hant';
  const T = (z, e) => zh() ? z : e;
  const ERR = {
    invalid_login: ['帳號或密碼錯誤。', 'Wrong username or password.'],
    locked: ['連續輸錯太多次，帳號暫時鎖住 15 分鐘。', 'Too many failed attempts; the account is locked for 15 minutes.'],
    disabled: ['這個帳號已停用，請洽管理者。', 'This account is disabled; contact the administrator.'],
    password_too_short: ['密碼至少要 8 個字元。', 'The password needs at least 8 characters.'],
    password_too_long: ['密碼太長（最多 128 字元）。', 'The password is too long (128 characters at most).'],
    password_unchanged: ['新密碼不能和舊密碼相同。', 'The new password must differ from the old one.'],
    bad_username: ['帳號只能用英文字母、數字、句點、底線或連字號，長度 3 到 32。', 'Usernames use 3-32 letters, digits, dots, underscores or hyphens.'],
    username_taken: ['這個帳號已經有人使用。', 'This username is already taken.'],
    name_required: ['請輸入專案名稱。', 'Enter a project name.'],
    too_many_projects: ['專案數已達上限（100 個），請先刪除舊專案。', 'Project limit reached (100); delete an old project first.'],
    project_too_large: ['專案資料太大，無法儲存。', 'The project is too large to save.'],
    read_only: ['這是其他人的專案，只能查看，不能覆蓋。請用「另存新專案」。', 'This project belongs to someone else and is read-only. Use "Save as new".'],
    not_logged_in: ['登入已過期，請重新登入。', 'Your session has expired; please sign in again.'],
    cannot_disable_self: ['不能停用自己的帳號。', 'You cannot disable your own account.'],
    not_found: ['找不到這筆資料。', 'Not found.'],
    forbidden: ['沒有權限。', 'Not allowed.'],
    org_disabled: ['您所屬的公司帳號已停用，請洽系統管理者。', 'Your organisation is disabled; contact the system administrator.'],
    org_taken: ['已有同名的公司。', 'An organisation with this name exists.'],
    org_required: ['請選擇所屬公司。', 'Choose an organisation.'],
    bad_role: ['不能指定這個權限。', 'This role cannot be assigned.'],
    cannot_change_own_role: ['不能改自己的權限。', 'You cannot change your own role.']
  };
  const ROLE = { sysadmin: ['系統管理者', 'system administrator'], orgadmin: ['公司管理者', 'organisation administrator'], engineer: ['工程師', 'engineer'], viewer: ['檢視者', 'viewer'] };
  const roleName = r => T(...(ROLE[r] || [r, r]));
  const canSave = () => me && (me.role === 'engineer' || me.role === 'orgadmin');
  const isAdmin = () => me && (me.role === 'sysadmin' || me.role === 'orgadmin');
  const msg = code => (ERR[code] ? T(...ERR[code]) : T('發生錯誤：', 'Error: ') + code);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const when = s => s ? new Date(s * 1000).toLocaleString(zh() ? 'zh-TW' : 'en-GB', { hour12: false }) : '—';

  let me = null, current = null; // current = { id, name, note, mine }

  async function call(method, path, data) {
    const r = await fetch('/api/' + path, { method, credentials: 'same-origin', headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined });
    let j = {}; try { j = await r.json(); } catch { }
    if (r.status === 401 && path !== 'login' && path !== 'password') { me = null; showLogin(); }
    if (!r.ok) throw Object.assign(new Error(j.error || 'http_' + r.status), { code: j.error || 'http_' + r.status });
    return j;
  }

  /* ---------- project state ---------- */
  function fields() {
    const out = [];
    for (const sid of SECTIONS) { const s = document.getElementById(sid); if (!s) continue;
      s.querySelectorAll('input[id],select[id],textarea[id]').forEach(e => { if (e.type !== 'file' && e.type !== 'button' && !e.closest('#acctRoot')) out.push(e); }); }
    return out;
  }
  function keyed() { const seen = {}; return fields().map(e => { const n = seen[e.id] = (seen[e.id] || 0) + 1; return [e.id + '#' + n, e]; }); }
  function capture() {
    const f = {}; for (const [k, e] of keyed()) f[k] = (e.type === 'checkbox' || e.type === 'radio') ? e.checked : e.value;
    return { schema: 1, app: APP_VERSION, lang: document.documentElement.lang, fields: f };
  }
  function setOne(e, v) {
    if (e.type === 'checkbox' || e.type === 'radio') { if (e.checked === !!v) return false; e.checked = !!v; }
    else { if (e.value === String(v)) return false; e.value = String(v); }
    e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true;
  }
  function restore(state) {
    const f = state.fields || {};
    // several passes: choosing a case or mode can reset or create other fields
    for (let pass = 0; pass < 4; pass++) { let changed = 0; for (const [k, e] of keyed()) if (k in f) changed += setOne(e, f[k]) ? 1 : 0; if (!changed) break; }
    const now = capture().fields; return Object.keys(f).filter(k => k in now && String(now[k]) !== String(f[k]));
  }

  /* ---------- UI ---------- */
  const CSS = `#acctRoot{font:14px/1.5 system-ui,-apple-system,"Noto Sans TC",sans-serif}
#acctBar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:6px 12px;background:#eef6fa;border-bottom:1px solid #cfe3ee;font-size:14px}
#acctBar .who{font-weight:600}#acctBar .proj{color:#24506a}#acctBar .sp{flex:1}
.acct-btn{padding:5px 10px;border:1px solid #1f6f99;background:#fff;color:#1f6f99;border-radius:4px;cursor:pointer;font:inherit}
.acct-btn.primary{background:#1f6f99;color:#fff}.acct-btn.danger{border-color:#b3261e;color:#b3261e}
.acct-veil{position:fixed;inset:0;background:rgba(10,30,45,.55);z-index:10000;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:40px 16px}
.acct-card{background:#fff;color:#123;border-radius:8px;max-width:860px;width:100%;padding:20px 22px;box-shadow:0 10px 40px rgba(0,0,0,.3)}
.acct-card.small{max-width:380px}.acct-card h2{margin:0 0 12px;font-size:20px}.acct-card h3{margin:18px 0 8px;font-size:16px}
.acct-card label{display:block;margin:8px 0 2px;font-weight:600}.acct-card input,.acct-card select,.acct-card textarea{width:100%;box-sizing:border-box;padding:7px 8px;border:1px solid #9bb;border-radius:4px;font:inherit}
.acct-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center}
.acct-err{color:#b3261e;margin-top:8px;min-height:1.2em}.acct-ok{color:#1b6e2e;margin-top:8px;min-height:1.2em}
.acct-card table{width:100%;border-collapse:collapse;font-size:13px}.acct-card th,.acct-card td{border-bottom:1px solid #dde;padding:5px 6px;text-align:left;vertical-align:top}
.acct-tag{display:inline-block;padding:0 6px;border-radius:3px;background:#e7eef3;font-size:12px}.acct-tag.off{background:#f6dcda}
.acct-note{color:#456;font-size:13px}`;
  const root = document.createElement('div'); root.id = 'acctRoot';
  const style = document.createElement('style'); style.textContent = CSS;
  let veil = null;
  function close() { veil?.remove(); veil = null; }
  function modal(html, small, dismissable = true) {
    close(); veil = document.createElement('div'); veil.className = 'acct-veil';
    veil.innerHTML = `<div class="acct-card${small ? ' small' : ''}" role="dialog" aria-modal="true">${html}</div>`;
    if (dismissable) veil.addEventListener('click', e => { if (e.target === veil) close(); });
    root.appendChild(veil); setTimeout(() => veil?.querySelector('input,button')?.focus(), 30); return veil.firstElementChild;
  }
  const q = s => veil?.querySelector(s);

  function showLogin(note) {
    const c = modal(`<h2>PondGate ${T('登入', 'Sign in')}</h2>
      <p class="acct-note">${T('請用管理者發給您的帳號登入。第一次登入後會請您改密碼。', 'Sign in with the account your administrator gave you. You will be asked to change the password the first time.')}</p>
      <form id="acctLoginForm"><label for="acctUser">${T('帳號', 'Username')}</label><input id="acctUser" autocomplete="username" required>
      <label for="acctPass">${T('密碼', 'Password')}</label><input id="acctPass" type="password" autocomplete="current-password" required>
      <div class="acct-err" id="acctLoginErr">${note ? esc(note) : ''}</div>
      <div class="acct-row"><button class="acct-btn primary" id="acctLoginBtn" type="submit">${T('登入', 'Sign in')}</button>
      <button class="acct-btn" type="button" id="acctLangBtn">${T('English', '中文')}</button></div></form>`, true, false);
    c.querySelector('#acctLangBtn').onclick = () => { document.getElementById('lang')?.click(); setTimeout(() => showLogin(), 50); };
    c.querySelector('#acctLoginForm').onsubmit = async e => {
      e.preventDefault(); const b = q('#acctLoginBtn'); b.disabled = true; q('#acctLoginErr').textContent = '';
      try { const r = await call('POST', 'login', { username: q('#acctUser').value, password: q('#acctPass').value }); me = r.user; afterLogin(); }
      catch (x) { q('#acctLoginErr').textContent = msg(x.code); b.disabled = false; }
    };
  }
  function showPassword(forced) {
    modal(`<h2>${T('變更密碼', 'Change password')}</h2>
      ${forced ? `<p class="acct-note">${T('第一次登入或密碼被重設後，請先設定自己的新密碼（至少 8 個字元）。', 'Please set your own new password first (at least 8 characters).')}</p>` : ''}
      <form id="acctPwForm"><label for="acctOld">${T('目前密碼', 'Current password')}</label><input id="acctOld" type="password" autocomplete="current-password" required>
      <label for="acctNew">${T('新密碼', 'New password')}</label><input id="acctNew" type="password" autocomplete="new-password" minlength="8" required>
      <label for="acctNew2">${T('再輸入一次新密碼', 'New password again')}</label><input id="acctNew2" type="password" autocomplete="new-password" required>
      <div class="acct-err" id="acctPwErr"></div>
      <div class="acct-row"><button class="acct-btn primary" type="submit" id="acctPwBtn">${T('確定', 'Save')}</button>${forced ? `<button class="acct-btn" type="button" id="acctPwOut">${T('登出', 'Sign out')}</button>` : `<button class="acct-btn" type="button" id="acctPwCancel">${T('取消', 'Cancel')}</button>`}</div></form>`, true, !forced);
    q('#acctPwCancel')?.addEventListener('click', close); q('#acctPwOut')?.addEventListener('click', logout);
    q('#acctPwForm').onsubmit = async e => {
      e.preventDefault(); const er = q('#acctPwErr'); er.textContent = '';
      if (q('#acctNew').value !== q('#acctNew2').value) { er.textContent = T('兩次輸入的新密碼不一樣。', 'The two new passwords differ.'); return; }
      try { const r = await call('POST', 'password', { old: q('#acctOld').value, new: q('#acctNew').value }); me = r.user; close(); renderBar(); toast(T('密碼已更新。', 'Password updated.')); }
      catch (x) { er.textContent = msg(x.code); }
    };
  }
  function toast(t) { const b = document.getElementById('acctToast'); if (!b) return; b.textContent = t; b.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => b.hidden = true, 4000); }

  function renderBar() {
    let bar = document.getElementById('acctBar');
    if (!me) { bar?.remove(); return; }
    if (!bar) { bar = document.createElement('div'); bar.id = 'acctBar'; document.querySelector('header.top')?.insertAdjacentElement('afterend', bar) || document.body.prepend(bar); }
    const proj = me.role === 'sysadmin' ? T('系統管理者不開啟公司專案', 'System administrators do not open company projects')
      : current ? T('目前專案：', 'Project: ') + esc(current.name) + (current.writable ? (current.shared ? T('（已分享給同公司）', ' (shared)') : '') : T('（唯讀）', ' (read-only)')) : T('尚未開啟專案', 'No project open');
    bar.innerHTML = `<span class="who">${esc(me.display_name || me.username)}</span><span class="acct-tag" id="acctRole">${roleName(me.role)}</span>${me.org_name ? `<span class="acct-tag">${esc(me.org_name)}</span>` : ''}
      <span class="proj" id="acctCurrent">${proj}</span>
      <span class="sp"></span>
      ${current?.writable ? `<button class="acct-btn primary" id="acctSave">${T('儲存', 'Save')}</button>` : ''}
      ${me.role === 'sysadmin' ? '' : `<button class="acct-btn" id="acctProjects">${T('專案', 'Projects')}</button>`}
      ${isAdmin() ? `<button class="acct-btn" id="acctAdmin">${T('帳號管理', 'Accounts')}</button>` : ''}
      <button class="acct-btn" id="acctPw">${T('變更密碼', 'Password')}</button>
      <button class="acct-btn" id="acctOut">${T('登出', 'Sign out')}</button>
      <span id="acctToast" class="acct-ok" hidden role="status"></span>`;
    bar.querySelector('#acctSave')?.addEventListener('click', saveCurrent);
    bar.querySelector('#acctProjects')?.addEventListener('click', showProjects);
    bar.querySelector('#acctAdmin')?.addEventListener('click', showAdmin);
    bar.querySelector('#acctPw').onclick = () => showPassword(false);
    bar.querySelector('#acctOut').onclick = logout;
  }
  async function logout() { try { await call('POST', 'logout', {}); } catch { } me = null; current = null; renderBar(); showLogin(); }
  function afterLogin() { close(); renderBar(); if (me.must_change) showPassword(true); }

  async function saveCurrent() {
    if (!current?.writable) return;
    try { await call('PUT', 'projects/' + current.id, { name: current.name, note: current.note, shared: current.shared, state: capture(), app_version: APP_VERSION }); toast(T('已儲存「', 'Saved "') + current.name + T('」。', '".')); }
    catch (x) { toast(msg(x.code)); }
  }
  async function openProject(id) {
    const { project: p } = await call('GET', 'projects/' + id);
    const st = JSON.parse(p.state);
    if (st.lang && st.lang !== document.documentElement.lang) document.getElementById('lang')?.click();
    const off = restore(st);
    current = { id: p.id, name: p.name, note: p.note, shared: p.shared, mine: p.mine, writable: p.writable, owner: p.owner };
    close(); renderBar();
    window.DSSWorkspacePages?.openTarget('mod-inflow');
    toast(off.length ? T(`已開啟，但有 ${off.length} 個欄位無法還原。`, `Opened, but ${off.length} fields could not be restored.`) : T('已開啟。請到模組 4 按「執行」重新計算結果。', 'Opened. Press Run in Module 4 to compute the results again.'));
    return off;
  }
  async function toggleShare(id) {
    const { project: p } = await call('GET', 'projects/' + id);
    await call('PUT', 'projects/' + id, { name: p.name, note: p.note, state: p.state, app_version: p.app_version, shared: !p.shared });
    if (current && current.id === p.id) { current.shared = !p.shared; renderBar(); }
  }
  const table = (rows, cols, actions) => rows.length ? `<table><thead><tr>${cols.map(c => `<th>${c[0]}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${c[1](r)}</td>`).join('')}<td>${actions(r)}</td></tr>`).join('')}</tbody></table>` : `<p class="acct-note">${T('沒有資料。', 'Nothing here.')}</p>`;
  const openBtn = p => `<button class="acct-btn" data-open="${p.id}">${T('開啟', 'Open')}</button>`;
  const delBtn = p => `<button class="acct-btn danger" data-del="${p.id}" data-name="${esc(p.name)}">${T('移到回收區', 'To trash')}</button>`;
  async function showProjects() {
    const c = modal(`<h2>${T('專案', 'Projects')}</h2>
      <p class="acct-note">${T('專案只存輸入值（入流、蓄水、出口、篩選、證據欄位），不存計算結果；開啟後請重新按「執行」。刪除會先移到回收區，可以還原。', 'A project stores inputs only; press Run again after opening. Deleted projects go to the trash and can be restored.')}</p>
      ${canSave() ? `<h3>${T('把目前畫面存成新專案', 'Save the current inputs as a new project')}</h3>
      <label for="acctPName">${T('專案名稱', 'Project name')}</label><input id="acctPName" maxlength="80">
      <label for="acctPNote">${T('備註（可空白）', 'Note (optional)')}</label><input id="acctPNote" maxlength="500">
      <label style="font-weight:400"><input type="checkbox" id="acctPShare" style="width:auto"> ${T('分享給同公司的人（他們只能看，不能改）', 'Share with my organisation (read-only for others)')}</label>
      <div class="acct-row"><button class="acct-btn primary" id="acctPNew">${T('另存新專案', 'Save as new')}</button><span class="acct-err" id="acctPErr"></span></div>
      <h3>${T('我的專案', 'My projects')}</h3><div id="acctPList">…</div>` : `<p class="acct-note">${T('檢視者可以開啟同事分享的專案，但不能存檔。', 'Viewers can open shared projects but cannot save.')}</p>`}
      <h3>${T('同事分享的專案（唯讀）', 'Shared by colleagues (read-only)')}</h3><div id="acctSList">…</div>
      ${me.role === 'orgadmin' ? `<h3>${T('公司全部專案', 'All organisation projects')}</h3><div id="acctOList">…</div>` : ''}
      ${canSave() ? `<h3>${T('回收區', 'Trash')}</h3><div id="acctTList">…</div>` : ''}
      <div class="acct-row"><button class="acct-btn" id="acctPClose">${T('關閉', 'Close')}</button></div>`);
    c.querySelector('#acctPClose').onclick = close;
    c.querySelector('#acctPNew')?.addEventListener('click', async () => {
      const name = q('#acctPName').value.trim(), note = q('#acctPNote').value, shared = q('#acctPShare').checked;
      try { const r = await call('POST', 'projects', { name, note, shared, state: capture(), app_version: APP_VERSION }); current = { id: r.id, name, note, shared, mine: true, writable: true }; close(); renderBar(); toast(T('已存成新專案「', 'Saved as "') + name + T('」。', '".')); }
      catch (x) { q('#acctPErr').textContent = msg(x.code); }
    });
    const by = p => esc(p.owner_name || p.owner), name = p => esc(p.name) + (p.note ? `<div class="acct-note">${esc(p.note)}</div>` : '');
    try {
      const jobs = [call('GET', 'projects?scope=shared')];
      if (canSave()) jobs.push(call('GET', 'projects?scope=mine'), call('GET', 'projects?scope=trash'));
      if (me.role === 'orgadmin') jobs.push(call('GET', 'projects?scope=org'));
      const [sh, mine, trash, org] = await Promise.all(jobs);
      if (mine) q('#acctPList').innerHTML = table(mine.projects, [[T('名稱', 'Name'), name], [T('分享', 'Shared'), p => p.shared ? T('已分享', 'yes') : T('未分享', 'no')], [T('最後儲存', 'Saved'), p => when(p.updated_at)]],
        p => `${openBtn(p)} <button class="acct-btn" data-share="${p.id}">${p.shared ? T('取消分享', 'Unshare') : T('分享', 'Share')}</button> ${delBtn(p)}`);
      q('#acctSList').innerHTML = table(sh.projects, [[T('擁有者', 'Owner'), by], [T('名稱', 'Name'), name], [T('最後儲存', 'Saved'), p => when(p.updated_at)]], openBtn);
      if (org) q('#acctOList').innerHTML = table(org.projects, [[T('擁有者', 'Owner'), by], [T('名稱', 'Name'), name], [T('分享', 'Shared'), p => p.shared ? T('已分享', 'yes') : T('未分享', 'no')], [T('最後儲存', 'Saved'), p => when(p.updated_at)]], p => `${openBtn(p)} ${delBtn(p)}`);
      if (trash) q('#acctTList').innerHTML = table(trash.projects, [[T('擁有者', 'Owner'), by], [T('名稱', 'Name'), name], [T('刪除時間', 'Deleted'), p => when(p.deleted_at)]], p => `<button class="acct-btn" data-restore="${p.id}">${T('還原', 'Restore')}</button>`);
      wireProjectButtons(showProjects);
    } catch (x) { toast(msg(x.code)); }
  }
  function wireProjectButtons(reload) {
    veil?.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openProject(b.dataset.open).catch(x => toast(msg(x.code))));
    veil?.querySelectorAll('[data-share]').forEach(b => b.onclick = () => toggleShare(b.dataset.share).then(reload, x => toast(msg(x.code))));
    veil?.querySelectorAll('[data-restore]').forEach(b => b.onclick = () => call('POST', `projects/${b.dataset.restore}/restore`, {}).then(reload, x => toast(msg(x.code))));
    veil?.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (!confirm(T(`把專案「${b.dataset.name}」移到回收區？之後可以還原。`, `Move project "${b.dataset.name}" to the trash? It can be restored.`))) return;
      try { await call('DELETE', 'projects/' + b.dataset.del, {}); if (current && String(current.id) === b.dataset.del) { current = null; renderBar(); } reload(); } catch (x) { toast(msg(x.code)); }
    });
  }

  async function showAdmin() {
    const sys = me.role === 'sysadmin';
    const roles = (sys ? ['orgadmin', 'engineer', 'viewer', 'sysadmin'] : ['engineer', 'viewer', 'orgadmin']);
    const c = modal(`<h2>${T('帳號管理', 'Accounts')}${sys ? '' : ' — ' + esc(me.org_name)}</h2>
      ${sys ? `<h3>${T('公司', 'Organisations')}</h3>
      <div class="acct-row" style="margin-top:0"><div style="flex:1;min-width:200px"><label for="acctOName">${T('新增公司名稱', 'New organisation name')}</label><input id="acctOName" maxlength="80"></div>
      <button class="acct-btn primary" id="acctOAdd" style="align-self:flex-end">${T('新增公司', 'Add organisation')}</button><span class="acct-err" id="acctOErr" style="align-self:flex-end"></span></div>
      <div id="acctOrgList">…</div>` : ''}
      <h3>${T('新增帳號', 'Add an account')}</h3>
      <div class="acct-row" style="margin-top:0"><div style="flex:1;min-width:130px"><label for="acctNU">${T('帳號（英數字）', 'Username')}</label><input id="acctNU" maxlength="32"></div>
      <div style="flex:1;min-width:130px"><label for="acctNN">${T('顯示名稱（可空白）', 'Display name (optional)')}</label><input id="acctNN" maxlength="60"></div>
      <div style="flex:1;min-width:130px"><label for="acctNP">${T('初始密碼（至少 8 字元）', 'Initial password (8+ chars)')}</label><input id="acctNP" maxlength="128"></div>
      <div style="width:150px"><label for="acctNR">${T('權限', 'Role')}</label><select id="acctNR">${roles.map(r => `<option value="${r}">${roleName(r)}</option>`).join('')}</select></div>
      ${sys ? `<div style="width:170px"><label for="acctNO">${T('所屬公司', 'Organisation')}</label><select id="acctNO"></select></div>` : ''}</div>
      <div class="acct-row"><button class="acct-btn primary" id="acctNAdd">${T('新增', 'Add')}</button><button class="acct-btn" id="acctNGen">${T('產生隨機密碼', 'Random password')}</button><span class="acct-err" id="acctNErr"></span><span class="acct-ok" id="acctNOk"></span></div>
      <p class="acct-note">${T('新帳號第一次登入時必須改密碼。請把帳號與初始密碼私下交給本人。', 'New accounts must change the password at first sign-in. Give the initial password privately.')}</p>
      <h3>${T('帳號列表', 'Accounts')}</h3><div id="acctUList">…</div>
      <details><summary>${T('操作紀錄（最近 300 筆）', 'Activity log (latest 300)')}</summary><div id="acctLog">…</div></details>
      <div class="acct-row"><button class="acct-btn" id="acctAClose">${T('關閉', 'Close')}</button></div>`);
    c.querySelector('#acctAClose').onclick = close;
    c.querySelector('#acctNGen').onclick = () => { q('#acctNP').value = genPw(); };
    c.querySelector('#acctOAdd')?.addEventListener('click', async () => { try { await call('POST', 'admin/orgs', { name: q('#acctOName').value }); showAdmin(); } catch (x) { q('#acctOErr').textContent = msg(x.code); } });
    c.querySelector('#acctNR').onchange = () => { const o = q('#acctNO'); if (o) o.disabled = q('#acctNR').value === 'sysadmin'; };
    c.querySelector('#acctNAdd').onclick = async () => {
      q('#acctNErr').textContent = ''; q('#acctNOk').textContent = '';
      const u = q('#acctNU').value.trim(), p = q('#acctNP').value;
      try { await call('POST', 'admin/users', { username: u, display_name: q('#acctNN').value, password: p, role: q('#acctNR').value, org_id: q('#acctNO')?.value }); await showAdmin(); q('#acctNOk').textContent = T(`已新增 ${u}，初始密碼：${p}`, `Added ${u}; initial password: ${p}`); }
      catch (x) { q('#acctNErr').textContent = msg(x.code); }
    };
    try {
      const [{ users }, orgs, { audit }] = await Promise.all([call('GET', 'admin/users'), sys ? call('GET', 'admin/orgs') : null, call('GET', 'admin/audit')]);
      if (orgs) {
        q('#acctNO').innerHTML = orgs.orgs.filter(o => !o.disabled).map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('');
        q('#acctOrgList').innerHTML = table(orgs.orgs, [[T('公司', 'Organisation'), o => esc(o.name)], [T('帳號數', 'Accounts'), o => o.users], [T('專案數', 'Projects'), o => o.projects], [T('狀態', 'Status'), o => o.disabled ? `<span class="acct-tag off">${T('已停用', 'disabled')}</span>` : `<span class="acct-tag">${T('正常', 'active')}</span>`]],
          o => `<button class="acct-btn${o.disabled ? '' : ' danger'}" data-odis="${o.id}" data-to="${o.disabled ? 0 : 1}">${o.disabled ? T('啟用', 'Enable') : T('停用', 'Disable')}</button>`);
      }
      const status = u => u.disabled ? `<span class="acct-tag off">${T('已停用', 'disabled')}</span>` : u.locked ? `<span class="acct-tag off">${T('鎖定中', 'locked')}</span>` : u.must_change ? `<span class="acct-tag">${T('待改密碼', 'must change pw')}</span>` : `<span class="acct-tag">${T('正常', 'active')}</span>`;
      const roleCell = u => (u.id === me.id || u.role === 'sysadmin') ? roleName(u.role) : `<select data-role="${u.id}" aria-label="${T('權限', 'Role')}">${['orgadmin', 'engineer', 'viewer'].map(r => `<option value="${r}"${r === u.role ? ' selected' : ''}>${roleName(r)}</option>`).join('')}</select>`;
      const cols = [[T('帳號', 'Username'), u => esc(u.username)], [T('名稱', 'Name'), u => esc(u.display_name)]];
      if (sys) cols.push([T('公司', 'Organisation'), u => esc(u.org_name || '—')]);
      cols.push([T('權限', 'Role'), roleCell], [T('狀態', 'Status'), status], [T('專案數', 'Projects'), u => u.projects], [T('最後登入', 'Last sign-in'), u => when(u.last_login)]);
      q('#acctUList').innerHTML = table(users, cols, u => `<button class="acct-btn" data-reset="${u.id}" data-u="${esc(u.username)}">${T('重設密碼', 'Reset password')}</button>${u.id === me.id ? '' : ` <button class="acct-btn${u.disabled ? '' : ' danger'}" data-dis="${u.id}" data-to="${u.disabled ? 0 : 1}">${u.disabled ? T('啟用', 'Enable') : T('停用', 'Disable')}</button>`}`);
      q('#acctLog').innerHTML = table(audit, [[T('時間', 'Time'), a => when(a.at)], [T('帳號', 'User'), a => esc(a.username || '—')], ...(sys ? [[T('公司', 'Org'), a => esc(a.org_name || '—')]] : []), [T('動作', 'Action'), a => esc(a.action)], [T('對象', 'Target'), a => esc(a.target)], [T('說明', 'Detail'), a => esc(a.detail)]], () => '');
      veil.querySelectorAll('[data-reset]').forEach(b => b.onclick = async () => {
        const p = genPw(); if (!confirm(T(`把 ${b.dataset.u} 的密碼重設為 ${p}？對方下次登入須改密碼。`, `Reset ${b.dataset.u}'s password to ${p}? They must change it at next sign-in.`))) return;
        try { await call('POST', `admin/users/${b.dataset.reset}/reset`, { password: p }); await showAdmin(); q('#acctNOk').textContent = T(`${b.dataset.u} 的新密碼：${p}`, `${b.dataset.u}'s new password: ${p}`); } catch (x) { toast(msg(x.code)); }
      });
      veil.querySelectorAll('[data-dis]').forEach(b => b.onclick = async () => { try { await call('POST', `admin/users/${b.dataset.dis}/disable`, { disabled: b.dataset.to === '1' }); showAdmin(); } catch (x) { toast(msg(x.code)); } });
      veil.querySelectorAll('[data-odis]').forEach(b => b.onclick = async () => { if (b.dataset.to === '1' && !confirm(T('停用後，這家公司所有人都不能登入（資料保留）。確定？', 'Everyone in this organisation will be unable to sign in (data kept). Continue?'))) return; try { await call('POST', `admin/orgs/${b.dataset.odis}/disable`, { disabled: b.dataset.to === '1' }); showAdmin(); } catch (x) { toast(msg(x.code)); } });
      veil.querySelectorAll('[data-role]').forEach(s => s.onchange = async () => { try { await call('POST', `admin/users/${s.dataset.role}/role`, { role: s.value }); showAdmin(); } catch (x) { toast(msg(x.code)); showAdmin(); } });
    } catch (x) { if (q('#acctUList')) q('#acctUList').textContent = msg(x.code); }
  }
  function genPw() { const a = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; const r = crypto.getRandomValues(new Uint32Array(10)); return [...r].map(x => a[x % a.length]).join(''); }

  new MutationObserver(() => { if (me) renderBar(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  async function start() {
    let r; try { r = await fetch('/api/me', { credentials: 'same-origin' }); } catch { return; }
    if (r.headers.get('X-PondGate-Accounts') !== '1') return; // static copy: accounts off
    document.head.appendChild(style); document.body.appendChild(root);
    if (r.ok) { me = (await r.json()).user; afterLogin(); } else showLogin();
  }
  window.PondGateAccounts = Object.freeze({ capture, restore, openProject, active: () => !!me, version: APP_VERSION });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
