// PondGate v1.2 account server (Cloudflare Worker + D1).
// Serves the static app from ./public and a small JSON API under /api/.
// Passwords: PBKDF2-SHA256, 100 000 iterations, 16-byte salt. Sessions: random 32-byte token,
// only its SHA-256 hash is stored. Cookie is HttpOnly, Secure, SameSite=Strict.
// It never touches the routing calculation; projects store only the input fields.

const ITER = 100000, SESSION_H = 12, MAX_FAIL = 5, LOCK_MIN = 15;
const MAX_STATE = 200000, MAX_PROJECTS = 100;
const USER_RE = /^[A-Za-z0-9._-]{3,32}$/;
const enc = new TextEncoder();
const now = () => Math.floor(Date.now() / 1000);
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const rand = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

async function pbkdf2(password, saltHex, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
}
function same(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
async function makeHash(password) { const salt = rand(16); return { pw_hash: await pbkdf2(password, salt, ITER), pw_salt: salt, pw_iter: ITER }; }
function pwProblem(p) { if (typeof p !== 'string' || p.length < 8) return 'password_too_short'; if (p.length > 128) return 'password_too_long'; return null; }

const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store', 'X-PondGate-Accounts': '1' };
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...SEC, ...extra } });
const err = (code, status) => json({ error: code }, status);
const cookie = (token, maxAge) => `pg_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
const pubUser = u => ({ id: u.id, username: u.username, display_name: u.display_name, role: u.role, must_change: !!u.must_change });

async function currentUser(req, env) {
  const m = /(?:^|;\s*)pg_session=([0-9a-f]{64})/.exec(req.headers.get('Cookie') || '');
  if (!m) return null;
  const row = await env.DB.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires > ?').bind(await sha256(m[1]), now()).first();
  if (!row || row.disabled) return null;
  return row;
}
async function body(req) { try { const b = await req.json(); return b && typeof b === 'object' ? b : {}; } catch { return null; } }

async function login(req, env) {
  const b = await body(req); if (!b) return err('bad_request', 400);
  const username = String(b.username || '').trim(), password = String(b.password || '');
  const u = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
  const t = now();
  if (!u) { await pbkdf2(password || 'x', '00'.repeat(16), ITER); return err('invalid_login', 401); } // same cost as a real check
  if (u.locked_until > t) return err('locked', 429);
  const ok = same(await pbkdf2(password, u.pw_salt, u.pw_iter), u.pw_hash);
  if (!ok || u.disabled) {
    if (!ok) { const f = u.failed + 1; await env.DB.prepare('UPDATE users SET failed = ?, locked_until = ? WHERE id = ?').bind(f >= MAX_FAIL ? 0 : f, f >= MAX_FAIL ? t + LOCK_MIN * 60 : 0, u.id).run(); }
    return err(u.disabled && ok ? 'disabled' : 'invalid_login', 401);
  }
  const token = rand(32);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires <= ?').bind(t),
    env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires) VALUES (?, ?, ?)').bind(await sha256(token), u.id, t + SESSION_H * 3600),
    env.DB.prepare('UPDATE users SET failed = 0, locked_until = 0, last_login = ? WHERE id = ?').bind(t, u.id)
  ]);
  return json({ user: pubUser(u) }, 200, { 'Set-Cookie': cookie(token, SESSION_H * 3600) });
}

async function logout(req, env) {
  const m = /(?:^|;\s*)pg_session=([0-9a-f]{64})/.exec(req.headers.get('Cookie') || '');
  if (m) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(m[1])).run();
  return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
}

async function changePassword(req, env, u) {
  const b = await body(req); if (!b) return err('bad_request', 400);
  if (!same(await pbkdf2(String(b.old || ''), u.pw_salt, u.pw_iter), u.pw_hash)) return err('invalid_login', 401);
  const p = pwProblem(b.new); if (p) return err(p, 400);
  if (b.new === b.old) return err('password_unchanged', 400);
  const h = await makeHash(b.new);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, must_change = 0 WHERE id = ?').bind(h.pw_hash, h.pw_salt, h.pw_iter, u.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id)
  ]);
  const token = rand(32);
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires) VALUES (?, ?, ?)').bind(await sha256(token), u.id, now() + SESSION_H * 3600).run();
  return json({ ok: true, user: pubUser({ ...u, must_change: 0 }) }, 200, { 'Set-Cookie': cookie(token, SESSION_H * 3600) });
}

function cleanProject(b) {
  const name = String(b.name || '').trim().slice(0, 80), note = String(b.note || '').slice(0, 500);
  const state = typeof b.state === 'string' ? b.state : JSON.stringify(b.state || null);
  if (!name) return { e: 'name_required' };
  if (state.length > MAX_STATE) return { e: 'project_too_large' };
  try { const s = JSON.parse(state); if (!s || typeof s !== 'object' || !s.fields) return { e: 'bad_state' }; } catch { return { e: 'bad_state' }; }
  return { name, note, state, app_version: String(b.app_version || '').slice(0, 20) };
}

async function projects(req, env, u, path) {
  const id = path[2] ? Number(path[2]) : null, M = req.method, t = now();
  if (path[2] && !(Number.isInteger(id) && id > 0)) return err('not_found', 404);
  if (!id && M === 'GET') {
    const all = new URL(req.url).searchParams.get('all') === '1';
    if (all && u.role !== 'admin') return err('forbidden', 403);
    const q = all
      ? env.DB.prepare('SELECT p.id, p.name, p.note, p.app_version, p.created_at, p.updated_at, u.username AS owner, u.display_name AS owner_name FROM projects p JOIN users u ON u.id = p.owner_id ORDER BY p.updated_at DESC')
      : env.DB.prepare('SELECT id, name, note, app_version, created_at, updated_at FROM projects WHERE owner_id = ? ORDER BY updated_at DESC').bind(u.id);
    return json({ projects: (await q.all()).results });
  }
  if (!id && M === 'POST') {
    const b = await body(req); if (!b) return err('bad_request', 400);
    const c = cleanProject(b); if (c.e) return err(c.e, 400);
    const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM projects WHERE owner_id = ?').bind(u.id).first();
    if (n.n >= MAX_PROJECTS) return err('too_many_projects', 400);
    const r = await env.DB.prepare('INSERT INTO projects (owner_id, name, note, state, app_version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(u.id, c.name, c.note, c.state, c.app_version, t, t).run();
    return json({ id: r.meta.last_row_id }, 201);
  }
  if (!id) return err('method_not_allowed', 405);
  const p = await env.DB.prepare('SELECT p.*, u.username AS owner FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.id = ?').bind(id).first();
  const mine = p && p.owner_id === u.id;
  if (!p || !(mine || u.role === 'admin')) return err('not_found', 404); // never reveal other users' projects
  if (M === 'GET') return json({ project: { id: p.id, name: p.name, note: p.note, state: p.state, app_version: p.app_version, owner: p.owner, mine, updated_at: p.updated_at } });
  if (M === 'PUT') {
    if (!mine) return err('read_only', 403); // admins may read and delete, not overwrite, a student's work
    const b = await body(req); if (!b) return err('bad_request', 400);
    const c = cleanProject(b); if (c.e) return err(c.e, 400);
    await env.DB.prepare('UPDATE projects SET name = ?, note = ?, state = ?, app_version = ?, updated_at = ? WHERE id = ?').bind(c.name, c.note, c.state, c.app_version, t, id).run();
    return json({ ok: true });
  }
  if (M === 'DELETE') { await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run(); return json({ ok: true }); }
  return err('method_not_allowed', 405);
}

async function admin(req, env, u, path) {
  if (u.role !== 'admin') return err('forbidden', 403);
  const M = req.method, id = path[3] ? Number(path[3]) : null, act = path[4];
  if (path[2] !== 'users') return err('not_found', 404);
  if (!id && M === 'GET') {
    const r = await env.DB.prepare('SELECT u.id, u.username, u.display_name, u.role, u.disabled, u.must_change, u.created_at, u.last_login, (u.locked_until > ?) AS locked, (SELECT COUNT(*) FROM projects p WHERE p.owner_id = u.id) AS projects FROM users u ORDER BY u.role, u.username').bind(now()).all();
    return json({ users: r.results });
  }
  if (!id && M === 'POST') {
    const b = await body(req); if (!b) return err('bad_request', 400);
    const username = String(b.username || '').trim(), role = b.role === 'admin' ? 'admin' : 'user';
    if (!USER_RE.test(username)) return err('bad_username', 400);
    const p = pwProblem(b.password); if (p) return err(p, 400);
    if (await env.DB.prepare('SELECT 1 FROM users WHERE username = ?').bind(username).first()) return err('username_taken', 409);
    const h = await makeHash(b.password);
    const r = await env.DB.prepare('INSERT INTO users (username, display_name, role, pw_hash, pw_salt, pw_iter, must_change, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)').bind(username, String(b.display_name || '').trim().slice(0, 60), role, h.pw_hash, h.pw_salt, h.pw_iter, now()).run();
    return json({ id: r.meta.last_row_id }, 201);
  }
  if (!(Number.isInteger(id) && id > 0) || M !== 'POST') return err('not_found', 404);
  const t = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!t) return err('not_found', 404);
  const b = await body(req); if (!b) return err('bad_request', 400);
  if (act === 'reset') {
    const p = pwProblem(b.password); if (p) return err(p, 400);
    const h = await makeHash(b.password);
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, must_change = 1, failed = 0, locked_until = 0 WHERE id = ?').bind(h.pw_hash, h.pw_salt, h.pw_iter, id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id)
    ]);
    return json({ ok: true });
  }
  if (act === 'disable') {
    if (id === u.id) return err('cannot_disable_self', 400);
    const d = b.disabled ? 1 : 0;
    const stmts = [env.DB.prepare('UPDATE users SET disabled = ? WHERE id = ?').bind(d, id)];
    if (d) stmts.push(env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id));
    await env.DB.batch(stmts);
    return json({ ok: true });
  }
  return err('not_found', 404);
}

async function api(req, env) {
  const url = new URL(req.url), path = url.pathname.replace(/\/+$/, '').split('/').slice(1); // ['api', ...]
  const M = req.method;
  if (M !== 'GET' && M !== 'HEAD') {
    // CSRF guard on top of SameSite=Strict: same-origin JSON only
    const o = req.headers.get('Origin');
    if (o && o !== url.origin) return err('bad_origin', 403);
    if (!(req.headers.get('Content-Type') || '').startsWith('application/json')) return err('json_required', 415);
  }
  if (path[1] === 'login' && M === 'POST') return login(req, env);
  if (path[1] === 'logout' && M === 'POST') return logout(req, env);
  const u = await currentUser(req, env);
  if (path[1] === 'me' && M === 'GET') return u ? json({ user: pubUser(u) }) : err('not_logged_in', 401);
  if (!u) return err('not_logged_in', 401);
  if (path[1] === 'password' && M === 'POST') return changePassword(req, env, u);
  if (u.must_change) return err('must_change_password', 403);
  if (path[1] === 'projects') return projects(req, env, u, path);
  if (path[1] === 'admin') return admin(req, env, u, path);
  return err('not_found', 404);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      try { return await api(req, env); } catch (e) { console.error(e); return err('server_error', 500); }
    }
    const r = await env.ASSETS.fetch(req);
    const h = new Headers(r.headers);
    for (const [k, v] of Object.entries(SEC)) if (k !== 'Cache-Control') h.set(k, v);
    return new Response(r.body, { status: r.status, headers: h });
  }
};
export const _test = { pbkdf2, ITER };
