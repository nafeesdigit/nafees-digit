# WASA Kasur Cloudflare — Login & Account Setup Guide

## 📋 OVERVIEW

This system uses **Cloudflare Worker + D1 Database** for authentication. All accounts are stored in the `users` table with PBKDF2-SHA256 password hashing. There are **two ways to create accounts**:

1. **Bootstrap (One-time)** - Creates the first Admin account during initial setup
2. **Admin Panel** - Admin creates officer/management accounts after login

---

## 🚀 STEP 1: INITIAL BOOTSTRAP (First Admin Account)

**Run this ONCE after deploying the Worker:**

```bash
curl -X POST https://wasa-store-api.YOUR_SUBDOMAIN.workers.dev/api/bootstrap \
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

### What this creates:
| Field | Value |
|-------|-------|
| Organization | WASA Kasur |
| Org Code | KASUR-WASA |
| First Admin | System Administrator |
| Admin Phone | 03001234567 |
| Admin Password | YourSecurePassword123! |
| Admin Role | `admin` (full access) |

**⚠️ SAVE THESE CREDENTIALS SECURELY!** This is your only admin account initially.

---

## 🔐 STEP 2: ADMIN LOGIN

### Via Admin Panel (https://yourdomain.com/admin-panel.html)

1. Open admin-panel.html in browser
2. Enter:
   - **Phone:** `03001234567`
   - **Password:** `YourSecurePassword123!`
3. Click **Sign In**

### Via API (for testing)

```bash
curl -X POST https://wasa-store-api.YOUR_SUBDOMAIN.workers.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "orgCode": "KASUR-WASA",
    "phone": "03001234567",
    "password": "YourSecurePassword123!"
  }'
```

**Response:**
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid-here",
    "orgId": "org-uuid",
    "name": "System Administrator",
    "phone": "03001234567",
    "role": "admin",
    "zoneId": null,
    "subzoneId": null,
    "areaId": null
  }
}
```

**Save the `token`** - use it as `Authorization: Bearer <token>` for subsequent API calls.

---

## 👥 STEP 3: CREATE OFFICER ACCOUNTS (Admin Only)

### Method A: Via Admin Panel UI

1. Login as Admin
2. Navigate to **People → Officers Directory**
3. Click **Add Officer** button
4. Fill in:
   - **Name:** Officer's full name
   - **Phone:** 11-digit mobile (e.g., `03011234567`)
   - **CNIC:** 13-digit CNIC (optional but recommended)
   - **Designation:** `Field Officer` / `Recovery Officer` / `Subzone Incharge` / `Team Incharge`
   - **Role:** `officer` (for field staff) / `manager` (for management)
   - **Zone/Subzone/Area:** Assign if applicable
   - **Password:** Set initial password (min 6 chars)
5. Click **Save**

### Method B: Via API

```bash
curl -X POST https://wasa-store-api.YOUR_SUBDOMAIN.workers.dev/api/officers \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Muhammad Ali",
    "phone": "03011234567",
    "cnic": "3520212345671",
    "designation": "Field Officer",
    "role": "officer",
    "pass": "OfficerPass123",
    "zoneId": "zone-uuid-if-assigned",
    "subzoneId": "subzone-uuid-if-assigned",
    "areaId": "area-uuid-if-assigned"
  }'
```

### Officer Designations & Roles

| Designation | Role | Permissions |
|-------------|------|-------------|
| Field Officer | `officer` | Submit activities, view assigned consumers, GPS tracking |
| Recovery Officer | `officer` | Bill recovery activities, assigned zones |
| Subzone Incharge | `officer` | Supervises subzone, can create Gali numbers |
| Team Incharge | `officer` | Team coordination, view team activities |
| Management | `manager` | View live tracking, reports, no account management |
| Admin | `admin` | Full access including user management |

---

## 📱 STEP 4: OFFICER LOGIN

### Via Officer App (https://yourdomain.com/officer-app.html)

1. Open officer-app.html in browser
2. Enter:
   - **Phone:** Officer's 11-digit phone number
   - **Password:** Initial password set by Admin
3. Click **Sign In**

### Officer Self-Registration (Optional)

If Admin enables it in **Settings → Notifications & OTP**:

