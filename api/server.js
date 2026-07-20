/**
 * CORVAN Waitlist API Server
 * OWASP Top 10 hardened — production ready
 *
 * Coverage:
 *  A01 Broken Access Control      — CORS allowlist, origin enforcement
 *  A02 Cryptographic Failures     — HTTPS enforced in prod, no secrets in logs
 *  A03 Injection                  — express-validator, xss-clean, mongo-sanitize, hpp
 *  A04 Insecure Design            — rate limiting per-route, duplicate prevention
 *  A05 Security Misconfiguration  — helmet full suite, CSP, no X-Powered-By
 *  A06 Vulnerable Components      — pinned deps, no unused packages
 *  A07 Auth Failures              — no auth surface exposed
 *  A08 Software/Data Integrity    — input schema validation on every endpoint
 *  A09 Logging/Monitoring         — structured logs, no PII in error responses
 *  A10 SSRF                       — no outbound user-controlled URLs
 */

'use strict';

require('dotenv').config();

const express        = require('express');
const helmet         = require('helmet');
const cors           = require('cors');
const rateLimit      = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const nodemailer     = require('nodemailer');
const { Resend }     = require('resend');
const mongoSanitize  = require('express-mongo-sanitize');
const xss            = require('xss');
const hpp            = require('hpp');
const validator      = require('validator');
const { v4: uuidv4 } = require('uuid');
const fs             = require('fs');
const path           = require('path');
const crypto         = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ── Allowed origins strict allowlist ─────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim().toLowerCase())
  : ['http://localhost:8080', 'http://127.0.0.1:8080', 'null'];

// ── Local JSON store ──────────────────────────────────────────────────────────
const DATA_FILE = path.join(__dirname, 'signups.json');
let inMemoryStore = null; // fallback when filesystem is read-only (Railway)

function loadSignups() {
  if (inMemoryStore) return inMemoryStore;
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    inMemoryStore = data;
    return data;
  } catch {
    inMemoryStore = { waitlist: [], community: [], contact: [] };
    return inMemoryStore;
  }
}

function saveSignups(data) {
  inMemoryStore = data; // always update in-memory first
  try {
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, DATA_FILE);
  } catch (e) {
    // Railway / read-only filesystem — in-memory store is the source of truth
    log('warn', 'disk_write_skipped', { reason: e.message });
  }
}

// ── Structured logger — never logs PII in production ─────────────────────────
function log(level, event, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    // redact email in prod logs
    ...( isProd
      ? { ...meta, email: meta.email ? '[redacted]' : undefined }
      : meta )
  };
  if (level === 'error') console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

// ── Email transport — Resend (primary) with Gmail fallback ───────────────────
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function createGmailTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
  });
}

async function sendMail(subject, html, to) {
  const recipient = to || process.env.GMAIL_USER;
  const from      = process.env.RESEND_FROM || `"CORVAN" <${process.env.GMAIL_USER}>`;

  // ── Primary: Resend ───────────────────────────────────────────────────────
  if (resend) {
    const { error } = await resend.emails.send({
      from,
      to:      [recipient],
      subject,
      html
    });
    if (error) {
      log('warn', 'resend_failed_falling_back', { error: error.message });
      // fall through to Gmail fallback below
    } else {
      log('info', 'email_sent_via_resend', { to: isProd ? '[redacted]' : recipient });
      return;
    }
  }

  // ── Fallback: Gmail / Nodemailer ──────────────────────────────────────────
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    log('warn', 'email_skipped', { reason: 'no_credentials' });
    return;
  }
  const transporter = createGmailTransporter();
  await transporter.sendMail({
    from: `"CORVAN" <${process.env.GMAIL_USER}>`,
    to:   recipient,
    subject,
    html
  });
  log('info', 'email_sent_via_gmail', { to: isProd ? '[redacted]' : recipient });
}

// ── Email templates ───────────────────────────────────────────────────────────
const BASE_STYLE = `font-family:'Georgia',serif;background:#0b0a09;color:#ece7da;max-width:560px;margin:0 auto;padding:48px 32px;`;

