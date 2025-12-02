# Railway Start Command Fix

## 🚨 Problem

Railway is running `npm run db:push` (database migration) as the start command, which causes the container to stop after migration completes. The server never starts!

## ✅ Solution

### Option 1: Fix in Railway Dashboard (Recommended)

1. Go to Railway → Your app service
2. Click **"Settings"** tab
3. Scroll to **"Deploy"** section
4. Find **"Start Command"** field
5. Change it to: `npm start`
6. Click **"Save"**
7. Railway will automatically redeploy

### Option 2: Use railway.json (Already Created)

I've created a `railway.json` file that specifies the correct start command. After you commit and push:

```bash
git add railway.json
git commit -m "Fix: Set correct Railway start command"
git push
```

Railway will automatically use `npm start` from the config file.

## 📋 What Should Happen

**Before (Wrong):**
- Start Command: `npm run db:push` ❌
- Container runs migration → stops → no server

**After (Correct):**
- Start Command: `npm start` ✅
- Container runs migration (if needed) → starts server → stays running

## 🔍 Verify It's Working

After fixing, check Railway logs. You should see:

```
> rest-express@1.0.0 start
> NODE_ENV=production node dist/index.js

serving on port 5000
[INFO] Server started { port: 5000, environment: 'production', ... }
```

NOT:
```
> rest-express@1.0.0 db:push
> drizzle-kit push
...
Stopping Container  ❌
```

## 🗄️ Database Migration

**Important:** The migration (`npm run db:push`) should run **separately**, not as the start command:

1. Go to Railway → Your app service → **"Deployments"** tab
2. Click **"..."** → **"Run Command"**
3. Run: `npm run db:push`
4. This runs once to create tables, then your server starts normally

## ✅ Quick Checklist

- [ ] Start Command in Railway Settings = `npm start`
- [ ] Database migration run separately (via "Run Command")
- [ ] Logs show "serving on port XXXX"
- [ ] Website loads at your Railway domain

