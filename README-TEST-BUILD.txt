WASA KASUR - CLOUDFLARE CORE TEST BUILD
=======================================

IMPORTANT
---------
This package is an API/core test build, NOT a completed Firebase-to-Cloudflare
migration. The existing admin-panel.html and officer-app.html are included
unchanged and still use Firebase for their existing screens, login, bulk tools,
PDF bill flow, notifications and activity forms. Do NOT delete/disable Firebase.
Do not create new officer accounts yet.

What this Worker adds
---------------------
- D1-backed organization/admin one-time bootstrap protected by BOOTSTRAP_SECRET.
- PBKDF2-SHA256 password hashing (210,000 iterations) and signed 12-hour JWT.
- Role-protected officer GPS heartbeat; Admin/Management-only current/history.
- Consumer import (500 rows per call), consumer map coordinates retrieval.
- Activity submission with GPS saved to activity and consumer record.
- Zone and Subzone polygon storage; GPS point-in-polygon assignment to Zone/Subzone.
- Area and Subzone-scoped unique Gali number storage.
- Authenticated private R2 uploads/downloads for JPG/PNG/WebP/PDF up to 5 MB.
- GET endpoints for zones/subzones/areas/streets and activities.

Deploy prerequisites
--------------------
1. D1 database: wasa-kasur-db. Run schema.sql once in that D1 database.
2. R2 bucket: WASA Store.
3. Worker bindings: DB -> D1 database; BUCKET -> R2 bucket.
4. Worker secrets (Cloudflare dashboard > Worker > Settings > Variables and Secrets):
   JWT_SECRET: long random secret (at least 32 random bytes)
   BOOTSTRAP_SECRET: separate long random one-time setup secret
5. Worker variable ALLOWED_ORIGIN=https://smartcear.github.io
6. Deploy worker.js. Test GET /health; it should report database:true and storage:true.
7. POST /api/bootstrap once with JSON:
   {"orgName":"WASA Kasur","orgCode":"KASUR-WASA","adminName":"System Admin","phone":"03XXXXXXXXX","password":"12+ character unique password"}
   Header: X-Bootstrap-Secret: your BOOTSTRAP_SECRET
   Never put BOOTSTRAP_SECRET in HTML/JavaScript or share it in chat.
8. Login POST /api/login with orgCode, phone, password. Use returned token as
   Authorization: Bearer <token>.

Security notes
--------------
- Management may read officer current/history; Officer cannot read other officers.
- R2 objects are not public; they are fetched through authenticated API.
- Restrict ALLOWED_ORIGIN to the exact production origin. For local tests, temporarily
  set it to your test origin, then restore it.
- Do not expose JWT_SECRET or BOOTSTRAP_SECRET.
- This is not yet a full public production security audit.

Not yet integrated in the existing HTML frontend
-------------------------------------------------
The two existing HTML apps still initialize Firebase and call Firestore directly.
Their complete UI workflows have NOT been ported to these API endpoints. Specifically
not yet migrated: existing login/session, all bulk Excel flows, PDF bill storage and
search, recovery/delivery forms, officer signup/account approvals, notifications,
correction requests, admin editing, full zone/subzone/area polygon editor, officer
team assignment, full map screens and navigation. Do not treat this as a final
replacement app or publish it to Play Store.