function tplWaitlist(email) {
  // escape for email HTML context
  const safeEmail = validator.escape(email);
  return `<div style="${BASE_STYLE}">
    <p style="font-family:monospace;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#b51e30;margin:0 0 32px">CORVAN — AN OLFACTORY COUNTERCULTURE</p>
    <h1 style="font-size:38px;line-height:1.05;font-weight:400;margin:0 0 24px;color:#ece7da;">You're in<br>before<br><em>everyone else.</em></h1>
    <p style="font-size:15px;line-height:1.7;color:#b8b0a1;margin:0 0 16px;">No spam. No noise. One email in mid-August — when the doors open.</p>
    <p style="font-size:15px;line-height:1.7;color:#b8b0a1;margin:0 0 40px;">You'll hear from us before anyone else gets a chance.</p>
    <div style="border-top:1px solid #2a2621;padding-top:28px;margin-top:28px;">
      <p style="font-family:monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#7d766a;margin:0 0 8px;">Launching</p>
      <p style="font-size:28px;font-weight:400;color:#ece7da;margin:0 0 28px;letter-spacing:4px;">MID AUGUST 2026</p>
      <a href="https://instagram.com/houseofcorvan" style="font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#b51e30;text-decoration:none;">@houseofcorvan ↗</a>
    </div>
    <p style="font-family:monospace;font-size:10px;letter-spacing:2px;color:#7d766a;margin:40px 0 0;text-transform:uppercase;">houseofcorvan.com — you're on the list as ${safeEmail}</p>
  </div>`;
}

function tplCommunity(name, memberNumber) {
  const safeName = validator.escape(name);
  const memberTag = '#' + ('0000' + memberNumber).slice(-4);
  return `<div style="${BASE_STYLE}">
    <p style="font-family:monospace;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#b51e30;margin:0 0 32px">CORVAN — AN OLFACTORY COUNTERCULTURE</p>
    <h1 style="font-size:38px;line-height:1.05;font-weight:400;margin:0 0 8px;color:#ece7da;">You're inducted,<br><em>${safeName}.</em></h1>
    <p style="font-family:monospace;font-size:32px;color:rgba(255,255,255,.8);margin:0 0 32px;letter-spacing:4px;">${memberTag}</p>
    <p style="font-size:15px;line-height:1.7;color:#b8b0a1;margin:0 0 16px;">Member of the counterculture. Drops, access, and everything underground — before anyone else.</p>
    <p style="font-size:15px;line-height:1.7;color:#b8b0a1;margin:0 0 40px;">Loud. Unapologetic. You.</p>
    <div style="border-top:1px solid #2a2621;padding-top:28px;margin-top:28px;">
      <p style="font-family:monospace;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#7d766a;margin:0 0 8px;">Launching</p>
      <p style="font-size:28px;font-weight:400;color:#ece7da;margin:0 0 28px;letter-spacing:4px;">MID AUGUST 2026</p>
      <a href="https://instagram.com/houseofcorvan" style="font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#b51e30;text-decoration:none;">@houseofcorvan ↗</a>
    </div>
    <p style="font-family:monospace;font-size:10px;letter-spacing:2px;color:#7d766a;margin:40px 0 0;text-transform:uppercase;">houseofcorvan.com — the counterculture starts here</p>
  </div>`;
}

