## QR Public Profile System – Humanity Commons

**Version:** 0.5 (MVP)  
**Status:** Ready for implementation  
**Technical Standards Compliance:** Partial (full compliance targeted for v1.0)  
**Target Timeline:** 1-2 weeks (solo developer + AI assistance)

---

## 1. Executive Summary

A working, end-to-end system where a user can create a profile, generate a QR code, print or stick it somewhere, and have a passerby scan it to see their profile page.

**What the MVP does:**

- User creates profile (handle + manifesto line)
    
- System generates downloadable QR code PNG
    
- QR resolves to human-readable profile page
    
- User can revoke profile (simple method)
    
- Profiles work offline after first view
    

**What the MVP does NOT do (deferred to v1.0+):**

- Multi-resolver redundancy
    
- Signature-based QR verification
    
- Human verification / proof of personhood
    
- Semi-public or private layers
    
- Mutual consent flows
    
- Voting or governance weights
    

---

## 2. Architecture Overview

### 2.1 Components

text

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  User Device    │────▶│  Single Resolver│────▶│  SQLite         │
│  (Browser)      │     │  (VPS)          │     │  Database       │
│                 │◀────│                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        │ generates QR
        ▼
┌─────────────────┐
│                 │
│  QR Code PNG    │
│  (hc://... )    │
│                 │
└─────────────────┘

### 2.2 Technology Choices (Recommended)

|Component|Technology|Reason|
|---|---|---|
|Backend|Node.js + Express|Simple, large ecosystem, easy QR generation|
|Database|SQLite|No separate DB server, file-based, easy backups|
|QR generation|`qrcode` npm package|Pure JavaScript, no external dependencies|
|Frontend|Vanilla HTML/CSS/JS|No framework complexity, works offline|
|Offline caching|Service Worker|Native browser API|
|Cryptography|`libsodium.js`|Battle-tested, simple Ed25519 API|
|Deployment|Single VPS (Ubuntu + Nginx)|Minimal ops complexity|

### 2.3 Cost Estimate (Monthly)

|Item|Cost|
|---|---|
|VPS (2GB RAM, 1 vCPU)|$6-12|
|Domain (humanity.llc)|$1.25|
|SSL (Let's Encrypt)|$0|
|Backups (20GB)|$0.50|
|**Total**|**$8-14/month**|

---

## 3. Database Schema (SQLite)

### 3.1 File Location

`/var/data/profiles.sqlite`

### 3.2 Table: `profiles`

sql

CREATE TABLE profiles (
    profile_id TEXT PRIMARY KEY,
    handle TEXT UNIQUE NOT NULL,
    manifesto_line TEXT NOT NULL,
    public_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    revoked INTEGER DEFAULT 0,
    revoked_at INTEGER,
    revocation_secret_hash TEXT
);
CREATE INDEX idx_profiles_handle ON profiles(handle);
CREATE INDEX idx_profiles_revoked ON profiles(revoked);

### 3.3 Field Specifications

|Field|Type|Constraints|Description|
|---|---|---|---|
|`profile_id`|TEXT|20 chars, base58|Unique identifier, matches QR payload|
|`handle`|TEXT|3-32 chars, `[a-z0-9_]`|User-chosen public identifier|
|`manifesto_line`|TEXT|1-280 chars|Public statement|
|`public_key`|TEXT|Base58 encoded|Ed25519 public key (44 chars)|
|`created_at`|INTEGER|Unix timestamp|Creation time|
|`updated_at`|INTEGER|Unix timestamp|Last update time|
|`revoked`|INTEGER|0 or 1|1 = revoked|
|`revoked_at`|INTEGER|Unix timestamp, nullable|When revoked|
|`revocation_secret_hash`|TEXT|SHA256 hex, nullable|Hash of revocation secret|

### 3.4 Revocation Secret (MVP Simplicity)

For MVP, revocation uses a simple secret instead of Ed25519 signatures:

1. On profile creation, generate a 128-bit random secret
    
2. Store `SHA256(secret)` in `revocation_secret_hash`
    
3. Provide secret to user as downloadable `.txt` file
    
4. To revoke, user submits secret via simple form
    

**Note:** Full Ed25519-based revocation will replace this in v1.0.

---

## 4. API Endpoints (MVP)

### 4.1 Base URL

text

https://resolver.humanity.llc/.well-known/hc/v0.5/

### 4.2 Create Profile

**Endpoint:** `POST /profiles`

**Request:**

json

{
  "handle": "anarcho_socialist",
  "manifesto_line": "Another world is possible. Let's build it.",
  "public_key": "4qYrWdJfQKxJFdZxY5vZqY7xJvYkL8mNpQrStUvWxYz"
}

**Validation Rules:**

- `handle`: 3-32 chars, `[a-z0-9_]`, must start with letter, not reserved
    
- `manifesto_line`: 1-280 chars, plain text only
    
- `public_key`: valid Ed25519 base58, 44 chars
    

**Response (201 Created):**

json

{
  "success": true,
  "profile_id": "a1b2c3d4e5f6g7h8i9j0",
  "handle": "anarcho_socialist",
  "manifesto_line": "Another world is possible. Let's build it.",
  "qr_code_url": "https://resolver.humanity.llc/.well-known/hc/v0.5/qr/a1b2c3d4e5f6g7h8i9j0.png",
  "profile_url": "https://resolver.humanity.llc/.well-known/hc/v0.5/profile/a1b2c3d4e5f6g7h8i9j0",
  "revocation_secret": "x7k9m2n4p6q8r2t4v6w8y2",
  "created_at": 1715721600
}

**Error Responses:**

|Code|Condition|
|---|---|
|400|Invalid handle, manifesto_line, or public_key|
|409|Handle already taken|
|500|Database error|

### 4.3 Resolve Profile (JSON)

**Endpoint:** `GET /profile/{profile_id}`

**Response (200 OK):**

json

{
  "version": "0.5",
  "profile_id": "a1b2c3d4e5f6g7h8i9j0",
  "handle": "anarcho_socialist",
  "manifesto_line": "Another world is possible. Let's build it.",
  "badge": {
    "type": "early_builder",
    "label": "Early Builder"
  },
  "created_at": 1715721600,
  "revoked": false,
  "constitution_link": "https://humanity.llc/constitution",
  "governance_link": "https://humanity.llc/governance"
}

**Response (404 Not Found):**

json

{
  "error": "not_found",
  "message": "Profile not found"
}

**Response (410 Gone):**

json

{
  "error": "revoked",
  "message": "This profile has been revoked"
}

### 4.4 Resolve Profile (HTML)

**Endpoint:** `GET /profile/{profile_id}` with `Accept: text/html` or no `Accept`header

Returns human-readable HTML page (see Section 7 for template).

### 4.5 Generate QR Code PNG

**Endpoint:** `GET /qr/{profile_id}.png`

**Query Parameters (optional):**

|Parameter|Default|Max|Description|
|---|---|---|---|
|`size`|300|1000|Pixel dimensions (square)|
|`margin`|4|10|Quiet zone modules|

**Response:** `image/png` binary

**QR Payload:**

text

hc://resolve/{profile_id}

**Example:** `hc://resolve/a1b2c3d4e5f6g7h8i9j0`

### 4.6 Revoke Profile (Simple MVP Method)

**Endpoint:** `POST /revoke`

**Request:**

json

{
  "profile_id": "a1b2c3d4e5f6g7h8i9j0",
  "revocation_secret": "x7k9m2n4p6q8r2t4v6w8y2"
}

**Response (200 OK):**

json

{
  "success": true,
  "message": "Profile revoked. QR codes will return 410 Gone within 1 hour."
}

**Error Responses:**

|Code|Condition|
|---|---|
|400|Missing profile_id or secret|
|401|Invalid revocation secret|
|404|Profile not found|
|410|Profile already revoked|

### 4.7 Health Check

**Endpoint:** `GET /health`

**Response (200 OK):**

json

{
  "status": "ok",
  "version": "0.5",
  "uptime": 3600,
  "database": "connected"
}

---

## 5. Frontend Implementation

### 5.1 File Structure

text

frontend/
├── index.html              # Landing page
├── create.html             # Profile creation form
├── profile.html            # Template for profile display
├── revoke.html             # Revocation form
├── style.css               # Styling
├── app.js                  # Client-side logic
├── sw.js                   # Service worker
└── assets/
    └── logo.svg            # Optional branding

### 5.2 Profile Creation Page (`create.html`)

**Required Elements:**

html

<form id="create-form">
  <div>
    <label for="handle">Handle (public identifier)</label>
    <input type="text" id="handle" required pattern="[a-z][a-z0-9_]{2,31}" />
    <small>3-32 characters, lowercase letters, numbers, underscore. Must start with a letter.</small>
  </div>
  <div>
    <label for="manifesto">Manifesto line (public statement)</label>
    <textarea id="manifesto" maxlength="280" rows="3"></textarea>
    <small><span id="char-count">0</span>/280 characters</small>
  </div>
  <div id="keypair-status" class="hidden">
    <p>✓ Keypair generated locally. Your private key never leaves this device.</p>
  </div>
  <button type="submit">Create Profile</button>
</form>
<div id="result" class="hidden">
  <h3>Your profile is live!</h3>
  <img id="qr-img" />
  <a id="qr-download" download="qr-code.png">Download QR Code</a>
  <div id="revocation-secret" class="warning">
    <p><strong>Save this secret. It cannot be recovered.</strong></p>
    <code id="secret-value"></code>
    <button id="copy-secret">Copy</button>
    <button id="download-secret">Download as .txt</button>
  </div>
  <p>Profile URL: <a id="profile-url" target="_blank"></a></p>
</div>

**Client-Side Flow:**

1. Generate Ed25519 keypair using `libsodium.js`
    
2. Validate handle and manifesto
    
3. Submit to `POST /profiles`
    
4. Display QR code, profile URL, and revocation secret
    
5. Store private key in `localStorage` (with warning)
    

### 5.3 Profile Display Template (`profile.html`)

**Minimum HTML Structure:**

html

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profile: {{handle}} - Humanity Commons</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="manifest" href="/manifest.json">
</head>
<body>
  <main>
    <div class="profile-header">
      <h1>@{{handle}}</h1>
      <span class="badge {{badge_type}}">{{badge_label}}</span>
    </div>
    <div class="manifesto">
      <p>{{manifesto_line}}</p>
    </div>
    <div class="metadata">
      <p>Member since: {{created_at_formatted}}</p>
      {{#if revoked}}
        <p class="revoked-notice">⛔ This profile has been revoked</p>
      {{/if}}
    </div>
  </main>
  <footer>
    <p>This profile is part of the Humanity Commons. Profile data is hosted by independent resolvers. No data is sold.</p>
    <nav>
      <a href="{{constitution_link}}">Constitution</a> |
      <a href="{{governance_link}}">Governance</a>
    </nav>
  </footer>
  <script src="/app.js"></script>
  <script>
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  </script>
</body>
</html>

### 5.4 Service Worker (`sw.js`)

**Caching Strategy:**

javascript

const CACHE_NAME = 'humanity-commons-v1';
const STATIC_CACHE = 'static-v1';
const PROFILES_CACHE = 'profiles-v1';
// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/create.html',
  '/style.css',
  '/app.js',
  '/offline.html'
];
// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});
// Fetch: network first for profiles, cache first for static
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Profile requests: network first, fallback to cache
  if (url.pathname.includes('/profile/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(PROFILES_CACHE).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  // Static assets: cache first
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

---

## 6. Keypair Generation (Client-Side)

### 6.1 Using libsodium.js

javascript

// Load sodium
await sodium.ready;
// Generate keypair
const keypair = sodium.crypto_sign_keypair();
// Convert to base58
const publicKey = sodium.to_base58(keypair.publicKey);
const privateKey = sodium.to_base58(keypair.privateKey);
// Store private key (with user warning)
localStorage.setItem('hc_private_key', privateKey);
sessionStorage.setItem('hc_public_key', publicKey);
// Sign a message (for future use)
const message = new TextEncoder().encode('Hello');
const signature = sodium.crypto_sign_detached(message, keypair.privateKey);

### 6.2 User Warning for Private Key Storage

When storing private key in `localStorage`, display:

> **Warning:** Your private key is stored only in this browser. If you clear your cache, lose your device, or switch browsers, you will lose the ability to revoke this profile. Download your revocation secret (below) as a backup. A full key backup system is coming in a future version.

---

## 7. Offline Support

### 7.1 Requirements

The system MUST:

1. Work offline after first profile view (cached)
    
2. Display "Offline mode — data from [date]" banner when offline
    
3. Attempt to refresh when connectivity returns
    

### 7.2 Offline Banner HTML

html

<div id="offline-banner" class="offline hidden">
  ⚡ Offline mode — viewing cached profile from {{cache_date}}
</div>
<script>
  window.addEventListener('load', () => {
    if (!navigator.onLine) {
      document.getElementById('offline-banner').classList.remove('hidden');
    }
    window.addEventListener('online', () => location.reload());
  });
</script>

---

## 8. Error Handling

### 8.1 User-Facing Error Messages

|Error|User message|
|---|---|
|Handle already taken|"This handle is already in use. Please choose another."|
|Invalid handle format|"Handle must be 3-32 characters: lowercase letters, numbers, underscore. Must start with a letter."|
|Manifesto too long|"Manifesto line cannot exceed 280 characters."|
|Network error|"Unable to reach the resolver. Please check your internet connection."|
|Revocation failed|"Revocation failed. Check your secret and try again."|
|Profile not found|"No profile exists with this ID. The QR code may be invalid or revoked."|

### 8.2 Server Error Logging

Log to file with timestamp, method, path, status code, and IP (anonymized: last octet zeroed).

**Log format:**

text

2026-05-14T10:30:00Z POST /profiles 201 203.0.113.0
2026-05-14T10:31:00Z GET /profile/unknown 404 203.0.113.0

---

## 9. Security Requirements (MVP)

|Requirement|Implementation|
|---|---|
|HTTPS only|Nginx + Let's Encrypt, HTTP redirects to HTTPS|
|HSTS|`Strict-Transport-Security: max-age=31536000`|
|Input validation|Server-side validation of handle, manifesto, public_key|
|SQL injection prevention|Parameterized queries (never string concatenation)|
|Rate limiting|100 requests per IP per 60 seconds (express-rate-limit)|
|Revocation secret storage|Store SHA256 hash, not plaintext|
|No phone/email collection|No registration fields beyond handle + manifesto|

---

## 10. Testing Requirements

### 10.1 Manual Test Suite (MVP)

|Test|Action|Expected|
|---|---|---|
|T-01|Create profile with valid handle|Returns 201, profile_id, QR URL|
|T-02|Create profile with duplicate handle|Returns 409 Conflict|
|T-03|Create profile with invalid handle (uppercase)|Returns 400|
|T-04|Resolve existing profile (JSON)|Returns 200 with profile data|
|T-05|Resolve non-existent profile|Returns 404|
|T-06|Resolve revoked profile|Returns 410|
|T-07|Scan QR code with phone camera|Opens profile page in browser|
|T-08|Load profile page, then go offline|Shows cached version + offline banner|
|T-09|Revoke profile with correct secret|Returns 200, subsequent resolves return 410|
|T-10|Revoke profile with wrong secret|Returns 401|
|T-11|Rate limit (101 requests in 60s)|101st request returns 429|
|T-12|Download QR PNG|File valid, scans correctly|

### 10.2 Automated Test Suggestions

bash

# Create profile
curl -X POST https://resolver.humanity.llc/.well-known/hc/v0.5/profiles \
  -H "Content-Type: application/json" \
  -d '{"handle":"testuser","manifesto_line":"Testing","public_key":"..."}'
# Resolve profile
curl https://resolver.humanity.llc/.well-known/hc/v0.5/profile/a1b2c3d4e5f6g7h8i9j0
# Download QR
curl -o test.png https://resolver.humanity.llc/.well-known/hc/v0.5/qr/a1b2c3d4e5f6g7h8i9j0.png

---

## 11. Deployment Guide

### 11.1 Server Setup (Ubuntu 22.04)

bash

# Update system
sudo apt update && sudo apt upgrade -y
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
# Clone repository
git clone https://github.com/humanity-commons/resolver.git /opt/resolver
cd /opt/resolver
# Install dependencies
npm install
# Setup SQLite
mkdir -p /var/data
sqlite3 /var/data/profiles.sqlite < schema.sql
# Configure Nginx
sudo cp nginx/humanity.llc.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/humanity.llc.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
# Setup SSL
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d resolver.humanity.llc
# Setup systemd service
sudo cp systemd/humanity-resolver.service /etc/systemd/system/
sudo systemctl enable humanity-resolver
sudo systemctl start humanity-resolver

### 11.2 Environment Variables

Create `.env` file:

env

PORT=3000
DATABASE_PATH=/var/data/profiles.sqlite
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info

### 11.3 Systemd Service File

`/etc/systemd/system/humanity-resolver.service`:

ini

[Unit]
Description=Humanity Commons Resolver
After=network.target
[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/resolver
EnvironmentFile=/opt/resolver/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
[Install]
WantedBy=multi-user.target

---

## 12. Development Roadmap (2 Weeks)

### Week 1: Backend

|Day|Task|Output|
|---|---|---|
|1|Setup VPS, install Node.js, configure Nginx|Working server with health endpoint|
|2|Create SQLite schema, implement POST /profiles|Can create profiles|
|3|Implement GET /profile/:id (JSON + HTML)|Can resolve profiles|
|4|Implement GET /qr/:id.png|Can generate QR codes|
|5|Implement POST /revoke (simple secret)|Can revoke profiles|

### Week 2: Frontend

|Day|Task|Output|
|---|---|---|
|6|Build create.html + keypair generation|Users can create profiles via UI|
|7|Build profile.html template|Human-readable profile pages|
|8|Implement service worker + offline caching|Offline profile viewing|
|9|End-to-end testing + UI polish|Smooth user experience|
|10|Deploy to production, print test QR|SHIPPED|

---

## 13. Definition of Done (MVP)

- All API endpoints implemented and tested
    
- SQLite database with indexes
    
- Rate limiting (100/min)
    
- Input validation on all user inputs
    
- HTTPS configured (Let's Encrypt)
    
- Service worker caches static assets and profiles
    
- Offline profile view works after first load
    
- User can create profile without phone/email
    
- QR code scans correctly with iOS/Android camera apps
    
- Revocation works (profile returns 410)
    
- Deployment script documented
    
- README.md with local dev setup
    
- At least one real user (you) has printed and scanned their own QR
    

---

## 14. Risks and Mitigations (MVP)

|Risk|Probability|Impact|Mitigation|
|---|---|---|---|
|Single resolver goes down|Low (MVP user count)|High|Acceptable for MVP. v1.0 adds redundancy.|
|Revocation secret loss|Medium|Medium|Clear warning on creation. No recovery in MVP.|
|SQLite corruption|Low|Medium|Daily backups.|
|QR printed too small|Medium|Low|Provide size recommendations, high-DPI option.|
|Rate limiting too aggressive|Low|Low|Configurable, monitor logs.|
|Private key in localStorage lost|Medium|Low|User warned. Revocation secret is backup path.|

---

## 15. Success Metrics (MVP)

|Metric|Target|
|---|---|
|Profile creation completion rate|> 80% of visitors who start|
|QR resolution success rate|> 99% (excluding revoked)|
|Median resolution time|< 200ms|
|Offline cache hit rate (after first visit)|> 60%|
|User-reported critical bugs|0|
|User-reported minor bugs|< 10|

---

## 16. Next Steps After MVP

|Version|Focus|Timeline|
|---|---|---|
|v0.6|Multi-resolver (3 servers), epoch signatures|Week 3-4|
|v0.7|Profile analytics opt-in, expanded badges|Week 5-6|
|v0.8|Semi-public layer (opt-in contact info)|Week 7-8|
|v1.0|Ed25519 revocation (replace simple secret), full Technical Standards compliance|Week 9-10|
|v1.5|Basic trust network (simple vouching)|Month 3|
|v2.0|Human verification (device-based)|Month 4+|

---

## 17. Appendices

### Appendix A: Reserved Handles

text

admin, administrator, host, resolver, system, test, example,
support, help, info, root, api, www, hc, hc://, humanity,
commons, profile, profiles, qr, resolve, revoked, suspended,
null, undefined, false, true, 0, 1

### Appendix B: Base58 Character Set

text

123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz

### Appendix C: Example Profile ID Generation (Node.js)

javascript

const crypto = require('crypto');
const base58 = require('base58-native');
function generateProfileId() {
  const bytes = crypto.randomBytes(15); // 15 bytes = 20 base58 chars approx
  return base58.encode(bytes).slice(0, 20);
}

### Appendix D: Example Handle Validation (Regex)

javascript

const HANDLE_REGEX = /^[a-z][a-z0-9_]{2,31}$/;
function isValidHandle(handle) {
  return HANDLE_REGEX.test(handle);
}

---

**This specification is ready for implementation.**