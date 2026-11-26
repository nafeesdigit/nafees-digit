# WASA Kasur — Cloudflare-Only Field Management System
## Complete Deployment Guide

---

## 📋 TABLE OF CONTENTS

1. [Prerequisites](#prerequisites)
2. [Cloudflare Setup](#cloudflare-setup)
3. [Database Schema](#database-schema)
4. [Worker Deployment](#worker-deployment)
5. [Frontend Configuration](#frontend-configuration)
6. [Testing & Verification](#testing--verification)
7. [Security Notes](#security-notes)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 PREREQUISITES

### Required Accounts
- Cloudflare account (free tier sufficient for testing)
- Cloudflare Workers enabled (free tier: 100,000 requests/day)
- Cloudflare D1 database enabled
- Cloudflare R2 storage enabled (10GB free)

### Required Tools
- Node.js 18+ (for Wrangler CLI)
- Modern browser (Chrome/Edge recommended)
- Text editor (VS Code, etc.)

---

## ☁️ CLOUDFLARE SETUP

### Step 1: Install Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

### Step 2: Create D1 Database

```bash
wrangler d1 create wasa-kasur-db
```

Note the `database_id` from the output.

### Step 3: Create R2 Bucket

```bash
wrangler r2 bucket create WASA-Store
```

### Step 4: Create Worker

```bash
wrangler create wasa-store-api
cd wasa-store-api
```

Replace the generated `worker.js` with the provided `cloudflare/worker.js`.

---

## 🗄️ DATABASE SCHEMA

### Step 1: Run Schema SQL

Open the Cloudflare Dashboard:
1. Go to Workers & Pages > D1
2. Select `wasa-kasur-db`
3. Go to "Console" tab
4. Paste entire contents of `cloudflare/schema.sql`
5. Execute

Or via CLI:

```bash
wrangler d1 execute wasa-kasur-db --file=cloudflare/schema.sql
```

### Step 2: Verify Tables

```bash
wrangler d1 execute wasa-kasur-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

Expected tables:
- organizations
- users
- sessions
- zones
- subzones
- areas
- streets
- consumers
- activities
- officer_live_current
- officer_live_history
- files
- activity_colors
- wasaTargets
- wasaNotifications
- wasaAudit
- wasaProfileRequests
- wasaMessages
- wasaPasswordResets
- wasaConsumerChunks
- wasaConsumerMeta

---

## 🚀 WORKER DEPLOYMENT

### Step 1: Configure wrangler.toml

Edit `wrangler.toml`:

```toml
name = "wasa-store-api"
main = "worker.js"
compatibility_date = "2026-11-25"

[[d1_databases]]
binding = "DB"
database_name = "wasa-kasur-db"
database_id = "PASTE_YOUR_D1_DATABASE_ID_HERE"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "WASA-Store"

[vars]
ALLOWED_ORIGIN = "https://yourdomain.com"
```

### Step 2: Set Worker Secrets

```bash
# JWT Secret (32+ random characters)
wrangler secret put JWT_SECRET
# Generate with: openssl rand -hex 32

# Bootstrap Secret (one-time setup password)
wrangler secret put BOOTSTRAP_SECRET
# Generate with: openssl rand -hex 32
```

**⚠️ CRITICAL SECURITY WARNING:**
- NEVER commit these secrets to git
- NEVER expose BOOTSTRAP_SECRET in frontend code
- Store secrets in a secure password manager

### Step 3: Deploy Worker

```bash
wrangler deploy
```

Note the Worker URL: `https://wasa-store-api.<your-subdomain>.workers.dev`

### Step 4: Test Health Endpoint

```bash
curl https://wasa-store-api.<your-subdomain>.workers.dev/health
```

Expected response:
```json
{
  "ok": true,
  "service": "WASA Cloudflare API - Full Integration",
  "database": true,
  "storage": true,
  "build": "full-integration-2026-11-25"
}
```

---

## 🏗️ FRONTEND CONFIGURATION

### Step 1: Bootstrap Organization

**One-time only** - creates first admin account:

```bash
curl -X POST https://wasa-store-api.<your-subdomain>.workers.dev/api/bootstrap \
  -H "Content-Type: application/json" \
  -H "X-Bootstrap-Secret: YOUR_BOOTSTRAP_SECRET" \
  -d '{
    "orgName": "WASA Kasur",
    "orgCode": "KASUR-WASA",
    "adminName": "System Administrator",
    "phone": "03001234567",
    "password": "YourSecurePassword123!"
  }'
```

**⚠️ Save these credentials securely!** This creates the first admin account.

### Step 2: Configure Admin Panel

Edit `admin-panel.html`:

1. Find the `api()` function call
2. Replace placeholder URLs with your Worker URL
3. Update orgCode if different from `KASUR-WASA`

Example:
```javascript
const API_BASE = 'https://wasa-store-api.<your-subdomain>.workers.dev';
```

### Step 3: Configure Officer App

Edit `officer-app.html`:

1. Replace Firebase config with Cloudflare API base URL
2. Update orgCode to match your organization
3. Remove Firebase SDK imports (optional cleanup)

### Step 4: Deploy Frontend

Upload `admin-panel.html` and `officer-app.html` to your web hosting:
- GitHub Pages (free)
- Cloudflare Pages (free)
- Any static hosting

**Required:** HTTPS is mandatory for GPS features to work.

---

## ✅ TESTING & VERIFICATION

### Test 1: Login

```bash
curl -X POST https://wasa-store-api.<your-subdomain>.workers.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "orgCode": "KASUR-WASA",
    "phone": "03001234567",
    "password": "YourSecurePassword123!"
  }'
```

Expected: JWT token in response

### Test 2: Authenticated Request

```bash
TOKEN="your_jwt_token_from_login"
curl https://wasa-store-api.<your-subdomain>.workers.dev/api/me \
  -H "Authorization: Bearer $TOKEN"
```

Expected: User details

### Test 3: Create Officer

```bash
curl -X POST https://wasa-store-api.<your-subdomain>.workers.dev/api/officers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Officer",
    "phone": "03011234567",
    "cnic": "3520212345671",
    "designation": "Field Officer"
  }'
```

### Test 4: Create Zone

```bash
curl -X POST https://wasa-store-api.<your-subdomain>.workers.dev/api/zones \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Zone A",
    "boundary": [
      [31.1234, 74.4567],
      [31.1234, 74.5678],
      [31.2345, 74.5678],
      [31.2345, 74.4567]
    ]
  }'
```

### Test 5: Submit Activity

```bash
curl -X POST https://wasa-store-api.<your-subdomain>.workers.dev/api/activities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "activityType": "Bill Delivery",
    "consumerNo": "12345",
    "lat": 31.1234,
    "lng": 74.4567,
    "accuracy": 10,
    "data": {"status": "delivered"}
  }'
```

### Test 6: Upload Photo

```bash
curl -X POST https://wasa-store-api.<your-subdomain>.workers.dev/api/files \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-photo.jpg"
```

### Test 7: Officer Live Tracking

```bash
curl -X POST https://wasa-store-api.<your-subdomain>.workers.dev/api/track/heartbeat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lat": 31.1234,
    "lng": 74.4567,
    "accuracy": 10,
    "speed": 0,
    "heading": 0
  }'
```

---

## 🔒 SECURITY NOTES

### What This System Provides

✅ **PBKDF2-SHA256 password hashing** (210,000 iterations)
✅ **Signed JWT tokens** (12-hour expiry)
✅ **Role-based access control** (Admin/Management/Officer)
✅ **Private R2 storage** (authenticated downloads only)
✅ **Parameterized D1 queries** (SQL injection protection)
✅ **CORS restrictions** (origin-based)
✅ **Organization isolation** (multi-org architecture)

### What You Must Still Do

⚠️ **Enable HTTPS** - GPS features require secure context
⚠️ **Protect secrets** - Never commit JWT_SECRET or BOOTSTRAP_SECRET
⚠️ **Restrict ALLOWED_ORIGIN** - Set to your production domain only
⚠️ **Regular backups** - Export D1 data periodically
⚠️ **Monitor usage** - Set up Cloudflare analytics alerts

### Known Limitations

⚠️ **No Firebase Authentication** - Passwords hashed in D1, not Firebase Auth
⚠️ **Client-side session storage** - Tokens in localStorage (XSS risk if site compromised)
⚠️ **Open Firestore rules** (if keeping legacy Firebase) - Do not mix old and new auth

### Recommended Hardening

1. **Rate limiting**: Add Cloudflare Rate Limiting rules
2. **Audit logging**: Monitor wasaAudit table
3. **Session rotation**: Implement token refresh
4. **Input validation**: Add stricter validation on all endpoints
5. **File scanning**: Scan uploaded files for malware

---

## 🐛 TROUBLESHOOTING

### "D1 binding DB missing"

**Cause:** D1 database not bound to Worker
**Fix:** Check wrangler.toml and redeploy

### "R2 binding BUCKET missing"

**Cause:** R2 bucket not bound to Worker
**Fix:** Check wrangler.toml and redeploy

### "Invalid login"

**Causes:**
- Wrong orgCode, phone, or password
- User account not active
- Organization doesn't exist

**Fix:** Verify credentials, check users table

### "Unauthorized"

**Causes:**
- Missing Authorization header
- Expired JWT token
- Invalid token signature

**Fix:** Re-login, check JWT_SECRET matches

### "Forbidden"

**Cause:** Insufficient role permissions
**Fix:** Login as admin, or check role assignment

### "GPS not working"

**Causes:**
- HTTP instead of HTTPS
- Browser permission denied
- Device GPS disabled

**Fix:** Use HTTPS, grant location permission, enable GPS

### "Photo upload failed"

**Causes:**
- R2 bucket not configured
- File too large (>5MB)
- Unsupported file type

**Fix:** Check R2 binding, file size, and MIME type

### "Zone boundary not assigned"

**Cause:** GPS coordinates outside all defined zones
**Fix:** Draw zone boundaries or accept unassigned status

---

## 📞 SUPPORT

For issues:
1. Check Cloudflare Worker logs (Dashboard > Workers > wasa-store-api > Logs)
2. Check D1 query errors
3. Verify R2 bucket permissions
4. Test API endpoints with curl first
5. Check browser console for frontend errors

---

## 📄 CHANGELOG

### v1.0 - Full Cloudflare Integration (2026-11-25)
- Complete Firebase-to-Cloudflare migration
- JWT authentication
- D1 database schema
- R2 file storage
- Officer live tracking
- Zone/Subzone boundary management
- Multi-photo support
- Activity marker colors
- Consumer map with GPS

---

## 📄 LICENSE

This system is proprietary software developed for WASA Kasur.
All rights reserved.

---

**Developed by NAFEES • v3.0.0**
