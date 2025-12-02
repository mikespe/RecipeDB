# Railway 500 Error Fix Guide

## 🔍 Common Causes of 500 Errors

### 1. **Static Files Not Found** (Most Likely)
**Symptom:** "Could not find the build directory"
**Fix:** I've updated `server/vite.ts` with better path resolution. Commit and push:
```bash
git add server/vite.ts
git commit -m "Fix: Improve static file path resolution for Railway"
git push
```

### 2. **Database Connection Error**
**Symptom:** Database connection failures in logs
**Check:** Railway logs should show database errors
**Fix:** 
- Verify `DATABASE_URL` is set in Variables
- Ensure PostgreSQL service is running
- Check if migration ran: `npm run db:push`

### 3. **Missing Environment Variables**
**Symptom:** "X must be set" errors
**Check Railway Variables:**
- ✅ `DATABASE_URL` (auto-set from PostgreSQL)
- ✅ `GEMINI_API_KEY`
- ✅ `SESSION_SECRET`
- ✅ `NODE_ENV=production`
- ✅ `ALLOWED_ORIGINS` (should include your Railway domain)

### 4. **Build Failed**
**Symptom:** No `dist/public` folder
**Check:** Railway build logs
**Fix:** Ensure build completes successfully

## 🔧 Step-by-Step Fix

### Step 1: Check Railway Logs
1. Go to Railway → Your app service → **"Logs"** tab
2. Look for the **exact error message**
3. Common errors:
   - "Could not find the build directory" → Static file path issue
   - "DATABASE_URL must be set" → Missing env var
   - "Connection refused" → Database connection issue
   - "Cannot find module" → Build/dependency issue

### Step 2: Verify Build Output
Check Railway → **"Deployments"** → Latest deployment:
- Should see: `vite build` ✅
- Should see: `esbuild` ✅
- Should see: Build completed ✅

### Step 3: Check Environment Variables
Go to Railway → Your app service → **"Variables"** tab:
- All required variables set?
- `DATABASE_URL` exists?
- `NODE_ENV=production`?

### Step 4: Test Health Endpoint
Try: `https://recipedb-production-69a3.up.railway.app/health`
- If this works → Frontend/static files issue
- If this fails → Backend/server issue

### Step 5: Commit Static File Fix
```bash
git add server/vite.ts railway.json
git commit -m "Fix: Static file path and Railway start command"
git push
```

## 🚨 Quick Diagnostic

**What error do you see in Railway logs?**
- Share the exact error message from the "Logs" tab
- This will help pinpoint the exact issue

## ✅ Expected Behavior After Fix

1. **Build completes** → Creates `dist/public/` folder
2. **Server starts** → Logs show "serving on port XXXX"
3. **Static files found** → No "Could not find build directory" error
4. **Website loads** → `https://recipedb-production-69a3.up.railway.app/` works

