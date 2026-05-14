## QR Public Profile System (v0.5)

**Version:** 0.5  
**Status:** Ready for implementation  
**Target timeline:** 1-2 weeks (solo developer + AI assistance)  
**Constitution reference:** Ratified but not fully enforced (grace period for MVP)

---

## 1. Executive Summary

A working, end-to-end system where a user can create a profile, generate a QR code, stick it somewhere, and have a passerby scan it to see their profile. Human verification, multi-resolver redundancy, and advanced privacy layers are stubbed for v2.0.

**The MVP does one thing well: QR → Profile.**

---

## 2. Scope: What's In, What's Out

### In Scope (MVP v0.5)

|Feature|Description|
|---|---|
|Profile creation|Handle + manifesto line only|
|QR generation|Downloadable PNG with `hllc://` scheme|
|QR resolution|Single resolver returns profile JSON|
|Public profile page|Web view showing handle + manifesto + footer links|
|Basic revocation|User can delete profile (soft delete)|
|Offline-first|Service worker caches resolved profiles|
|Single resolver|One server. Redundancy for v1.0.|

### Out of Scope (Explicitly Deferred)

|Feature|Target version|
|---|---|
|Human verification (all levels)|v2.0|
|Semi-public / private layers|v2.0|
|Mutual consent flows|v2.0|
|Multi-resolver redundancy|v1.0|
|ZK personhood proofs|v3.0|
|Social vouching|v2.0|
|Ceremonies|v3.0|
|Voting / governance weights|v2.0|
|Epoch-based signature rotation|v1.0|
|Revocation list propagation|v1.0|

---

## 3. Architecture Overview (MVP)

text

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  User Device    │────▶│  Single Resolver│────▶│  Profile Data   │
│  (Browser)      │     │  (VPS)          │     │  (SQLite/JSON)  │
│                 │◀────│                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        │ generates QR
        ▼
