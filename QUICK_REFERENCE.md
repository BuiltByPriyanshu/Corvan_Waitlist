# ⚡ Quick Reference Card

One-page cheat sheet for managing your CORVAN backend.

---

## 🚀 Starting the Server

```bash
cd /Users/priyanshusingh/Documents/Corvan_waitlist/api
npm start
```

Server will run on `http://localhost:3000`

---

## 🧪 Testing

```bash
# Test all endpoints at once
./test.sh

# Test individual endpoints
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/waitlist -H "Content-Type: application/json" -d '{"email":"test@example.com"}'
```

---

## 🔑 Environment Variables

Edit `api/.env`:

```bash
LOOPS_API_KEY=loop_...          # Your Loops API key
PORT=3000                        # Server port
ALLOWED_ORIGINS=http://...      # Comma-separated domains
RATE_LIMIT_MAX_REQUESTS=5       # Max submissions per window
RATE_LIMIT_WINDOW_MS=900000     # 15 minutes in milliseconds
```

---

## 📡 Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/waitlist` | POST | Quick email signup |
| `/api/community` | POST | Full community signup |
| `/api/contact` | POST | Contact form |

---

## 📊 View Data

Go to [loops.so](https://loops.so) → Contacts

---

## 🛑 Stopping the Server

-09876543
Press `Ctrl+C` in the Terminal where it's running

---

## 📝 Logs

Logs appear in the Terminal where server is running. Each request shows:
- Timestamp
- HTTP method
- Path
- IP address
- Success/error details

---

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| Port in use | Change `PORT=3001` in `.env` |
| CORS error | Add your domain to `ALLOWED_ORIGINS` |
| Rate limited | Wait 15 minutes or increase `RATE_LIMIT_MAX_REQUESTS` |
| Loops error | Check API key in `.env` |

---

## 🚀 Deploy Commands

### Vercel
```bash
cd api
vercel
```

### Railway
Connect GitHub repo → Deploy

---

## 🔐 Security Checklist

Before going live:

- [ ] Real Loops API key in production `.env`
- [ ] `ALLOWED_ORIGINS` has your real domain
- [ ] `NODE_ENV=production` 
- [ ] HTTPS enabled (not HTTP)
- [ ] `.env` NOT committed to git

---

## 📞 Loops API Key

Get it from: [loops.so/settings](https://loops.so/settings)

Format: `loop_abc123...`

---

## 💡 Tips

- Keep Terminal window open while testing locally
- Use `npm run dev` for auto-restart on code changes
- Check Loops dashboard to verify data is arriving
- Test rate limiting with the `test.sh` script
- Monitor server logs to catch issues early

---

**Quick ref for CORVAN** ✦
