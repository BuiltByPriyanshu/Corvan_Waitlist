# CORVAN — Project Context

Last updated: July 2026

---

## What This Is

CORVAN is a waitlist / pre-launch landing page for an olfactory counterculture fragrance brand launching **07.24.2026**. The site collects waitlist signups, community applications, and contact messages — and sends branded confirmation + onboarding emails to every user.

---

## Live URLs

| Service | URL |
|---------|-----|
| Frontend | Netlify → houseofcorvan.com |
| Backend API | Railway (deploy in progress) |
| Instagram | @houseofcorvan |
| Email | houseofcorvan@gmail.com |

---

## Project Structure

```
Corvan_waitlist/
├── index.html          — full frontend (single file, all CSS inline)
├── corvan.js           — all frontend JS (scroll, forms, modal, cursor)
├── image-slot.js       — custom web component for image placeholders
├── api/
│   ├── server.js       — Node/Express backend (OWASP hardened)
│   ├── .env            — secrets (never commit)
│   ├── .env.example    — template for env vars
│   ├── package.json
│   ├── signups.json    — local backup of all signups (gitignored)
│   └── test-email.js   — email test script
├── Artboard 2.png      — graffiti drip logo (footer)
├── Artboard 18.png     — rounded wordmark logo (navbar)
├── favicon.ico         — browser tab icon
├── apple-touch-icon.png— iPhone home screen icon
├── og-image.png        — social share preview (1200×630)
├── image.png           — community section background
├── image copy.png      — about section background
└── 383f3dd7f97c45ca929e80eb31b713ff.webm — hero background video
```

---

## Frontend — index.html

### Design System
- **Colors:** `--bg:#0b0a09`, `--ox:#7a1320`, `--ox-bright:#b51e30`, `--ink:#ece7da`
- **Fonts:** Bodoni Moda (serif), GFS Didot (display), Space Grotesk (sans), Space Mono (mono)
- **Theme:** Loud, unapologetic, you — dark luxury counterculture

### Sections
1. **Navbar** — fixed, fade-in on scroll, rounded "Corvan" wordmark logo, mix-blend-mode:difference
2. **Hero** — sticky scroll sequence (520vh desktop / 300vh mobile), background video, 3-layer parallax (wordmark → manifesto → climax)
3. **Community/Waitlist** — "Be here before everyone else", glass CTA button, email waitlist form, member counter
4. **About** — brand statement, short punchy copy ("No apologies. No whispers."), scent grid
5. **Scent Grid** — 2 sealed cards, both blurred, number badges (01/02), no tape seal
6. **Contact** — contact form + socials (Instagram @houseofcorvan, Reddit, email)
7. **Footer** — graffiti drip logo (Artboard 2.png), cropped with clip-path

