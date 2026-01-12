# Node.js Version Fix

## 🚨 Problem

Railway was using Node.js v18.20.5, but the code requires Node.js 20+ because:
- The `File` API (used by `undici` package) requires Node.js 20+
- `@types/node` is set to 20.16.11
- Error: `ReferenceError: File is not defined`

## ✅ Solution

I've added multiple ways to tell Railway to use Node.js 20:

1. **`package.json` engines field** - Specifies Node 20+ requirement
2. **`.nvmrc` file** - Tells Railway/Nixpacks to use Node 20
3. **`.node-version` file** - Alternative version file
4. **`railway.json`** - Explicitly sets Node 20 in Nixpacks config

## 🚀 Next Steps

### 1. Commit and Push
```bash
git add package.json .nvmrc .node-version railway.json
git commit -m "Fix: Require Node.js 20+ for File API compatibility"
git push
```

### 2. Railway Will Auto-Detect

Railway should automatically:
- Detect `.nvmrc` or `.node-version` file
- Use Node.js 20 for the build
- Or use the `engines` field in `package.json`

### 3. Manual Override (If Needed)

If Railway still uses Node 18:
1. Go to Railway → Your app service → Settings
2. Look for "Build" or "Environment" settings
3. Set Node.js version to 20
4. Or add environment variable: `NODE_VERSION=20`

## ✅ Expected Result

After deployment:
- ✅ Railway uses Node.js 20.x
- ✅ No more "File is not defined" error
- ✅ App starts successfully

## 🔍 Verify Node Version

After deployment, check Railway logs:
- Should see: `Node.js v20.x.x` (not v18.x.x)
- No more `ReferenceError: File is not defined`


