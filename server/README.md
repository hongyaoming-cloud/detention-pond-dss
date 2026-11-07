# PondGate account server (v1.2)

Cloudflare Worker + D1 (free tier). Serves the app in `../dist` and a JSON API under `/api/`.

- Accounts: administrator and user. Administrators create accounts, reset passwords, disable accounts,
  and can open (read-only) or delete any project. Users see only their own projects.
- Passwords are stored only as PBKDF2-SHA256 hashes (100 000 iterations, random salt).
  Sessions use an HttpOnly, Secure, SameSite=Strict cookie; only a hash of the token is stored.
  Five wrong passwords lock an account for 15 minutes.
- A project stores the input fields only (Modules 1-3, 5, 6 and the language), never results.
- The calculation files are unchanged. A static copy of `dist/` (for example the Claude page) works as before,
  without sign-in, because `account.js` turns itself off when no account server answers.

Deploy: `npm install && npm run deploy` (needs `wrangler login`).
First administrator: `node tools/make_admin_sql.mjs <user> <password> [name]`, then run the printed SQL on the database.
Checks: `node ../audit/accounts_v1_2_0/accounts_check.js http://127.0.0.1:8787 <static port> <admin> <pw> out.json` against `npm run dev`.