// ── Onboarding email (Day 2 — sent ~24h after signup) ────────────────────────
function tplOnboarding(name, source) {
  const safeName = name ? validator.escape(name) : 'You';
  const isComm   = source === 'community';
  return `<div style="${BASE_STYLE}">

    <!-- header -->
    <p style="font-family:monospace;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#b51e30;margin:0 0 48px">
      CORVAN — AN OLFACTORY COUNTERCULTURE
    </p>

    <!-- headline -->
    <h1 style="font-size:clamp(28px,5vw,42px);line-height:1.08;font-weight:400;margin:0 0 32px;color:#ece7da;">
      ${isComm
        ? `${safeName},<br>you didn't just<br>join a waitlist.<br><em>You joined a movement.</em>`
        : `What is<br><em>CORVAN,</em><br>really?`
      }
    </h1>

    <!-- divider -->
    <div style="width:40px;height:1px;background:#b51e30;margin:0 0 32px;"></div>

    <!-- body -->
    <p style="font-size:15px;line-height:1.8;color:#b8b0a1;margin:0 0 20px;">
      CORVAN is not a perfume brand. Perfume brands play it safe — they whisper, they flatter, they fit in.
    </p>
    <p style="font-size:15px;line-height:1.8;color:#b8b0a1;margin:0 0 20px;">
      We don't do any of that.
    </p>
    <p style="font-size:15px;line-height:1.8;color:#ece7da;margin:0 0 20px;border-left:2px solid #b51e30;padding-left:20px;">
      CORVAN is built for the ones who walk in and own the room before they say a word. 
      Scent as attitude. Fragrance as identity. <strong>Loud where it counts.</strong>
    </p>
    <p style="font-size:15px;line-height:1.8;color:#b8b0a1;margin:0 0 20px;">
      In <strong style="color:#ece7da;">mid-August 2026</strong> we drop Collection I — four fragrances, 
      each built around a different kind of audacity. Names stay sealed until launch day.
    </p>
    <p style="font-size:15px;line-height:1.8;color:#b8b0a1;margin:0 0 40px;">
      You're getting first access. That's the deal we made when you signed up, and we keep our deals.
    </p>

    <!-- what to expect -->
    <div style="border:1px solid #2a2621;padding:28px 24px;margin:0 0 40px;">
      <p style="font-family:monospace;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#7d766a;margin:0 0 20px;">What happens next</p>
      <p style="font-size:14px;line-height:1.7;color:#b8b0a1;margin:0 0 12px;">
        <span style="color:#b51e30;">01 ·</span> You'll get one more email on launch day — in mid-August — with early access before the public.
      </p>
      <p style="font-size:14px;line-height:1.7;color:#b8b0a1;margin:0 0 12px;">
        <span style="color:#b51e30;">02 ·</span> Follow <a href="https://instagram.com/houseofcorvan" style="color:#ece7da;text-decoration:none;">@houseofcorvan</a> — we drop fragments there first. No announcements, no filler.
      </p>
      <p style="font-size:14px;line-height:1.7;color:#b8b0a1;margin:0;">
        <span style="color:#b51e30;">03 ·</span> That's it. No spam. No newsletters. Just the drop when it's time.
      </p>
    </div>

    <!-- cta -->
    <a href="https://houseofcorvan.com" 
       style="display:inline-block;font-family:monospace;font-size:12px;letter-spacing:3px;text-transform:uppercase;
              color:#0b0a09;background:#ece7da;padding:16px 32px;text-decoration:none;margin:0 0 40px;">
      Visit houseofcorvan.com ↗
    </a>

    <!-- footer -->
    <div style="border-top:1px solid #2a2621;padding-top:24px;margin-top:8px;">
      <a href="https://instagram.com/houseofcorvan" 
         style="font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#b51e30;text-decoration:none;margin-right:24px;">
        @houseofcorvan ↗
      </a>
      <a href="mailto:houseofcorvan@gmail.com" 
         style="font-family:monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7d766a;text-decoration:none;">
        Reply to this email
      </a>
    </div>

    <p style="font-family:monospace;font-size:10px;letter-spacing:2px;color:#3a3630;margin:28px 0 0;text-transform:uppercase;line-height:1.6;">
      CORVAN · houseofcorvan.com<br>
      You're receiving this because you signed up at houseofcorvan.com.<br>
      No more emails until launch day.
    </p>

  </div>`;
}

// ════════════════════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARE STACK
// ════════════════════════════════════════════════════════════════════════════

// A05 — Helmet: full HTTP security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'", "'unsafe-inline'"],
      imgSrc:         ["'self'", 'data:'],
      connectSrc:     ["'self'"],
      fontSrc:        ["'self'"],
      objectSrc:      ["'none'"],
      frameAncestors: ["'none'"],
      baseUri:        ["'self'"],
      formAction:     ["'self'"],
    }
  },
  crossOriginEmbedderPolicy: false,
  // force HTTPS in prod
  hsts: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false
}));

// Remove X-Powered-By (already done by helmet but explicit)
app.disable('x-powered-by');

// A01 — CORS strict allowlist
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // non-browser clients
    if (allowedOrigins.includes(origin.toLowerCase())) return callback(null, true);
    log('warn', 'cors_blocked', { origin });
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 600
}));

// Body size limit — A04
app.use(express.json({ limit: '5kb' }));
app.use(express.urlencoded({ extended: false, limit: '5kb' }));

// A03 — HPP: prevent HTTP parameter pollution
app.use(hpp());

// A03 — Strip MongoDB operators from input ($where, $gt etc.)
app.use(mongoSanitize({ replaceWith: '_' }));

// A03 — XSS sanitize all string fields in req.body
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  next();
});

// Request ID for tracing — every request gets a unique ID
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-Id', req.requestId);
  // A05 — additional security headers not covered by helmet defaults
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  log('info', 'request', { id: req.requestId, method: req.method, path: req.path });
  next();
});

// A04 — Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again later.' },
  skip: req => req.path === '/health',
  // use X-Forwarded-For safely behind Railway/Netlify proxy
  keyGenerator: req => req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip
});
app.use(globalLimiter);

// A04 — Strict form submission limiter
const formLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Submitting too quickly. Wait a few minutes.' },
  keyGenerator: req => req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip
});

// ── Validation rules (A03/A08) ────────────────────────────────────────────────
const vEmail = body('email')
  .trim()
  .isEmail().withMessage('Invalid email address')
  .normalizeEmail()
  .isLength({ max: 254 }).withMessage('Email too long');

const vName = body('name')
  .trim()
  .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters')
  .matches(/^[a-zA-Z0-9\s\-_'.]+$/).withMessage('Name contains invalid characters')
  .escape();

const vHandle = body('handle')
  .trim()
  .isLength({ min: 2, max: 50 }).withMessage('Handle must be 2–50 characters')
  .matches(/^[a-zA-Z0-9@_\-\.]+$/).withMessage('Invalid handle characters')
  .escape();

const vStatement = body('statement')
  .trim()
  .isLength({ min: 3, max: 500 }).withMessage('Statement must be 3–500 characters')
  .escape();

const vMessage = body('message')
  .trim()
  .isLength({ min: 10, max: 2000 }).withMessage('Message must be 10–2000 characters')
  .escape();

// helper — returns first validation error or null
function firstError(req) {
  const errors = validationResult(req);
  return errors.isEmpty() ? null : errors.array()[0].msg;
}

// ════════════════════════════════════════════════════════════════════════════
// ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════

// Health check — no sensitive data exposed
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

/**
 * POST /api/waitlist — { email }
 */
app.post('/api/waitlist', formLimiter, [vEmail], async (req, res) => {
  const err = firstError(req);
  if (err) return res.status(400).json({ error: err });

  const { email } = req.body;

  // extra: double-check with validator library (defence in depth)
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const entry = {
    id: uuidv4(),
    email,
    signupDate: new Date().toISOString(),
    source: 'waitlist',
    ip: crypto.createHash('sha256')
          .update(req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip)
          .digest('hex').slice(0, 16) // hashed IP — not raw PII
  };

  const data = loadSignups();
  const already = data.waitlist.find(e => e.email === email);
  if (!already) {
    data.waitlist.push(entry);
    saveSignups(data);
  }

  // fire user confirmation immediately, admin notification in parallel
  setImmediate(async () => {
    try {
      await Promise.all([
        // user confirmation — always send regardless of duplicate
        sendMail('You\'re on the list. — CORVAN', tplWaitlist(email), email),
        // admin notification
        sendMail(
          `🔔 Waitlist Signup`,
          `<p style="font-family:sans-serif"><strong>Email:</strong> ${validator.escape(email)}</p>
           <p style="font-family:sans-serif"><strong>Total:</strong> ${data.waitlist.length}</p>
           <p style="font-family:sans-serif"><strong>Time:</strong> ${entry.signupDate}</p>
           <p style="font-family:sans-serif"><strong>Duplicate:</strong> ${already ? 'yes' : 'no'}</p>`
        )
      ]);
      // onboarding email ~24h later — only for new signups
      if (!already) {
        const ONBOARDING_DELAY = parseInt(process.env.ONBOARDING_DELAY_MS) || 24 * 60 * 60 * 1000;
        setTimeout(async () => {
          try {
            await sendMail('What is CORVAN, really? — CORVAN', tplOnboarding(null, 'waitlist'), email);
            log('info', 'onboarding_sent', { source: 'waitlist' });
          } catch (e) {
            log('error', 'onboarding_failed', { error: e.message });
          }
        }, ONBOARDING_DELAY);
      }
    } catch (e) {
      log('error', 'email_failed', { event: 'waitlist', error: e.message });
    }
  });

  log('info', 'waitlist_signup', { total: data.waitlist.length });
  res.json({ success: true, message: 'You\'re on the list.' });
});

/**
 * POST /api/community — { name, handle, email, statement }
 */
app.post('/api/community', formLimiter, [vName, vHandle, vEmail, vStatement], async (req, res) => {
  const err = firstError(req);
  if (err) return res.status(400).json({ error: err });

  const { name, handle, email, statement } = req.body;

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const entry = {
    id: uuidv4(),
    name, handle, email, statement,
    signupDate: new Date().toISOString(),
    source: 'community',
    ip: crypto.createHash('sha256')
          .update(req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip)
          .digest('hex').slice(0, 16)
  };

  const data = loadSignups();
  data.community.push(entry);
  saveSignups(data);

  const memberNumber = 427 + data.community.length;

  setImmediate(async () => {
    try {
      await Promise.all([
        // user induction confirmation — priority
        sendMail('You\'re inducted. — CORVAN', tplCommunity(name, memberNumber), email),
        // admin notification
        sendMail(
          `🔥 New Community Member — @${handle}`,
          `<p style="font-family:sans-serif"><strong>Handle:</strong> @${validator.escape(handle)}</p>
           <p style="font-family:sans-serif"><strong>Statement:</strong> ${validator.escape(statement)}</p>
           <p style="font-family:sans-serif"><strong>Member #:</strong> ${memberNumber}</p>
           <p style="font-family:sans-serif"><strong>Total community:</strong> ${data.community.length}</p>`
        )
      ]);
      // onboarding email ~24h later
      const ONBOARDING_DELAY = parseInt(process.env.ONBOARDING_DELAY_MS) || 24 * 60 * 60 * 1000;
      setTimeout(async () => {
        try {
          await sendMail(`${validator.escape(name)}, you didn't just join a waitlist. — CORVAN`, tplOnboarding(name, 'community'), email);
          log('info', 'onboarding_sent', { source: 'community' });
        } catch (e) {
          log('error', 'onboarding_failed', { error: e.message });
        }
      }, ONBOARDING_DELAY);
    } catch (e) {
      log('error', 'email_failed', { event: 'community', error: e.message });
    }
  });

  log('info', 'community_signup', { member: memberNumber });
  res.json({ success: true, message: 'Welcome to the counterculture', memberNumber });
});

