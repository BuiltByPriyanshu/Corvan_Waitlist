# 🏗️ CORVAN Architecture

Visual explanation of how your waitlist system works.

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
│                                                                 │
│  ┌────────────┐    User fills form     ┌──────────────┐       │
│  │  index.html│ ────────────────────▶  │  corvan.js   │       │
│  └────────────┘                         └──────┬───────┘       │
│                                                 │               │
│                                                 │ POST          │
└─────────────────────────────────────────────────┼───────────────┘
                                                  │
                         INTERNET                 │
                                                  │
┌─────────────────────────────────────────────────┼───────────────┐
│                    YOUR BACKEND SERVER          ▼               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │              Node.js + Express                       │     │
│  │  ┌────────────────────────────────────────────┐     │     │
│  │  │  1. CORS Check                             │     │     │
│  │  │     ✓ Is request from allowed domain?     │     │     │
│  │  └────────────────────────────────────────────┘     │     │
│  │                      │                               │     │
│  │                      ▼                               │     │
│  │  ┌────────────────────────────────────────────┐     │     │
│  │  │  2. Rate Limiter                           │     │     │
│  │  │     ✓ Has this IP submitted < 5 times?    │     │     │
│  │  └────────────────────────────────────────────┘     │     │
│  │                      │                               │     │
│  │                      ▼                               │     │
│  │  ┌────────────────────────────────────────────┐     │     │
│  │  │  3. Input Validation                       │     │     │
│  │  │     ✓ Is email format valid?              │     │     │
│  │  │     ✓ Is name/handle clean?               │     │     │
│  │  │     ✓ No malicious code?                  │     │     │
│  │  └────────────────────────────────────────────┘     │     │
│  │                      │                               │     │
│  │                      ▼                               │     │
│  │  ┌────────────────────────────────────────────┐     │     │
│  │  │  4. Process & Forward to Loops             │     │     │
│  │  │     • Add source tags                      │     │     │
│  │  │     • Add timestamp                        │     │     │
│  │  │     • Send to Loops API                    │     │     │
│  │  └────────────────────────────────────────────┘     │     │
│  └──────────────────────────────┬───────────────────────┘     │
│                                  │                             │
│                                  │ POST with API key           │
└──────────────────────────────────┼─────────────────────────────┘
                                   │
                  INTERNET          │
                                   │
┌──────────────────────────────────┼─────────────────────────────┐
│                    LOOPS.SO      ▼                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────┐          │
│  │  Contact Database                                │          │
│  │  • Stores email, name, handle, etc.             │          │
│  │  • Tags contacts by source                      │          │
│  │  • Can send automated emails                    │          │
│  │  • Export anytime as CSV                        │          │
│  └─────────────────────────────────────────────────┘          │
│                                                                 │
│  ┌─────────────────────────────────────────────────┐          │
│  │  Your Dashboard                                  │          │
│  │  • View all contacts                            │          │
│  │  • Send launch email blast                      │          │
│  │  │  • Filter by tags                            │          │
│  └─────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Layers

### Layer 1: Browser (Client-Side)
```
┌─────────────────────────────────────┐
│  Basic validation                   │
│  • Email format check               │
│  • Required field check             │
│  • Character limits                 │
│  ⚠️ Can be bypassed by attackers!  │
└─────────────────────────────────────┘
```

### Layer 2: Your Backend (Server-Side) ← **This is where real security happens**
```
┌─────────────────────────────────────┐
│  CORS Protection                    │
│  • Only your domain allowed         │
│  • Rejects random websites          │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  Rate Limiting                      │
│  • Max 5 requests per 15 min        │
│  • Tracked by IP address            │
│  • Blocks spam bots                 │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  Input Sanitization                 │
│  • Removes HTML/JS code             │
│  • Validates email format           │
│  • Checks name/handle characters    │
│  • Truncates long messages          │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  API Key Protection                 │
│  • Loops API key NEVER exposed      │
│  • Server makes call on your behalf │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  Error Handling                     │
│  • Never reveals internal errors    │
│  • Logs everything server-side      │
│  • Generic client error messages    │
└─────────────────────────────────────┘
```

### Layer 3: Loops (Data Storage)
```
┌─────────────────────────────────────┐
│  Loops validates incoming data      │
│  • Checks API key                   │
│  • Validates email deliverability   │
│  • Prevents duplicate contacts      │
└─────────────────────────────────────┘
```

---

## 🎯 Attack Scenarios & How We Block Them

### Attack 1: Spam Bot Submits 10,000 Emails

**Without Protection:**
```
Bot → Your site → Loops database fills up → You hit contact limit
```

**With Protection:**
```
Bot → Rate limiter blocks after 5 requests → Bot gives up
                  ⛔
```

**Result:** Only 5 fake emails get through, then the IP is blocked for 15 minutes.

---

### Attack 2: Someone Steals Your Loops API Key

