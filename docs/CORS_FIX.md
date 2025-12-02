# CORS Fix for Static Assets

## 🚨 Problem

Static assets (CSS, JS files) were being blocked by CORS:
```
[ERROR] Not allowed by CORS {"path":"/assets/index-4g0Eej1e.css",...}
[ERROR] Not allowed by CORS {"path":"/assets/index-D_0ZybBM.js",...}
```

## ✅ Solution

Updated `server/middleware/security.ts` to:
1. **Skip CORS for static assets** - They're served from the same origin, so CORS isn't needed
2. **Allow same-origin requests** - Requests with no origin header (same-origin) are now allowed
3. **Only apply CORS to API routes** - Static files bypass CORS checks entirely

## 🚀 Next Steps

### 1. Commit and Push
```bash
git add server/middleware/security.ts
git commit -m "Fix: Skip CORS for static assets to prevent 500 errors"
git push
```

### 2. Verify ALLOWED_ORIGINS (Still Important for API)
Go to Railway → Your app service → "Variables" tab:
- Set `ALLOWED_ORIGINS` to include your domains:
  ```
  https://recipedb-production-69a3.up.railway.app,https://recipedb.com,https://www.recipedb.com
  ```

### 3. Test After Deploy
- Visit: `https://recipedb-production-69a3.up.railway.app/`
- Should load without CORS errors
- CSS and JS files should load properly

## 📋 What Changed

**Before:**
- CORS applied to ALL requests (including static assets)
- Static assets blocked if origin didn't match

**After:**
- CORS skipped for static assets (`/assets/`, `.js`, `.css`, etc.)
- CORS only applied to API routes
- Same-origin requests (no origin header) allowed

## ✅ Expected Result

After deployment:
- ✅ No more CORS errors for static assets
- ✅ Website loads properly
- ✅ CSS and JS files load successfully
- ✅ API routes still protected by CORS

