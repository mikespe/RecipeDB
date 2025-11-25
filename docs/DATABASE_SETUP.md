# Database Setup Guide

## 🗄️ Database Requirements

Your app uses **PostgreSQL** with **Drizzle ORM**. You can use:
- **Railway PostgreSQL** (easiest - auto-linked)
- **Neon** (free tier, serverless PostgreSQL)
- **Any PostgreSQL database** (Supabase, AWS RDS, etc.)

## 📋 Database Schema

Your app creates these tables:

### 1. `recipes` Table
Stores all recipe data:
- `id` (UUID, primary key)
- `title`, `description`
- `ingredients`, `directions` (JSON strings)
- `source` (URL)
- `image_url`
- `is_auto_scraped` (0 or 1)
- `moderation_status`
- `category`, `cuisine`, `difficulty`
- `prep_time_minutes`, `cook_time_minutes`, `servings`
- `tags` (JSON array)
- `favorite_count`
- `scraped_at` (timestamp)

### 2. `sessions` Table
Stores user session data (for authentication):
- `sid` (session ID, primary key)
- `sess` (JSON session data)
- `expire` (timestamp)

### 3. `users` Table
Stores user accounts (if using authentication):
- `id` (UUID, primary key)
- `email` (unique)
- `first_name`, `last_name`
- `profile_image_url`
- `created_at`, `updated_at`

## 🚀 Setup Steps

### Option 1: Railway PostgreSQL (Recommended)

1. **Add PostgreSQL Service**
   - In Railway project → Click "+ New"
   - Select "Database" → "Add PostgreSQL"
   - Railway creates database automatically

2. **Link to App Service**
   - Go to your app service → Settings
   - Click "Connect to Database"
   - Select your PostgreSQL service
   - Railway auto-sets `DATABASE_URL`

3. **Run Schema Migration**
   - Go to your app service → "Deployments"
   - Click "..." → "Run Command"
   - Run: `npm run db:push`
   - This creates all tables

### Option 2: Neon (Free Tier)