**Without Backend:**
```
Your API key is in corvan.js (visible to anyone)
   ↓
Attacker uses it to spam YOUR Loops account
   ↓
Your account gets filled with fake contacts
```

**With Backend:**
```
API key is in .env on the server (never sent to browser)
   ↓
Attacker can't see it in the source code
   ↓
Your API key stays secret ✓
```

---

### Attack 3: XSS Injection (Malicious JavaScript)

**Without Validation:**
```
Attacker submits:
  name: "<script>alert('hacked')</script>"
   ↓
Gets stored in your database as-is
   ↓
When you view the contact, script runs in YOUR browser
```

**With Validation:**
```
Attacker submits:
  name: "<script>alert('hacked')</script>"
   ↓
Input validator strips HTML tags
   ↓
Stored as: "scriptalert('hacked')script" (harmless text)
   ↓
Safe ✓
```

---

### Attack 4: CORS Bypass (Other Sites Using Your API)

**Without CORS:**
```
evil-site.com loads your form
   ↓
Submits fake data to your backend
   ↓
Your contact list fills with spam
```

**With CORS:**
```
evil-site.com tries to submit
   ↓
Browser checks Origin header: "evil-site.com"
   ↓
Your backend: "Not in ALLOWED_ORIGINS"
   ↓
Request blocked ⛔
```

---

## 📊 Data Journey: A Real Example

Let's trace what happens when someone joins the waitlist:

### 1. User fills out the form
```
User types: "jane@example.com"
```

### 2. Frontend validation (corvan.js)
```javascript
// Check: Is this a valid email format?
if (!emailRe.test(email)) {
  // Show error, don't submit
}
```

### 3. Submit to backend
```javascript
fetch('http://localhost:3000/api/waitlist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'jane@example.com' })
})
```

### 4. Backend receives request
```
Server checks:
  ✓ CORS: Is Origin header = "http://localhost:8080"? YES
  ✓ Rate limit: Has this IP sent < 5 requests? YES (this is #2)
  ✓ Input validation: Is "jane@example.com" valid? YES
```

### 5. Backend prepares data for Loops
```javascript
{
  email: "jane@example.com",
  source: "waitlist",
  userGroup: {
    signupSource: "waitlist",
    signupDate: "2026-06-08T12:34:56.789Z"
  }
}
```

### 6. Backend sends to Loops
```
POST https://app.loops.so/api/v1/contacts/create
Authorization: Bearer loop_abc123...  ← Your secret API key
Content-Type: application/json

Body: { email: "jane@example.com", ... }
```

### 7. Loops stores the contact
```
Loops database now has:
  • Email: jane@example.com
  • Tag: waitlist
  • Signup date: 2026-06-08T12:34:56.789Z
```

### 8. Backend responds to frontend
```json
{
  "success": true,
  "message": "Successfully added to waitlist"
}
```

### 9. Frontend shows success message
```javascript
// Hide form, show success state
form.style.display = 'none';
success.classList.add('show');
```

**Total time:** < 1 second  
**Data stored in:** Loops dashboard  
**Security checks passed:** 3 ✓

---

## 🔄 Environment-Specific Behavior

### Local Development
```
Frontend: http://localhost:8080
    ↓
Backend: http://localhost:3000
    ↓
Loops: https://app.loops.so/api/v1/...
```

### Production
```
Frontend: https://corvan.com
    ↓
Backend: https://corvan-api.vercel.app
    ↓
Loops: https://app.loops.so/api/v1/...
```

---

## 📦 Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | HTML + Vanilla JS | Lightweight, no build step needed |
| **Backend** | Node.js + Express | Fast, well-documented, huge ecosystem |
| **Security** | Helmet + CORS + Rate Limit | Industry-standard protection |
| **Validation** | express-validator | Catches 99% of malicious input |
| **Data Storage** | Loops | Purpose-built for email lists |
| **Hosting (backend)** | Vercel / Railway | Zero-config deployment |
| **Hosting (frontend)** | Any static host | Netlify, Vercel, GitHub Pages, etc. |

---

## ⚡ Performance

- **Average response time:** 50-150ms (depending on Loops API)
- **Max concurrent requests:** Depends on your hosting (Vercel: ~1000/sec)
- **Rate limit per IP:** 5 requests per 15 minutes
- **Max payload size:** 10KB (prevents memory attacks)
- **Database queries:** 0 (Loops handles storage)

---

## 🧪 Testing Matrix

| Test | What it checks | Expected result |
|------|---------------|-----------------|
| Health check | Server is running | `{ status: "ok" }` |
| Valid email | Normal flow works | Contact added to Loops |
| Invalid email | Validation works | `400 Bad Request` |
| Missing fields | Required field check | `400 Bad Request` |
| XSS attempt | Sanitization works | Tags stripped, safe text stored |
| Rate limit test | Spam protection | 6th request blocked with `429` |
| CORS test | Domain whitelist | Requests from evil-site.com blocked |
| Large payload | Size limit works | Request rejected |

---

**Architecture designed for CORVAN by the Corvan Crew** ✦
