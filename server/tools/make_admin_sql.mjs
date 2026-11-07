// Prints an SQL INSERT for the system administrator (role sysadmin, no organisation), hashing the password the same way as the Worker.
// Usage: node tools/make_admin_sql.mjs <username> <password> [display name]
import { webcrypto as c } from 'node:crypto';
const [u, p, n = ''] = process.argv.slice(2);
if (!/^[A-Za-z0-9._-]{3,32}$/.test(u || '') || !p || p.length < 8) { console.error('usage: <username> <password 8+> [name]'); process.exit(1); }
const hex = b => Buffer.from(b).toString('hex'), salt = c.getRandomValues(new Uint8Array(16));
const key = await c.subtle.importKey('raw', new TextEncoder().encode(p), 'PBKDF2', false, ['deriveBits']);
const h = hex(await c.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256));
const s = x => "'" + String(x).replace(/'/g, "''") + "'";
console.log(`INSERT INTO users (username, display_name, role, pw_hash, pw_salt, pw_iter, must_change, created_at) VALUES (${s(u)}, ${s(n)}, 'sysadmin', '${h}', '${hex(salt)}', 100000, 1, ${Math.floor(Date.now() / 1000)});`);
