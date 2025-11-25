# Railway Deployment Setup Guide

## 🚀 Quick Setup Steps

### 1. Connect Your Repository
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your RecipeDB repository

### 2. Add PostgreSQL Database
1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create a database
4. **Important**: The `DATABASE_URL` environment variable is automatically set!

### 3. Configure Environment Variables

Click on your service → "Variables" tab → Add these:

#### Required Variables:
```bash
# Database (usually auto-set by Railway, but verify it exists)
DATABASE_URL=postgresql://...  # Should be auto-populated from PostgreSQL service

# API Keys
GEMINI_API_KEY=your_gemini_api_key_here

# Session Security (generate with: openssl rand -base64 32)
SESSION_SECRET=your_random_secret_here

# CORS (Required!)
ALLOWED_ORIGINS=https://your-app-name.up.railway.app,https://yourdomain.com

# Server
NODE_ENV=production
PORT=5000  # Railway sets this automatically, but you can override
```

#### Optional Variables:
```bash
# Crawler Settings
CRAWL_INTERVAL_MS=86400000  # 24 hours (recommended for production)
CRAWL_IMMEDIATE=false
CRAWL_ANYTIME=false

# OAuth (if using user accounts)
GOOGLE_CLIENT_ID=optional
GOOGLE_CLIENT_SECRET=optional
FACEBOOK_APP_ID=optional
FACEBOOK_APP_SECRET=optional
```

### 4. Link Database to Your Service

**Important**: If you added PostgreSQL separately:
1. Go to your PostgreSQL service
2. Click "Connect" or "Variables"
3. Copy the `DATABASE_URL`
4. Go to your app service → Variables
5. Add `DATABASE_URL` with the copied value

**OR** Railway should auto-link them if both services are in the same project.

### 5. Run Database Migration

**CRITICAL**: After first deploy, you must create the database tables:

1. Go to your app service → "Deployments" tab
2. Click "..." (three dots) → "Run Command"
3. Enter: `npm run db:push`
4. Click "Run"
5. Wait for completion (creates `recipes`, `sessions`, `users` tables)

**OR** add to Railway's build command (optional):
- Settings → "Build Command": `npm run build && npm run db:push`

### 6. Deploy

Railway will automatically:
- Detect it's a Node.js project
- Run `npm install`
- Run `npm run build`
- Run `npm start`

## 🔧 Troubleshooting

### Error: "DATABASE_URL must be set"

**Solution 1: Check if database is linked**
- Go to your app service → Settings → "Connect to Database"
- Select your PostgreSQL service
- Railway will auto-add `DATABASE_URL`

**Solution 2: Manually add DATABASE_URL**
- Go to PostgreSQL service → Variables
- Copy the `DATABASE_URL` value
- Go to app service → Variables
- Add `DATABASE_URL` with the copied value

**Solution 3: Use Railway's database reference**
- In your app service variables, you can reference: `${{Postgres.DATABASE_URL}}`
- Replace `Postgres` with your actual database service name

### Error: "GEMINI_API_KEY is not set"

1. Go to your app service → Variables
2. Add `GEMINI_API_KEY` with your actual key
3. Redeploy (Railway auto-redeploys on variable changes)

### Error: "ALLOWED_ORIGINS not set"

1. Get your Railway domain: `your-app-name.up.railway.app`
2. Add to Variables: `ALLOWED_ORIGINS=https://your-app-name.up.railway.app`
3. If you have a custom domain, add both

### Database Connection Issues

1. **Check database is running**: PostgreSQL service should show "Active"
2. **Check connection string format**: Should be `postgresql://user:pass@host:port/dbname`
3. **Run migrations**: After first deploy, you may need to run:
   ```bash
   npm run db:push
   ```
   (Railway can run this in a one-off command)

## 📋 Environment Variables Checklist

Before deploying, ensure you have:

- [ ] `DATABASE_URL` - From PostgreSQL service
- [ ] `GEMINI_API_KEY` - Your Gemini API key
- [ ] `SESSION_SECRET` - Random string (generate with `openssl rand -base64 32`)
- [ ] `ALLOWED_ORIGINS` - Your Railway domain
- [ ] `NODE_ENV=production`

## 🔗 Railway-Specific Tips

1. **Auto-Deploy**: Railway auto-deploys on git push to main branch
2. **Logs**: View logs in Railway dashboard → Your service → "Logs"
3. **Metrics**: Monitor CPU, memory, and network usage
4. **Custom Domain**: Add in Settings → "Custom Domain"
5. **Environment**: Railway automatically sets `NODE_ENV=production` in production

## 🎯 Quick Fix for Current Error

**Right now, you need to:**

1. **Add PostgreSQL Database** (if not already added):
   - Click "+ New" in Railway project
   - Select "Database" → "Add PostgreSQL"

2. **Link Database to App**:
   - Go to your app service
   - Settings → "Connect to Database"
   - Select your PostgreSQL service

3. **Verify DATABASE_URL exists**:
   - Go to app service → Variables
   - Check that `DATABASE_URL` is listed
   - If not, manually add it from PostgreSQL service variables

4. **Redeploy**:
   - Railway should auto-redeploy
   - Or click "Redeploy" button

## 💡 Pro Tips

- **Use Railway's variable references**: `${{Postgres.DATABASE_URL}}` automatically links services
- **Check logs**: Railway logs show exactly what's missing
- **Test locally first**: Use Railway CLI to test: `railway run npm start`
- **Database migrations**: Run `railway run npm run db:push` after first deploy

