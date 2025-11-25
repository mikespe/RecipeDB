# Environment Variables Reference

## 🔑 Required Variables (Must Have)

### 1. DATABASE_URL
- **Purpose**: PostgreSQL database connection string
- **Format**: `postgresql://user:password@host:port/database`
- **How to get**: 
  - Railway: Automatically set when you add PostgreSQL service
  - Neon: Copy from dashboard → Connection String
- **Example**: `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require`

### 2. GEMINI_API_KEY
- **Purpose**: Google Gemini API key for screenshot recipe extraction
- **How to get**: 
  1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
  2. Click "Create API Key"
  3. Copy the key
- **Format**: Usually starts with `AIza...` and is ~39 characters
- **Example**: `AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 3. SESSION_SECRET
- **Purpose**: Secret key for encrypting user sessions
- **How to generate**: 
  ```bash
  openssl rand -base64 32
  ```
- **Format**: Random base64 string (32+ characters)
- **Example**: `xK9mP2qR8vL5nT3wY7zA1bC4dE6fG8hJ0kM2nP4qR6sT8uV0wX2yZ4aB6cD8eF0`

### 4. ALLOWED_ORIGINS (Required in Production)
- **Purpose**: CORS - which domains can access your API
- **Format**: Comma-separated list of URLs
- **Example**: `https://your-app.up.railway.app,https://yourdomain.com`
- **For Railway**: Use your Railway domain: `https://your-app-name.up.railway.app`

### 5. NODE_ENV
- **Purpose**: Environment mode
- **Value**: `production` (for Railway)
- **Note**: Railway may set this automatically

## 🔧 Optional Variables (Nice to Have)

### 6. TOGETHER_API_KEY
- **Purpose**: Together AI API key (alternative to Gemini for image extraction)
- **When needed**: Only if you want to use Together AI instead of Gemini
- **Default**: Not required (Gemini is primary)

### 7. GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET
- **Purpose**: Google OAuth for user authentication
- **When needed**: Only if you want user accounts/login
- **How to get**: [Google Cloud Console](https://console.cloud.google.com/)
- **Default**: Not required (app works without user accounts)

### 8. FACEBOOK_APP_ID & FACEBOOK_APP_SECRET
- **Purpose**: Facebook OAuth for user authentication
- **When needed**: Only if you want Facebook login
- **Default**: Not required

### 9. CRAWL_INTERVAL_MS
- **Purpose**: How often the crawler runs (in milliseconds)
- **Recommended**: `86400000` (24 hours / nightly)
- **Default**: `21600000` (6 hours) if not set
- **Options**:
  - `3600000` = 1 hour
  - `21600000` = 6 hours
  - `43200000` = 12 hours
  - `86400000` = 24 hours (recommended)

### 10. CRAWL_IMMEDIATE
- **Purpose**: Run crawler immediately on server start
- **Values**: `true` or `false`
- **Default**: `false` (only runs during off-peak hours)

### 11. CRAWL_ANYTIME
- **Purpose**: Allow crawler to run during peak hours
- **Values**: `true` or `false`
- **Default**: `false` (only runs 2 AM - 6 AM)

### 12. PORT
- **Purpose**: Server port
- **Default**: `5000`
- **Note**: Railway sets this automatically, usually don't need to set

### 13. REPLIT_DOMAINS, REPL_ID, ISSUER_URL
- **Purpose**: Replit-specific OAuth configuration
- **When needed**: Only if deploying to Replit
- **Default**: Not required for Railway/Render/etc.

## 📋 Quick Copy-Paste for Railway

### Minimum Required (Copy these to Railway Variables):

```bash
DATABASE_URL=postgresql://...  # Auto-set by Railway PostgreSQL service
GEMINI_API_KEY=AIza...  # Your Gemini API key
SESSION_SECRET=...  # Generate with: openssl rand -base64 32
ALLOWED_ORIGINS=https://your-app-name.up.railway.app
NODE_ENV=production
```

### Recommended (Add these too):

```bash
CRAWL_INTERVAL_MS=86400000  # 24 hours (nightly crawls)
CRAWL_IMMEDIATE=false
CRAWL_ANYTIME=false
```

## 🎯 Step-by-Step: Getting Your Keys

### 1. GEMINI_API_KEY
1. Visit: https://aistudio.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)
5. Paste into Railway Variables as `GEMINI_API_KEY`

### 2. SESSION_SECRET
Run this command locally:
```bash
openssl rand -base64 32
```
Copy the output and paste into Railway Variables as `SESSION_SECRET`

### 3. DATABASE_URL
- **Railway**: Automatically set when you add PostgreSQL service
- **Manual**: If using external database, copy connection string

### 4. ALLOWED_ORIGINS
1. Deploy your app first (get the Railway domain)
2. Go to Railway → Your App → Settings → "Domains"
3. Copy your domain (e.g., `https://recipe-db.up.railway.app`)
4. Add to Variables as `ALLOWED_ORIGINS=https://recipe-db.up.railway.app`

## ✅ Verification Checklist

Before deploying, ensure you have:

- [ ] `DATABASE_URL` - From PostgreSQL service (Railway auto-sets this)
- [ ] `GEMINI_API_KEY` - From Google AI Studio
- [ ] `SESSION_SECRET` - Generated with `openssl rand -base64 32`
- [ ] `ALLOWED_ORIGINS` - Your Railway domain URL
- [ ] `NODE_ENV=production` - Set to production

## 🔍 How to Check What's Missing

The app will tell you what's missing:
- If `DATABASE_URL` missing → Error on startup
- If `GEMINI_API_KEY` missing → Screenshot upload won't work
- If `SESSION_SECRET` missing → Sessions won't work (if using auth)
- If `ALLOWED_ORIGINS` missing → CORS errors in browser console

## 💡 Pro Tips

1. **Railway Auto-Sets**: `DATABASE_URL` and `PORT` are usually auto-set
2. **Test Locally First**: Use `.env` file to test before deploying
3. **Keep Secrets Safe**: Never commit `.env` to git (already in .gitignore)
4. **Rotate Keys**: If a key is exposed, regenerate it immediately
5. **Use Railway Secrets**: Railway has a "Secrets" tab for sensitive values