1. **Create Neon Account**
   - Go to [neon.tech](https://neon.tech)
   - Sign up (free tier available)
   - Create a new project

2. **Get Connection String**
   - In Neon dashboard → Your project
   - Click "Connection Details"
   - Copy the connection string
   - Format: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`

3. **Add to Railway Variables**
   - Go to Railway → Your app service → Variables
   - Add: `DATABASE_URL` = (paste connection string)

4. **Run Schema Migration**
   - Railway → App service → Run Command
   - Run: `npm run db:push`

### Option 3: Local Development

1. **Install PostgreSQL** (if not installed)
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql
   
   # Or use Docker
   docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
   ```

2. **Create Database**
   ```bash
   createdb recipe_db
   # Or via psql:
   psql postgres
   CREATE DATABASE recipe_db;
   ```

3. **Set DATABASE_URL in .env**
   ```bash
   DATABASE_URL=postgresql://localhost:5432/recipe_db
   # Or with password:
   DATABASE_URL=postgresql://user:password@localhost:5432/recipe_db
   ```

4. **Run Migration**
   ```bash
   npm run db:push
   ```

## 🔧 Running Database Migrations

### Command:
```bash
npm run db:push
```

### What it does:
- Reads `shared/schema.ts`
- Creates/updates tables to match schema
- Safe to run multiple times (idempotent)
- Won't delete data (only adds/updates)

### On Railway:
1. Go to your app service
2. Click "Deployments" tab
3. Click "..." (three dots) → "Run Command"
4. Enter: `npm run db:push`
5. Click "Run"

### Verify Migration Worked:
```bash
# Check tables were created
# In Railway: Go to PostgreSQL service → "Data" tab
# You should see: recipes, sessions, users tables
```

## 📊 Database Tables Overview

### `recipes` Table Structure:
```sql
CREATE TABLE recipes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  ingredients TEXT NOT NULL,  -- JSON string
  directions TEXT NOT NULL,   -- JSON string
  source TEXT NOT NULL,
  image_url TEXT,
  is_auto_scraped INTEGER NOT NULL DEFAULT 0,
  moderation_status TEXT NOT NULL DEFAULT 'approved',
  category TEXT,
  cuisine TEXT,
  dietary_restrictions TEXT,  -- JSON array
  difficulty TEXT,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  total_time_minutes INTEGER,
  servings INTEGER,
  tags TEXT,  -- JSON array
  favorite_count INTEGER NOT NULL DEFAULT 0,
  scraped_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### `sessions` Table:
```sql
CREATE TABLE sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IDX_session_expire ON sessions(expire);
```

### `users` Table:
```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## ✅ Verification Checklist

After setup, verify:

1. **Database Connection**
   - App starts without `DATABASE_URL` error
   - Check Railway logs for connection success

2. **Tables Created**
   - `recipes` table exists
   - `sessions` table exists
   - `users` table exists

3. **Can Insert Data**
   - Try adding a recipe via the UI
   - Check it appears in database

4. **Can Query Data**
   - Recipes show up on home page
   - Search works
   - Recipe detail pages load

## 🔍 Troubleshooting

### Error: "relation 'recipes' does not exist"
**Solution**: Run `npm run db:push` to create tables

### Error: "DATABASE_URL must be set"
**Solution**: 
- Railway: Link PostgreSQL service to app service
- Or manually add `DATABASE_URL` in Variables

### Error: "connection refused" or "timeout"
**Solution**:
- Check database is running (Railway shows "Active")
- Verify `DATABASE_URL` format is correct
- Check firewall/network settings

### Error: "permission denied"
**Solution**:
- Database user needs CREATE TABLE permissions
- Railway/Neon should have this by default
- If using custom PostgreSQL, grant permissions:
  ```sql
  GRANT ALL PRIVILEGES ON DATABASE recipe_db TO your_user;
  ```

### Migration Fails
**Solution**:
- Check `DATABASE_URL` is correct
- Verify database is accessible
- Check Railway logs for specific error
- Try running migration locally first to test

## 🎯 Quick Setup Commands

### Railway (After adding PostgreSQL):
```bash
# Railway auto-sets DATABASE_URL, just run:
npm run db:push
```

### Neon:
```bash
# 1. Get connection string from Neon dashboard
# 2. Add to Railway Variables as DATABASE_URL
# 3. Run migration:
npm run db:push
```

### Local:
```bash
# 1. Create .env file:
echo "DATABASE_URL=postgresql://localhost:5432/recipe_db" > .env

# 2. Run migration:
npm run db:push

# 3. Start app:
npm run dev
```

## 📝 Important Notes

1. **First Deploy**: Always run `npm run db:push` after first deployment
2. **Schema Changes**: If you modify `shared/schema.ts`, run `npm run db:push` again
3. **Data Safety**: `db:push` is safe - it won't delete existing data
4. **Backups**: Railway/Neon provide automatic backups
5. **Free Tier Limits**: 
   - Railway: 512 MB storage
   - Neon: 512 MB storage, 0.5 GB compute

## 🔄 Updating Schema

If you modify the schema in `shared/schema.ts`:

1. **Update Schema File**: Edit `shared/schema.ts`
2. **Run Migration**: `npm run db:push`
3. **Verify**: Check tables match new schema

The migration will:
- Add new columns
- Update column types
- Add new tables
- **Won't delete** existing columns or data (by default)

## 💡 Pro Tips

1. **Railway Auto-Linking**: If PostgreSQL and app are in same project, Railway auto-links them
2. **Neon Free Tier**: Great for development, 512 MB is plenty for recipes
3. **Connection Pooling**: Neon provides connection pooling automatically
4. **Backup Strategy**: Railway/Neon handle backups, but export important data periodically
5. **Monitor Usage**: Check database size in Railway/Neon dashboard

## 🎯 Next Steps After Database Setup

1. ✅ Run `npm run db:push` to create tables
2. ✅ Verify app starts without errors
3. ✅ Test adding a recipe via UI
4. ✅ Check recipes appear in database
5. ✅ Verify search functionality works

Your database is ready when:
- App starts successfully
- You can add recipes
- Recipes appear in the UI
- No database errors in logs

