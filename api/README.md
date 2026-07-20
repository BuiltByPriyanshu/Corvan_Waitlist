# CORVAN API Server

Secure backend API for collecting waitlist signups and community member data.

## 🔐 Security Features

- **Rate Limiting**: Prevents spam/abuse (5 submissions per 15 minutes per IP)
- **Input Validation**: All data is validated and sanitized before processing
- **CORS Protection**: Only your domain can make requests
- **Helmet Security Headers**: XSS protection, clickjacking prevention, etc.
- **API Key Protection**: Loops API key never exposed to the browser
- **Request Size Limits**: Prevents memory exhaustion attacks
- **Error Handling**: Internal errors never leaked to clients

## 📦 Installation

### Step 1: Install dependencies

```bash
cd api
npm install
```

### Step 2: Configure environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your Loops API key (get it from [loops.so/settings](https://loops.so/settings)):

```env
LOOPS_API_KEY=your_actual_loops_api_key_here
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=http://localhost:8080,https://corvan.com,https://www.corvan.com
```

**⚠️ NEVER commit the `.env` file to git!** It's already in `.gitignore`.

### Step 3: Start the server

**Development mode** (auto-restarts on file changes):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on `http://localhost:3000`.

## 🧪 Testing

Test the health endpoint:
```bash
curl http://localhost:3000/health
```

Test the waitlist endpoint:
```bash
curl -X POST http://localhost:3000/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## 📡 API Endpoints

### `GET /health`
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-08T12:00:00.000Z",
  "environment": "production"
}
```

---

### `POST /api/waitlist`
Quick email signup (just email).

**Request body:**
```json
{
  "email": "user@example.com"
}
```

**Success response (200):**
```json
{
  "success": true,
  "message": "Successfully added to waitlist"
}
```

**Error response (400):**
```json
{
  "error": "Invalid input",
  "details": "Invalid email address"
}
```

**Rate limit response (429):**
```json
{
  "error": "You're submitting too quickly. Please wait a few minutes and try again.",
  "retryAfter": "15 minutes"
}
```

---

### `POST /api/community`
Full community signup (name, handle, email, statement).

**Request body:**
```json
{
  "name": "Jane Doe",
  "handle": "@janedoe",
  "email": "jane@example.com",
  "statement": "I'm here for the counterculture."
}
```

**Success response (200):**
```json
{
  "success": true,
  "message": "Welcome to the counterculture",
  "memberNumber": 428
}
```

---

### `POST /api/contact`
Contact form submission.

**Request body:**
```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "message": "I'd like to partner with CORVAN on our launch."
}
```

**Success response (200):**
```json
{
  "success": true,
  "message": "Message received. We'll be in touch."
}
```

## 🚀 Deployment

### Option A: Deploy to Vercel (Easiest, Free)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   cd api
   vercel
   ```

3. Add environment variables in Vercel dashboard:
   - `LOOPS_API_KEY`
   - `ALLOWED_ORIGINS` (your production domain)

4. Update frontend to use your Vercel URL: `https://your-api.vercel.app`

---

### Option B: Deploy to Railway (Easy, Free tier)

1. Go to [railway.app](https://railway.app)
2. Create new project → Deploy from GitHub
3. Select the `api` folder
4. Add environment variables in Railway dashboard
5. Railway gives you a URL like `https://corvan-api.up.railway.app`

---

### Option C: Deploy to your own server (VPS/Droplet)

1. SSH into your server
2. Install Node.js 18+
3. Copy the `api` folder to your server
4. Install dependencies: `npm install --production`
5. Use PM2 to keep it running:
   ```bash
   npm install -g pm2
   pm2 start server.js --name corvan-api
   pm2 startup
   pm2 save
   ```
6. Set up Nginx as a reverse proxy (optional but recommended)

## 🔍 Monitoring

View server logs:
```bash
# Development
npm run dev

# Production (if using PM2)
pm2 logs corvan-api
```

## 🛡️ Security Checklist

Before deploying to production:

- [ ] `.env` file is NOT committed to git
- [ ] `LOOPS_API_KEY` is set in production environment
- [ ] `ALLOWED_ORIGINS` includes only your actual domain(s)
- [ ] `NODE_ENV` is set to `production`
- [ ] Server is running behind HTTPS (not HTTP)
- [ ] Rate limits are configured appropriately for your traffic

## 📊 What data gets sent to Loops?

| Form | Data sent to Loops |
|------|-------------------|
| Quick waitlist | email, source="waitlist", signupDate |
| Community signup | email, name, source="community", socialHandle, statement, signupDate |
| Contact form | email, name, source="contact", message (truncated to 500 chars), contactDate |

All data is stored in your Loops dashboard and you can export it anytime.

## 🐛 Troubleshooting

**"LOOPS_API_KEY not configured"**
- Make sure `.env` file exists and has `LOOPS_API_KEY=...`

**"Not allowed by CORS"**
- Add your frontend domain to `ALLOWED_ORIGINS` in `.env`

**"Too many requests"**
- This is the rate limiter working. Wait 15 minutes or adjust limits in `.env`

**Loops API returns error**
- Check your API key is correct
- Verify email format is valid
- Check Loops dashboard for error details

## 📝 License

MIT - Built for CORVAN by the Corvan Crew