/**
 * POST /api/contact — { name, email, message }
 */
app.post('/api/contact', formLimiter, [vName, vEmail, vMessage], async (req, res) => {
  const err = firstError(req);
  if (err) return res.status(400).json({ error: err });

  const { name, email, message } = req.body;

  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const entry = {
    id: uuidv4(),
    name, email,
    message: message.substring(0, 2000),
    date: new Date().toISOString()
  };

  const data = loadSignups();
  data.contact.push(entry);
  saveSignups(data);

  setImmediate(async () => {
    try {
      await sendMail(
        `✉️ Contact Form`,
        `<p style="font-family:sans-serif"><strong>Name:</strong> ${validator.escape(name)}</p>
         <p style="font-family:sans-serif"><strong>Reply to:</strong> ${validator.escape(email)}</p>
         <p style="font-family:sans-serif"><strong>Message:</strong><br>${validator.escape(message).replace(/\n/g, '<br>')}</p>`
      );
    } catch (e) {
      log('error', 'email_failed', { event: 'contact', error: e.message });
    }
  });

  log('info', 'contact_form');
  res.json({ success: true, message: 'Message received. We\'ll be in touch.' });
});

/**
 * POST /api/admin/send-onboarding
 * Manually blast onboarding email to all signups who haven't received it.
 * Protected by ADMIN_SECRET header.
 * Use this if server restarted before the 24h timer fired.
 */