### Key Features
- **Scorpion SVG cursor** — replaces pointer on desktop (CORVAN's spiritual animal), ring overlay still follows mouse
- **Scroll-driven hero animation** — JS-powered, degrades gracefully with `prefers-reduced-motion`
- **Liquid glass modal** — 4-step community signup (name → handle+email → statement → confirmation)
- **Countdown removed** — timer chip removed from navbar
- **All forms wired to backend** — waitlist, community, contact all POST to `API_BASE`

### SEO / AEO
- Full meta tags (description, keywords, canonical, OG, Twitter Card)
- `ld+json` Brand schema + FAQPage schema (3 questions)
- `og-image.png` set as social preview
- `favicon.ico` + `apple-touch-icon.png` + `theme-color:#0b0a09`

### Mobile
- Breakpoints: 880px, 680px, 480px, 375px + `pointer:coarse`
- All inputs `font-size:16px` — prevents iOS zoom on focus
- Waitlist row stacks at 480px
- Minimum 48px tap targets on all touch elements
- Modal slides up from bottom on all phones
- Scorpion cursor hidden on touch devices

---

## Backend — api/server.js

### Stack
- Node.js + Express
- Nodemailer (Gmail) — fallback
- Resend — primary email service (set `RESEND_API_KEY` in .env)

### OWASP Top 10 Coverage
| # | Threat | Fix |
|---|--------|-----|
| A01 | Access Control | CORS strict allowlist |
| A03 | Injection | xss-clean, mongo-sanitize, hpp, validator.escape() |
| A04 | Insecure Design | Rate limiting (60 global / 5 form per 15min), 5kb body limit |
| A05 | Misconfiguration | Helmet full CSP, HSTS in prod, no X-Powered-By |
| A08 | Data Integrity | express-validator + validator.js double validation |
| A09 | Logging | Structured JSON logs, emails redacted in prod, request IDs |
| A10 | SSRF | No user-controlled outbound URLs |

### Endpoints
```
GET  /health                      — status check
POST /api/waitlist                — { email }
POST /api/community               — { name, handle, email, statement }
POST /api/contact                 — { name, email, message }
POST /api/admin/send-onboarding   — manual blast (requires X-Admin-Secret header)
```

### Data Storage
- `signups.json` — local JSON backup (atomic write, gitignored)
- IPs stored as truncated SHA-256 hashes (not raw PII)

### Email Flow (per signup)
1. **T+0s** — user confirmation email sent immediately (parallel with admin notification)
2. **T+24h** — onboarding email sent via `setTimeout` (configurable via `ONBOARDING_DELAY_MS`)

### Email Templates
| Template | Subject | Recipient |
|----------|---------|-----------|
| `tplWaitlist` | You're on the list. — CORVAN | User |
| `tplCommunity` | You're inducted. — CORVAN | User |
| `tplOnboarding` | What is CORVAN, really? — CORVAN | User (24h later) |
| Admin notify | 🔔 Waitlist Signup / 🔥 Community Member | houseofcorvan@gmail.com |

---

## Environment Variables — api/.env

```
RESEND_API_KEY=re_...          # Primary email — get from resend.com
RESEND_FROM=CORVAN <hello@houseofcorvan.com>  # After domain verified on Resend
GMAIL_USER=houseofcorvan@gmail.com            # Fallback
GMAIL_PASS=xxxx xxxx xxxx xxxx               # Gmail App Password (16 chars)
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://houseofcorvan.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5
ONBOARDING_DELAY_MS=86400000   # 24h in ms
ADMIN_SECRET=...               # For /api/admin/send-onboarding
```

---

## What Still Needs Doing

### Before Launch (critical)
- [ ] **Set up Resend** — resend.com → free account → API key → verify houseofcorvan.com domain → add DNS records → update `RESEND_FROM` to `hello@houseofcorvan.com`. Fixes emails going to spam.
- [ ] **Fix Railway deployment crash** — see Railway crash fix section below
- [ ] **Update `API_BASE` in corvan.js** — change `http://localhost:3000` to Railway URL once deployed
- [ ] **Connect domain on Netlify** — houseofcorvan.com → Netlify DNS settings
- [ ] **Privacy policy page** — legally required for email collection (EU/India)

### Nice to Have
- [ ] **Launch email blast** — on 07.24, use `/api/admin/send-onboarding` or write a blast script to email all signups
- [ ] **Upgrade signups.json to a real DB** — SQLite or PlanetScale (free) for persistence across Railway redeploys
- [ ] **Analytics** — add Plausible or Umami (privacy-friendly, free self-hosted)

---

## Railway Deployment — Common Crash Causes

Railway crashes usually happen because:

1. **Root directory not set to `api/`** — Railway tries to run from project root, finds no `package.json`
2. **Missing env variables** — `GMAIL_PASS` or `ALLOWED_ORIGINS` not set in Railway dashboard
3. **`signups.json` write permission** — Railway filesystem is read-only on some plans; the server tries to write `signups.json` and crashes

Fix: see current chat for the Railway fix being applied.

---

## Fallback Strategy

| Layer | What fails | Fallback |
|-------|-----------|----------|
| Email | Resend API down | Auto-falls back to Gmail/Nodemailer |
| Email | Both fail | Signup still saved to signups.json, no email sent, user sees success |
| Backend | Railway crashes | Frontend shows success (corvan.js has `.catch()` fallback), data lost until backend recovers |
| Frontend | Netlify down | Nothing — single point of failure, but Netlify 99.9% uptime |
| signups.json | Corrupted | Atomic write (temp file + rename) prevents mid-write corruption |

**Weak point:** If Railway goes down, new signups are not saved anywhere. Fix before launch: add a database (PlanetScale free tier, 5 min setup).