1. Officer opens officer-app.html
2. Clicks **Request Account Registration**
3. Fills form with Name, Phone, CNIC, Designation, Password
4. If OTP enabled: Receives SMS code
5. Request sent to Admin for approval
6. Admin approves in **People → Pending Requests**

---

## 🎯 QUICK REFERENCE: DEFAULT ACCOUNTS

### After Bootstrap (First Run Only)

| Role | Phone | Password | Org Code |
|------|-------|----------|----------|
| Admin | 03001234567 | YourSecurePassword123! | KASUR-WASA |

### To Create More Accounts

| Action | Who Can Do It | Where |
|--------|--------------|-------|
| Create Admin | Bootstrap only (once) | CLI/curl |
| Create Officer | Admin | Admin Panel → Officers |
| Create Management | Admin | Admin Panel → Officers |
| Approve Self-Reg | Admin | Admin Panel → Pending |
| Reset Password | Admin | Admin Panel → Pending |

---

## 🔑 PASSWORD REQUIREMENTS

- **Admin (Bootstrap):** Minimum 12 characters
- **Officer/Management:** Minimum 6 characters
- **Hashing:** PBKDF2-SHA256 (210,000 iterations)
- **Storage:** Only password hash stored in D1 (never plain text)

---

## 📝 ORGANIZATION CODE

- **Org Code:** `KASUR-WASA` (set during bootstrap)
- **Required for:** All login requests (`orgCode` field)
- **Format:** Uppercase, alphanumeric with hyphens
- **Purpose:** Multi-org isolation (future organizations)

---

## 🚨 TROUBLESHOOTING LOGIN

| Issue | Solution |
|-------|----------|
| "Invalid login" | Check orgCode, phone, password exactly |
| "Account disabled" | Admin must set `active=1` in users table |
| "Account pending" | Admin must approve in Pending Requests |
| "Forbidden" | Wrong role for endpoint (officer vs admin) |
| Token expired | Re-login (tokens expire in 12 hours) |
| CORS error | Check ALLOWED_ORIGIN matches your domain |

---

## 🔄 SESSION MANAGEMENT

- **Token Lifetime:** 12 hours
- **Storage:** localStorage (browser) / sessionStorage (officer app)
- **Auto-refresh:** Not implemented - re-login after expiry
- **Logout:** Clears token from storage

---

## 📱 MOBILE APP (PWA) LOGIN

1. Open `https://yourdomain.com/officer-app.html` on mobile
2. Tap "Add to Home Screen" (Chrome/Safari)
3. Opens as standalone PWA
4. Same login credentials as web
5. **HTTPS REQUIRED** for GPS/Location features

---

## 🎫 QUICK START COMMANDS

```bash
# 1. Bootstrap (run once)
BOOTSTRAP_SECRET="your-secret"
curl -X POST https://wasa-store-api.YOUR.workers.dev/api/bootstrap \
  -H "X-Bootstrap-Secret: $BOOTSTRAP_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"orgName":"WASA Kasur","orgCode":"KASUR-WASA","adminName":"Admin","phone":"03001234567","password":"W@s@0987"}'

# 2. Login as admin
TOKEN=$(curl -s -X POST https://wasa-store-api.YOUR.workers.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{"orgCode":"KASUR-WASA","phone":"03001234567","password":"W@s@0987"}' | jq -r .token)

# 3. Create officer
curl -X POST https://wasa-store-api.YOUR.workers.dev/api/officers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Officer One","phone":"03011234567","cnic":"3520212345671","designation":"Field Officer","role":"officer","pass":"Officer123"}'

# 4. Officer login test
curl -X POST https://wasa-store-api.YOUR.workers.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{"orgCode":"KASUR-WASA","phone":"03011234567","password":"Officer123"}'
```

---

## ✅ SUMMARY

1. **Run bootstrap ONCE** → Creates first admin
2. **Login as admin** at `/admin-panel.html`
3. **Create officers** via Admin Panel → Officers Directory → Add Officer
4. **Officers login** at `/officer-app.html` with their phone + password
5. **No Firebase needed** - all accounts in Cloudflare D1

**That's it!** The system is self-contained in Cloudflare. No external auth providers required.