┌─────────────────┐
│                 │
│  QR Code PNG    │
│  (hllc://... )  │
│                 │
└─────────────────┘

**Components:**

- **Frontend:** Static HTML/JS + service worker (hosted on same VPS or separate CDN)
    
- **Backend:** Single Node.js/Express or Python/FastAPI server
    
- **Database:** SQLite (file-based, no separate DB server needed)
    
- **QR generation:** Server-side library (node-qrcode or similar)
    
- **Deployment:** Single 5−5−10 VPS (DigitalOcean, Hetzner, etc.)
    

---

## 4. Database Schema (SQLite)

### Table: `profiles`

|Column|Type|Description|
|---|---|---|
|`profile_id`|TEXT PRIMARY KEY|20-char base58, generated client-side or server|
|`handle`|TEXT UNIQUE NOT NULL|3-32 chars, alphanumeric + underscore|
|`manifesto_line`|TEXT NOT NULL|Max 280 chars|
|`public_key`|TEXT NOT NULL|Ed25519 public key (base58)|
|`created_at`|INTEGER (Unix timestamp)||
|`revoked`|INTEGER (0/1)|Default 0|
|`revoked_at`|INTEGER|Nullable|
|`last_accessed`|INTEGER|For analytics (optional, no PII)|

### Table: `resolver_log` (optional, for MVP debugging)

|Column|Type|Description|
|---|---|---|
|`id`|INTEGER PRIMARY KEY||
|`profile_id`|TEXT||
|`resolved_at`|INTEGER|Timestamp|
|`ip_address`|TEXT|Anonymized (last octet zeroed)|

---

## 5. API Endpoints (MVP)

### 5.1 Create Profile

**Endpoint:** `POST /v0.5/profiles`

**Request body:**

json

{
  "handle": "anarcho_socialist",
  "manifesto_line": "Another world is possible. Let's build it.",
  "public_key": "ed25519_base58_public_key"
}

**Response (201 Created):**

json

{
  "profile_id": "a1b2c3d4e5f6g7h8i9j0",
  "handle": "anarcho_socialist",
  "manifesto_line": "Another world is possible. Let's build it.",
  "qr_code_url": "https://resolver.humanity.llc/v0.5/qr/a1b2c3d4e5f6g7h8i9j0.png",
  "profile_url": "https://resolver.humanity.llc/v0.5/profile/a1b2c3d4e5f6g7h8i9j0",
  "created_at": 1715721600
}

**Validation rules:**

- `handle`: 3-32 chars, `[a-z0-9_]` only, unique
    
- `manifesto_line`: 1-280 chars, any UTF-8 (plain text, no HTML)
    
- `public_key`: valid Ed25519 base58, 44 chars
    

### 5.2 Resolve Profile (Public View)

**Endpoint:** `GET /v0.5/profile/{profile_id}`

**Response (200 OK):**

json

{
  "version": "0.5",
  "profile_id": "a1b2c3d4e5f6g7h8i9j0",
  "handle": "anarcho_socialist",
  "manifesto_line": "Another world is possible. Let's build it.",
  "badge": {
    "label": "Early Builder",
    "type": "beta"
  },
  "constitution_link": "https://humanity.llc/constitution",
  "governance_link": "https://humanity.llc/proposals",
  "created_at": 1715721600,
  "revoked": false
}

**Response (404 Not Found):**

json

{
  "error": "profile_not_found",
  "message": "No profile exists with this ID"
}

**Response (410 Gone - revoked):**

json

{
  "error": "profile_revoked",
  "message": "This profile has been revoked by its owner"
}

### 5.3 Generate QR Code PNG

**Endpoint:** `GET /v0.5/qr/{profile_id}.png`

**Query params (optional):**

- `size`: pixel size (default 300, max 1000)
    
- `margin`: quiet zone (default 4)
    

**Response:** `image/png` binary

**QR payload format:**

text

hllc://resolve/{profile_id}

No signature in MVP (added in v1.0).

**Example:** `hllc://resolve/a1b2c3d4e5f6g7h8i9j0`

### 5.4 Revoke Profile

**Endpoint:** `DELETE /v0.5/profiles/{profile_id}`

**Request body:**

json

{
  "signature": "ed25519_signature_of_timestamp"
}

**Response (200 OK):**

json

{
  "success": true,
  "message": "Profile revoked. QR codes for this profile will return 410 Gone.",
  "revoked_at": 1715721600
}

**Authentication:** Request must include a signature of the current timestamp using the profile's private key. (Simple proof-of-ownership.)

**Simpler MVP alternative (if signatures are too complex):** Revocation via email link to a one-time secret stored during profile creation. Less secure but simpler. Acceptable for MVP.

### 5.5 Health Check

**Endpoint:** `GET /health`

**Response:** `{"status": "ok", "version": "0.5"}`

---

## 6. Frontend Specification

### 6.1 Profile Creation Page (`/create`)

**Required elements:**

- Input field: Handle (with validation: lowercase, no spaces, 3-32 chars)
    
- Textarea: Manifesto line (280 char limit, counter display)
    
- Generate keypair button (client-side using `libsodium.js` or Web Crypto API)
    
- Submit button
    
- Error display area
    

**Flow:**

1. User enters handle + manifesto line
    
2. Client generates Ed25519 keypair
    
3. Client sends public key + handle + manifesto to backend
    
4. Backend returns profile_id + QR code URL
    
5. Display QR code PNG + download button
    
6. Store private key in browser's `localStorage` (encrypted with session key, or plaintext with warning)
    

**Warning to display:**

> _"Your private key is stored only in this browser. If you clear your cache, you will lose the ability to revoke your profile. Download a backup below."_

**Backup option:** Download private key as JSON file.

### 6.2 Profile View Page (Resolver HTML)

**Endpoint:** `GET /profile/{profile_id}` (HTML view)

**Required elements:**

- Handle (large, top)
    
- Manifesto line
    
- Badge: "Early Builder" (static for MVP)
    
- Footer with two links:
    
    - Constitution
        
    - Governance proposals
        
- "Report this profile" link (stub: mailto or form)
    
- "Verify this human" button (stub: "Coming soon" tooltip)
    

**Offline support:**

- Service worker caches the profile page HTML + CSS + JS on first visit
    
- Subsequent loads (even offline) show last cached version with "offline" indicator
    

### 6.3 Scanner Interface (`/scan`)

**Option A (simplest):** A page explaining: "Use your phone's camera to scan any QR code. Or paste a QR code URL here."

**Option B (more advanced):** Use `jsQR` library to enable in-browser scanning (camera permission required).

**MVP recommendation:** Option A. Reduce scope. Users already have camera apps that scan QR codes. They don't need your app to scan.

**The scanner page does:**

- Accept a QR URL (pasted)
    
- Redirect to the resolved profile page
    
- Or just tell users: "Point your camera at the QR. It will open automatically."
    

---

## 7. Offline-First Implementation

### Service Worker Requirements

**File:** `sw.js`

**Caching strategy:**

|Asset type|Cache name|Strategy|
|---|---|---|
|HTML/CSS/JS|`static-v1`|Cache first (install time)|
|Profile API responses|`profiles-v1`|Network first, fallback to cache|
|QR code PNGs|`qrs-v1`|Cache first (they don't change)|

**Profile cache invalidation:**

- When user revokes a profile, service worker should evict that profile from cache
    
- Implement via `postMessage()` from main thread to sw
    

**Offline indicator:**  
Display banner: "You are offline. Viewing cached profile from [date]."

### Cache Limit

- Maximum 50 profiles stored
    
- LRU eviction (least recently used removed first)
    

---

## 8. Keypair Generation (Client-Side)

**Using Web Crypto API (built into modern browsers):**

javascript

async function generateKeypair() {
  const keypair = await crypto.subtle.generateKey(
    {
      name: "Ed25519",  // Supported in Chrome 109+, Safari 16+, Firefox 111+
      namedCurve: "Ed25519"
    },
    true,  // extractable (so we can export/backup)
    ["sign", "verify"]
  );
  const publicKey = await crypto.subtle.exportKey("raw", keypair.publicKey);
  const privateKey = await crypto.subtle.exportKey("pkcs8", keypair.privateKey);
  return {
    publicKey: base58encode(publicKey),
    privateKey: base58encode(privateKey),
    sign: async (message) => { /* ... */ }
  };
}

**Polyfill for older browsers:** Use `libsodium.js` (more compatible, slightly larger bundle).

**For MVP:** Use `libsodium.js`. It's battle-tested and has simple API.

javascript

// Using libsodium.js
await sodium.ready;
const keypair = sodium.crypto_sign_keypair();
const publicKey = sodium.to_base58(keypair.publicKey);
const privateKey = sodium.to_base58(keypair.privateKey);

---

## 9. QR Code Generation

**Server-side (recommended):** Node.js with `qrcode` package

javascript

const QRCode = require('qrcode');
const payload = `hllc://resolve/${profile_id}`;
const pngBuffer = await QRCode.toBuffer(payload, {
  errorCorrectionLevel: 'M',
  width: 300,
  margin: 4
});

**Why server-side?** Consistent output, no client-side library dependency, works offline for the generator.

**Endpoint:** `GET /v0.5/qr/{profile_id}.png`

---

## 10. Deployment Architecture (MVP)

### Single Server Setup

|Component|Technology choice|
|---|---|
|OS|Ubuntu 22.04 or 24.04|
|Web server|Nginx (reverse proxy)|
|App server|Node.js (Express) or Python (FastAPI)|
|Process manager|PM2 (Node) or systemd (Python)|
|Database|SQLite (file-based)|
|SSL|Let's Encrypt (Certbot)|
|Firewall|UFW (port 22, 80, 443 only)|

### Directory Structure

text

/var/www/humanity/
├── backend/
│   ├── app.js (or main.py)
│   ├── db/
│   │   └── profiles.sqlite
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── create.html
│   ├── profile.html (template)
│   ├── style.css
│   ├── app.js
│   └── sw.js
└── nginx/
    └── humanity.llc.conf

### Nginx Configuration (Snippet)

nginx

server {
    listen 443 ssl;
    server_name resolver.humanity.llc;
    location /v0.5/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
    location / {
        root /var/www/humanity/frontend;
        try_files $uri $uri/ /index.html;
    }
}

---

## 11. Security Considerations (MVP)

|Risk|MVP mitigation|Full solution (v1.0+)|
|---|---|---|
|Profile ID brute forcing|Rate limit: 100 requests per minute per IP|Add proof-of-work to resolution|
|QR spoofing|None in MVP (trust payload as is)|Ed25519 signatures + epochs|
|Private key loss|User can download backup|Social recovery or key rotation|
|SQL injection|Parameterized queries (never string concatenation)|Same + input validation|
|MITM attack|HTTPS only (Let's Encrypt)|Certificate pinning + HPKP|
|Revocation proof|Simple email link (less secure)|Ed25519 signature of timestamp|

**For MVP revocation (simpler):** On profile creation, generate a random 128-bit revocation secret. Store hashed version in database. User downloads secret as text file. To revoke, user submits secret via a simple form. Email not required.

---

## 12. Performance Targets (MVP)

|Metric|Target|
|---|---|
|Profile creation (API)|< 500ms p95|
|QR generation (PNG)|< 200ms p95|
|Profile resolution (API)|< 100ms p95|
|Profile page load (HTML)|< 300ms p95 (cached)|
|Concurrent users supported|~500 (single VPS, SQLite)|
|Database size per 10k profiles|~10 MB|

---

## 13. Development Roadmap (2 Weeks)

### Week 1: Backend + Database

|Day|Task|Output|
|---|---|---|
|1|Setup VPS, install Node.js/Python, configure Nginx|Working server with health check|
|2|Implement SQLite schema + create profile endpoint|Can create profiles via API|
|3|Implement resolve endpoint + revocation (simple)|Can fetch and revoke profiles|
|4|Implement QR generation endpoint|Can download QR PNG|
|5|Write API tests + rate limiting + error handling|Stable backend|

### Week 2: Frontend + Integration

|Day|Task|Output|
|---|---|---|
|6|Build profile creation page (keypair generation)|Users can create profiles in browser|
|7|Build profile view page (resolver HTML)|Scanned QR shows profile|
|8|Implement service worker + offline caching|Works offline after first load|
|9|End-to-end testing + polish (UI/UX)|Smooth user journey|
|10|Deploy to production + print test QR|REAL WORKING SYSTEM|

---

## 14. Testing Requirements (MVP)

### Manual Test Suite

|Test ID|Scenario|Expected result|
|---|---|---|
|T-01|Create profile with valid handle|Returns profile_id and QR|
|T-02|Create profile with duplicate handle|Returns 400 error|
|T-03|Create profile with invalid handle (special char)|Returns 400 error|
|T-04|Resolve existing profile|Returns correct JSON|
|T-05|Resolve non-existent profile|Returns 404|
|T-06|Revoke profile (with secret)|Subsequent resolves return 410|
|T-07|Scan QR with phone camera|Opens profile page in browser|
|T-08|Load profile page offline (after caching)|Shows cached version + offline banner|
|T-09|QR PNG downloads|File is valid PNG, scans correctly|
|T-10|Rate limiting (100 req/min)|101st request returns 429|

---

## 15. Success Metrics for MVP Launch

|Metric|Target|
|---|---|
|Users who complete profile creation|> 80% of visitors who start|
|QR resolution success rate|> 99.5% (excluding revoked)|
|Median resolution time|< 200ms|
|Offline cache hit rate|> 60% (after first visit)|
|User-reported bugs|< 5 critical, < 10 minor|

---

## 16. What Users Will See (Mock Descriptions)

**Profile creation success screen:**

> _"Your profile is live! Download your QR code below. Print it, stick it somewhere, and when people scan it, they'll see your profile."_

**QR sticker next to a laptop:**

> _"Scan to see my digital profile. Join the collective at humanity.llc"_

**Profile page (scanned view):**

> _"handle: anarcho_socialist"_  
> _"Another world is possible. Let's build it."_  
> _"[Early Builder badge]"_  
> *---*  
> _"This profile is part of a democratic socialist digital commons. No data is sold."_  
> _"[Constitution] [Governance proposals]"_

---

## 17. Post-MVP Roadmap (Indicative)

|Version|Timeline|Adds|
|---|---|---|
|v0.5 (MVP)|Week 2|As spec'd above|
|v0.6|Week 3-4|Multi-resolver (3 servers) + epoch signatures|
|v0.7|Week 5-6|Profile analytics opt-in + simple badges|
|v0.8|Week 7-8|Semi-public layer (opt-in contact info)|
|v1.0|Week 9-10|Basic social vouching (trust network only, no ZK)|
|v2.0|Month 3|Full human verification (device proofs)|

---

## 18. Risks and Mitigations (MVP Only)

|Risk|Probability|Impact|Mitigation|
|---|---|---|---|
|Single resolver goes down|Low (MVP)|High|Not mitigated in MVP. v0.6 adds redundancy.|
|SQLite corruption|Low|Medium|Daily backups to S3/alternative.|
|Private key storage in localStorage|Medium|Medium|User warned + backup download provided.|
|QR code printed too small|Medium|Low|Recommend minimum 2cm x 2cm size. Provide 600dpi option.|
|User loses revocation secret|Medium|Low|Display warning prominently. No recovery in MVP.|

---

## 19. Cost Estimate (Monthly, MVP)

|Item|Cost|
|---|---|
|VPS (2GB RAM, 1 vCPU)|6(Hetzner)/6(Hetzner)/12 (DigitalOcean)|
|Domain (humanity.llc)|15/year→15/year→1.25/month|
|SSL (Let's Encrypt)|$0|
|Backups (20GB S3)|$0.50|
|**Total**|**~$8-14/month**|

---

## 20. Implementation Notes for AI-Assisted Development

**Suggested prompt structure for your AI assistant:**

> _"I am building the MVP defined in this spec. Please generate [specific file/function] following these rules: [extract from spec]. Use Node.js with Express, SQLite, and the qrcode library. Include error handling and input validation."_

**Order of implementation (for AI):**

1. `database/schema.sql` – SQLite table definitions
    
2. `server.js` – Express server with health check endpoint
    
3. `routes/profiles.js` – POST /profiles (create)
    
4. `routes/resolve.js` – GET /profile/:id
    
5. `routes/qr.js` – GET /qr/:id.png
    
6. `routes/revoke.js` – DELETE /profiles/:id (simple secret method)
    
7. `public/create.html` – Frontend creation page
    
8. `public/profile.html` – Frontend view template
    
9. `public/sw.js` – Service worker
    
10. `public/app.js` – Client-side keypair + API calls
    

---

## 21. Definition of Done (DoD) for MVP

- All API endpoints return correct status codes and data shapes
    
- SQLite database has indexes on `profile_id` and `handle`
    
- Rate limiting implemented (100/min)
    
- Input validation on all user-provided fields
    
- HTTPS configured on production server
    
- Service worker caches static assets and profiles
    
- Offline profile view works after first load
    
- User can create profile without any third-party accounts
    
- QR code scans correctly with default iOS/Android camera apps
    
- Revocation works (profile returns 410)
    
- Deployment script (`deploy.sh`) automates setup
    
- README.md with setup instructions for local development
    
- One happy user (you) has printed and scanned their own QR
    

---

This spec is **ready for implementation**. Every component is scoped to be buildable by a solo developer with AI assistance in 1-2 weeks.

Do you want me to generate any of these files directly (e.g., the Express server, the SQL schema, the frontend HTML/JS) so you can start assembling immediately?