# Railway Database Connection Fix

## ✅ What Was Fixed

Updated `server/db.ts` to use **standard PostgreSQL** driver instead of Neon's serverless driver.

**Before:** Used `@neondatabase/serverless` (for Neon serverless PostgreSQL)  
**After:** Uses `pg` (standard PostgreSQL driver for Railway)

## 🚀 Next Steps for Railway

### 1. Commit and Push Changes
```bash
git add server/db.ts package.json package-lock.json
git commit -m "Fix: Use standard PostgreSQL driver for Railway"
git push
```

Railway will automatically detect the push and redeploy.

### 2. Verify Environment Variables
Go to Railway → Your app service → **"Variables"** tab, ensure:
- ✅ `DATABASE_URL` is set (should be auto-set from PostgreSQL service)
- ✅ `GEMINI_API_KEY` is set
- ✅ `SESSION_SECRET` is set
- ✅ `NODE_ENV=production`
- ✅ `ALLOWED_ORIGINS=https://recipedb.com,https://www.recipedb.com`

### 3. Run Database Migration
After deployment:
1. Go to Railway → Your app service → **"Deployments"** tab
2. Click **"..."** → **"Run Command"**
3. Run: `npm run db:push`
4. Wait for: "Tables created successfully"

### 4. Check Logs
Go to Railway → Your app service → **"Logs"** tab:
- Should see: `serving on port XXXX` ✅
- No more "invalid length of startup packet" errors ✅
- Database connection successful ✅

### 5. Test Your Site
- Railway domain: `https://your-app.up.railway.app`
- Custom domain: `https://recipedb.com`
- Health check: `https://recipedb.com/health`

## 🔍 Troubleshooting

### Still Getting Connection Errors?
1. **Verify DATABASE_URL format:**
   - Should be: `postgresql://user:password@host:port/database`
   - Railway auto-generates this when you link PostgreSQL service

2. **Check PostgreSQL Service:**
   - Go to Railway → PostgreSQL service
   - Verify it's running (green status)
   - Check "Variables" tab for connection details

3. **Re-link Database:**
   - Go to your app service → Settings
   - Click "Connect to Database"
   - Select your PostgreSQL service
   - Railway will auto-set `DATABASE_URL`

### Build Errors?
- Check Railway build logs
- Ensure `pg` package is installed (should be automatic from `package.json`)

## ✅ Success Indicators

You'll know it's working when:
- ✅ No "invalid length of startup packet" errors in logs
- ✅ App starts successfully: `serving on port XXXX`
- ✅ `/health` endpoint returns `{"status":"ok"}`
- ✅ Database migration runs successfully
- ✅ Website loads at your domain

