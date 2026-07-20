# 🎨 CORVAN Backend Setup Guide

Complete step-by-step guide to get your secure waitlist backend running.

---

## 📋 What You Just Built

A production-ready Node.js API server that:

✅ **Collects form data securely** (never exposes API keys to the browser)  
✅ **Prevents spam** with rate limiting (5 submissions per 15 minutes per IP)  
✅ **Validates all input** (emails, names, handles, messages)  
✅ **Blocks malicious requests** (XSS, CSRF, injection attacks)  
✅ **Only allows your domain** to make requests (CORS protection)  
✅ **Integrates with Loops** to store contacts and send emails  

---

## 🚀 Quick Start (5 Steps)

### Step 1: Get your Loops API key

1. Go to [loops.so](https://loops.so) and sign up (free for 1,000 contacts)
2. Go to Settings → API Keys
3. Copy your API key (starts with `loop_`)

---

### Step 2: Configure the backend

Open the file `api/.env` and replace `your_loops_api_key_here` with your actual key:

```bash
LOOPS_API_KEY=loop_abc123xyz...
```

Save the file.

---

### Step 3: Start the backend server

Open Terminal, navigate to the `api` folder, and start the server:

```bash
cd /Users/priyanshusingh/Documents/Corvan_waitlist/api
npm start
```

You should see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 CORVAN API Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Server running on port 3000
🌍 Environment: development
🔐 CORS allowed origins: http://localhost:8080, http://127.0.0.1:8080
⚡ Rate limit: 5 requests per 15 minutes
```

**Keep this Terminal window open** — the server needs to stay running.

---

### Step 4: Test the server

Open a **new** Terminal window and run:

```bash
cd /Users/priyanshusingh/Documents/Corvan_waitlist/api
./test.sh
```

This will test all endpoints. You should see successful responses like:

```json
{
   "success" : true,
   "message" : "Successfully added to waitlist"
}
```

If you see errors, check that:
- Your Loops API key is correct in `.env`
- The server is still running in the other Terminal window

---

### Step 5: Update the frontend to use the backend

Now we need to modify `corvan.js` to send data to your backend instead of faking it.

I'll do this next — just confirm the server is running and tests passed first.

---

## 🧪 Manual Testing

While the server is running, you can test each endpoint manually:

### Test the health check:
```bash
curl http://localhost:3000/health
```

### Test waitlist signup:
```bash
curl -X POST http://localhost:3000/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Test community signup:
```bash
curl -X POST http://localhost:3000/api/community \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "handle": "@test",
    "email": "test@example.com",
    "statement": "I stand for quality."
  }'
```

---

## 📊 Where is the data stored?

All data goes to your **Loops dashboard**:

1. Go to [loops.so](https://loops.so) and log in
2. Click **Contacts** in the sidebar
3. You'll see all signups with their info

Each contact has:
- **Email** (searchable)
- **Name** (if provided)
- **Source tag** (waitlist, community, or contact)
- **Custom properties** (handle, statement, message)
- **Signup date**

---

## 🔐 Security Explained

### 1. **Rate Limiting**
**What it does:** Prevents someone from submitting the form 1000 times in a minute.  
**How it works:** Tracks IP addresses and blocks after 5 requests in 15 minutes.  
**Why:** Stops spam bots and abuse.

### 2. **Input Validation**
**What it does:** Checks that emails are actually emails, names don't contain code, etc.  
**How it works:** Uses `express-validator` to sanitize every field before processing.  
**Why:** Prevents injection attacks (XSS, SQL injection, etc.).

### 3. **CORS Protection**
**What it does:** Only allows requests from your domain (not random websites).  
**How it works:** Browser checks `Origin` header; server rejects if not in allowed list.  
**Why:** Prevents other sites from stealing your API.

### 4. **API Key Protection**
**What it does:** Keeps your Loops API key secret (never sent to the browser).  
**How it works:** Server makes the Loops API call; frontend never sees the key.  
**Why:** If the key was in JavaScript, anyone could use it to spam your account.

### 5. **Helmet Security Headers**
**What it does:** Sets HTTP headers that tell browsers to block certain attacks.  
**How it works:** Adds headers like `X-Frame-Options`, `X-Content-Type-Options`, etc.  
**Why:** Prevents clickjacking, MIME sniffing, XSS attacks.

### 6. **Request Size Limits**
**What it does:** Rejects requests larger than 10KB.  
**How it works:** Express middleware checks `Content-Length` header.  
**Why:** Prevents memory exhaustion attacks (someone sending 1GB of data).

---

## 🚀 Deploying to Production

Once everything works locally, you'll deploy the backend to a server so it's accessible online.

### Recommended: Deploy to Vercel (easiest, free)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy the API:
   ```bash
   cd api
   vercel
   ```

3. Follow the prompts (it will ask you to log in)

4. Vercel will give you a URL like: `https://corvan-api.vercel.app`

5. Add environment variables in Vercel dashboard:
   - Go to your project settings
   - Add `LOOPS_API_KEY` 
   - Add `ALLOWED_ORIGINS` with your actual domain

6. Update your frontend to use the Vercel URL instead of `localhost:3000`

---

## 🐛 Troubleshooting

### "EADDRINUSE: address already in use :::3000"
**Problem:** Port 3000 is already in use by another program.  
**Solution:** Either stop the other program, or change `PORT=3001` in `.env`.

### "LOOPS_API_KEY not configured"
**Problem:** The `.env` file is missing or the API key isn't set.  
**Solution:** Open `api/.env` and make sure `LOOPS_API_KEY=loop_...` is filled in.

### "Not allowed by CORS"
**Problem:** Your frontend is trying to connect from a domain not in `ALLOWED_ORIGINS`.  
**Solution:** Add your frontend URL to `ALLOWED_ORIGINS` in `.env` (comma-separated).

### "Too many requests from this IP"
**Problem:** You hit the rate limit (5 requests in 15 minutes).  
**Solution:** This is intentional! Wait 15 minutes or adjust `RATE_LIMIT_MAX_REQUESTS` in `.env`.

### Loops returns "Invalid API key"
**Problem:** Your API key is wrong or expired.  
**Solution:** Get a fresh key from [loops.so/settings](https://loops.so/settings).

---

## 📁 File Structure

```
Corvan_waitlist/
├── index.html              ← Your frontend
├── corvan.js               ← Will be updated to call the API
├── api/                    ← Your backend
│   ├── server.js          ← Main server code
│   ├── package.json       ← Dependencies list
│   ├── .env               ← Your secrets (NEVER commit this)
│   ├── .env.example       ← Template for .env
│   ├── .gitignore         ← Tells git to ignore .env
│   ├── README.md          ← API documentation
│   └── test.sh            ← Test script
```

---

## ✅ Next Steps

Once the server is running and tests pass:

1. ✅ Backend is secure and working
2. ⏭️ Update `corvan.js` to call your backend
3. ⏭️ Test the full flow (frontend → backend → Loops)
4. ⏭️ Deploy backend to Vercel/Railway
5. ⏭️ Update frontend with production API URL
6. ⏭️ Deploy frontend
7. ⏭️ Launch! 🚀

---

## 🆘 Need Help?

If you run into issues:

1. Check the server logs (the Terminal window where it's running)
2. Check the browser console (F12 → Console tab)
3. Test the endpoint manually with `curl` to isolate the problem
4. Make sure `.env` is configured correctly
5. Verify Loops API key is valid

The server logs every request, so you'll see exactly what's happening.

---

**Built for CORVAN by the Corvan Crew** ✦
