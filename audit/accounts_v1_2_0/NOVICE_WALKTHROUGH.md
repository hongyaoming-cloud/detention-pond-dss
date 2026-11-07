# Novice walkthrough of the account system (2026-11-07)

An AI tester acting as a first-time user went through all four roles on a local copy of the server
(same code as the deployed site), taking 21 screenshots. Findings and fixes:

| # | What a novice ran into | Fix | Check |
|---|---|---|---|
| N1 | Empty company name said "請輸入專案名稱" (project name) | Company-specific message | N1 |
| N2 | Adding an account before any company: empty company list, unclear error | List says "請先新增公司"; error says where to add it | N2, N2b |
| N2c | Adding a company erased the account form | Form values kept | N2c |
| N3 | After sign-out the next person saw the previous user's inputs | Page reloads on sign-out | N3 |
| N4 | No sign of unsaved changes; sign-out lost them silently | "● 有未儲存的變更" in the bar; confirm on sign-out, on opening another project and on closing the tab | N4, N4b |
| N5 | Button "專案" did not say it saves; engineers did not find saving | "存成專案" button when nothing is open; "存檔／開啟專案"; viewers see "開啟分享的專案" | N5, N5b |
| N6 | Generic "已收到操作…請查看畫面更新" toast after every account button | Account buttons excluded from that toast (button-feedback.js, display only) | N6, N6n |
| N8 | No hint for a forgotten password | "忘記密碼？請洽貴公司的管理者幫您重設。" | N8 |
| N10 | System administrator was not told the order of first steps or what roles mean | Steps line and role descriptions in the Accounts window | N10 |

Not changed: the lock message appears only from the 6th attempt (telling earlier would reveal whether an account exists).
Checks: novice_fix_check.js 13/13, accounts_check.js 47/47, guide_check.js 18/18. Calculation files unchanged.
