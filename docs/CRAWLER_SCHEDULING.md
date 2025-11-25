# Crawler Scheduling Guide

## Current Implementation

The web scraping functionality runs automatically when the server starts. Here's how it works:

### Scheduling Behavior

1. **Initial Crawl**: Runs 5 seconds after server startup (if off-peak hours or `CRAWL_IMMEDIATE=true`)
2. **Recurring Crawls**: Runs at configurable intervals (default: **6 hours**)

### Configuration

The crawler can be configured via environment variables:

#### `CRAWL_INTERVAL_MS` (Recommended)
Set the interval between crawls in milliseconds.

**Common Values:**
- `3600000` = 1 hour (aggressive, may get rate-limited)
- `21600000` = 6 hours (default, good balance) ⭐
- `43200000` = 12 hours (conservative)
- `86400000` = 24 hours / nightly (most common for ETL jobs) ⭐⭐

**Example:**
```bash
# Nightly crawls (2 AM - 6 AM window)
CRAWL_INTERVAL_MS=86400000 npm run dev
```

#### `CRAWL_IMMEDIATE` (Optional)
Force immediate crawl on server start, regardless of time.

```bash
CRAWL_IMMEDIATE=true npm run dev
```

#### `CRAWL_ANYTIME` (Optional)
Allow crawls during peak hours (default: only runs 2 AM - 6 AM).

```bash
CRAWL_ANYTIME=true npm run dev
```

## Best Practices for Recipe Aggregation

### Industry Standards

Most production recipe aggregators use:

1. **Nightly ETL Jobs** (Most Common)
   - Run between 2 AM - 6 AM (off-peak hours)
   - Lower server load on target sites
   - Recipes don't change frequently enough to need real-time updates
   - Example: `CRAWL_INTERVAL_MS=86400000`

2. **Twice Daily** (6-12 hour intervals)
   - For more active sites or when freshness is important
   - Example: `CRAWL_INTERVAL_MS=43200000`

3. **Hourly** (Not Recommended)
   - Only for very high-traffic sites with constant updates
   - High risk of rate limiting and IP blocking
   - Wastes server resources

### Why Not Every 10 Minutes?

The previous 10-minute interval was **too aggressive** because:

- ❌ **Rate Limiting**: Most sites will block or throttle frequent requests
- ❌ **Resource Waste**: Recipes don't update that frequently
- ❌ **IP Blocking**: Risk of being blacklisted
- ❌ **Server Load**: Unnecessary load on both your server and target sites
- ❌ **Ethical Concerns**: Too frequent scraping can be seen as abusive

### Recommended Production Setup

For a production recipe database, use **nightly crawls**:

```bash
# .env file
CRAWL_INTERVAL_MS=86400000  # 24 hours
# Crawler will automatically run during off-peak hours (2 AM - 6 AM)
```

This provides:
- ✅ Fresh recipes daily
- ✅ Respectful of target sites
- ✅ Lower resource usage
- ✅ Industry-standard approach

## How It Works

### Off-Peak Hours Detection

The crawler automatically detects off-peak hours (2 AM - 6 AM local time) and prefers to run during these times to:
- Reduce load on target sites
- Avoid peak traffic periods
- Be more respectful of server resources

### Job Management

- **Concurrent Jobs**: Maximum 4 crawl jobs can run simultaneously
- **Duplicate Prevention**: URLs are cached to avoid re-crawling
- **Error Handling**: Failed crawls don't crash the app
- **Smart Skipping**: Skips scheduled crawls if a job is already running

### Rate Limiting

The crawler includes:
- **Adaptive Rate Limiter**: Adjusts delays based on success/failure rates
- **URL Cooldown**: 2 hours for successful crawls, 15 minutes for failures
- **Bounded URL Cache**: Prevents memory leaks from URL tracking

## Monitoring

Check crawler status via logs:
```
Starting automatic recipe crawling...
Crawl interval: 6 hours (21600000ms)
Starting scheduled crawl (interval: 6h)...
Discovered 15 new recipes (5 already exist)
```

## Manual Control

You can also trigger crawls manually via the API (if endpoints are exposed) or by restarting the server with `CRAWL_IMMEDIATE=true`.