app.post('/api/admin/send-onboarding', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const data = loadSignups();
  const results = { sent: 0, failed: 0 };

  for (const entry of data.waitlist) {
    if (entry.onboardingSent) continue;
    try {
      await sendMail('What is CORVAN, really? — CORVAN', tplOnboarding(null, 'waitlist'), entry.email);
      entry.onboardingSent = true;
      results.sent++;
    } catch { results.failed++; }
  }
  for (const entry of data.community) {
    if (entry.onboardingSent) continue;
    try {
      await sendMail(`${validator.escape(entry.name)}, you didn't just join a waitlist. — CORVAN`, tplOnboarding(entry.name, 'community'), entry.email);
      entry.onboardingSent = true;
      results.sent++;
    } catch { results.failed++; }
  }

  saveSignups(data);
  log('info', 'admin_onboarding_blast', results);
  res.json({ success: true, ...results });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler — A09: never leak stack traces ──────────────────────
app.use((err, req, res, next) => {
  log('error', 'unhandled_error', { message: err.message, id: req.requestId });
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎨 CORVAN API — OWASP hardened`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Port: ${PORT}`);
  console.log(`🌍 Env:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`📧 Gmail: ${process.env.GMAIL_USER ? 'configured' : '⚠️  NOT SET'}`);
  console.log(`🔐 CORS: ${allowedOrigins.join(', ')}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
