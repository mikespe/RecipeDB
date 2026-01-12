import axios from "axios";
import * as cheerio from "cheerio";
import { storage } from "./storage";
import { insertRecipeSchema } from "@shared/schema";
import { youtubeCrawler } from "./youtube-crawler";
import { playwrightCrawler } from "./playwright-crawler";
import { HtmlSanitizer } from "./services/html-sanitizer";
import {
  PRIORITIZED_SOURCES,
  batchCheckRecipes,
  AdaptiveRateLimiter,
  BoundedUrlCache
} from "./services/crawler-optimizer";

// Alternative recipe discovery sources - Focus on sites with better access
const RSS_SOURCES = [
  {
    name: "BBC Good Food RSS",
    url: "https://www.bbcgoodfood.com/recipes/feed/",
    type: "rss"
  },
  {
    name: "Food Network RSS",
    url: "https://www.foodnetwork.com/feeds/all-latest-recipes",
    type: "rss"
  },
  {
    name: "AllRecipes RSS",
    url: "https://www.allrecipes.com/rss/dailydish/",
    type: "rss"
  }
];

// Popular recipe sites to crawl - Massively expanded for maximum coverage
const RECIPE_SOURCES = [
  // Major Recipe Sites
  {
    name: "AllRecipes",
    baseUrl: "https://www.allrecipes.com",
    searchUrl: "https://www.allrecipes.com/recipes/",
    recipeSelector: "a[href*='/recipe/']",
    maxPages: 4
  },
  {
    name: "Food Network",
    baseUrl: "https://www.foodnetwork.com",
    searchUrl: "https://www.foodnetwork.com/recipes/",
    recipeSelector: "a[href*='/recipes/']",
    maxPages: 3
  },
  {
    name: "Tasty",
    baseUrl: "https://tasty.co",
    searchUrl: "https://tasty.co/search",
    recipeSelector: "a[href*='/recipe/']",
    maxPages: 4
  },
  {
    name: "Simply Recipes",
    baseUrl: "https://www.simplyrecipes.com",
    searchUrl: "https://www.simplyrecipes.com/recipes/",
    recipeSelector: "a[href*='/recipes/']",
    maxPages: 3
  },
  {
    name: "Bon Appetit",
    baseUrl: "https://www.bonappetit.com",
    searchUrl: "https://www.bonappetit.com/recipes/",
    recipeSelector: "a[href*='/recipe/']",
    maxPages: 3
  },
  {
    name: "Serious Eats",
    baseUrl: "https://www.seriouseats.com",
    searchUrl: "https://www.seriouseats.com/recipes/",
    recipeSelector: "a[href*='/recipes/']",
    maxPages: 3
  },
  {
    name: "BBC Good Food",
    baseUrl: "https://www.bbcgoodfood.com",
    searchUrl: "https://www.bbcgoodfood.com/recipes/",
    recipeSelector: "a[href*='/recipes/']",
    maxPages: 3
  },
  {
    name: "Epicurious",
    baseUrl: "https://www.epicurious.com",
    searchUrl: "https://www.epicurious.com/recipes/",
    recipeSelector: "a[href*='/recipes/']",
    maxPages: 3
  },
  {
    name: "Martha Stewart",
    baseUrl: "https://www.marthastewart.com",
    searchUrl: "https://www.marthastewart.com/recipes/",
    recipeSelector: "a[href*='/recipe/']",
    maxPages: 3
  },
  {
    name: "Taste of Home",
    baseUrl: "https://www.tasteofhome.com",
    searchUrl: "https://www.tasteofhome.com/recipes/",
    recipeSelector: "a[href*='/recipe/']",
    maxPages: 3
  },
  {
    name: "King Arthur Baking",
    baseUrl: "https://www.kingarthurbaking.com",
    searchUrl: "https://www.kingarthurbaking.com/recipes/",
    recipeSelector: "a[href*='/recipe/']",
    maxPages: 3
  },

  // Popular Food Blogs
  {
    name: "Minimalist Baker",
    baseUrl: "https://minimalistbaker.com",
    searchUrl: "https://minimalistbaker.com/recipes/",
    recipeSelector: "a[href*='/recipe/']",
    maxPages: 4
  },
  {
    name: "Cookie and Kate",
    baseUrl: "https://cookieandkate.com",
    searchUrl: "https://cookieandkate.com/recipes/",
    recipeSelector: "a[href*='/recipe/']",
    maxPages: 4
  },
  {
    name: "Pinch of Yum",
    baseUrl: "https://pinchofyum.com",
    searchUrl: "https://pinchofyum.com/recipes/",
    recipeSelector: "a[href*='/recipe/']",
    maxPages: 4
  },
  {
    name: "Half Baked Harvest",
    baseUrl: "https://www.halfbakedharvest.com",
    searchUrl: "https://www.halfbakedharvest.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "Gimme Some Oven",
    baseUrl: "https://www.gimmesomeoven.com",
    searchUrl: "https://www.gimmesomeoven.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "Budget Bytes",
    baseUrl: "https://www.budgetbytes.com",
    searchUrl: "https://www.budgetbytes.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "The Pioneer Woman",
    baseUrl: "https://www.thepioneerwoman.com",
    searchUrl: "https://www.thepioneerwoman.com/food-cooking/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 3
  },
  {
    name: "Love and Lemons",
    baseUrl: "https://www.loveandlemons.com",
    searchUrl: "https://www.loveandlemons.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "Sally's Baking Addiction",
    baseUrl: "https://sallysbakingaddiction.com",
    searchUrl: "https://sallysbakingaddiction.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "Damn Delicious",
    baseUrl: "https://damndelicious.net",
    searchUrl: "https://damndelicious.net/category/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },

  // International & Specialty Sites
  {
    name: "Cafe Delites",
    baseUrl: "https://cafedelites.com",
    searchUrl: "https://cafedelites.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "Recipe Tin Eats",
    baseUrl: "https://www.recipetineats.com",
    searchUrl: "https://www.recipetineats.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "Spend With Pennies",
    baseUrl: "https://www.spendwithpennies.com",
    searchUrl: "https://www.spendwithpennies.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "Downshiftology",
    baseUrl: "https://downshiftology.com",
    searchUrl: "https://downshiftology.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "Jessica Gavin",
    baseUrl: "https://www.jessicagavin.com",
    searchUrl: "https://www.jessicagavin.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "Natasha's Kitchen",
    baseUrl: "https://natashaskitchen.com",
    searchUrl: "https://natashaskitchen.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "The Mediterranean Dish",
    baseUrl: "https://www.themediterraneandish.com",
    searchUrl: "https://www.themediterraneandish.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "Once Upon a Chef",
    baseUrl: "https://www.onceuponachef.com",
    searchUrl: "https://www.onceuponachef.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "Ambitious Kitchen",
    baseUrl: "https://www.ambitiouskitchen.com",
    searchUrl: "https://www.ambitiouskitchen.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "Two Peas & Their Pod",
    baseUrl: "https://www.twopeasandtheirpod.com",
    searchUrl: "https://www.twopeasandtheirpod.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },

  // Additional sources that are less likely to be blocked
  {
    name: "The Kitchn",
    baseUrl: "https://www.thekitchn.com",
    searchUrl: "https://www.thekitchn.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "Delish",
    baseUrl: "https://www.delish.com",
    searchUrl: "https://www.delish.com/cooking/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 3
  },
  {
    name: "Food52",
    baseUrl: "https://food52.com",
    searchUrl: "https://food52.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "Yummly",
    baseUrl: "https://www.yummly.com",
    searchUrl: "https://www.yummly.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 3
  },
  {
    name: "Eating Well",
    baseUrl: "https://www.eatingwell.com",
    searchUrl: "https://www.eatingwell.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  },
  {
    name: "Real Simple",
    baseUrl: "https://www.realsimple.com",
    searchUrl: "https://www.realsimple.com/food-recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 3
  },
  {
    name: "MyRecipes",
    baseUrl: "https://www.myrecipes.com",
    searchUrl: "https://www.myrecipes.com/recipes/",
    recipeSelector: "a[href*='recipe']",
    maxPages: 4
  }
];

interface CrawlJob {
  source: string;
  urls: string[];
  processed: number;
  total: number;
  startTime: Date;
  status: 'running' | 'completed' | 'failed';
}

class RecipeCrawler {
  private activeCrawlJobs: Map<string, CrawlJob> = new Map();
  private adaptiveRateLimiter = new AdaptiveRateLimiter();
  private urlCache = new BoundedUrlCache();
  private maxConcurrentJobs = 12; // Increased for better throughput
  private autoCrawlInterval: NodeJS.Timeout | null = null;
  private isAutoCrawlEnabled = true;

  // Per-domain rate limiting for protected sites (track last request time)
  private domainLastRequest: Map<string, number> = new Map();
  private protectedSiteDelay = 8000; // 8 seconds between requests to same protected domain
  
  // Configurable crawl schedule (in milliseconds)
  // Default: 6 hours (21600000ms) - good balance for recipe sites
  // Can be overridden via CRAWL_INTERVAL_MS environment variable
  // Common values:
  //   - 1 hour: 3600000
  //   - 6 hours: 21600000 (recommended)
  //   - 12 hours: 43200000
  //   - 24 hours (nightly): 86400000
  private getCrawlInterval(): number {
    const envInterval = process.env.CRAWL_INTERVAL_MS;
    if (envInterval) {
      const parsed = parseInt(envInterval, 10);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    // Default: 6 hours (good balance for recipe aggregation)
    return 6 * 60 * 60 * 1000;
  }
  
  // Check if current time is within "off-peak" hours (2 AM - 6 AM)
  // This helps avoid peak traffic times and reduces server load
  private isOffPeakHours(): boolean {
    const hour = new Date().getHours();
    return hour >= 2 && hour < 6;
  }
  private urlCooldownPeriod = 2 * 60 * 60 * 1000; // 2 hours for successful crawls
  private failedUrlCooldownPeriod = 15 * 60 * 1000; // 15 minutes for failed crawls
  private maxSourcesPerCrawl = 12; // Increased for more variety

  /**
   * Human-like scraping for protected sites (AllRecipes, Food Network, etc.)
   * Strategy: Be slow, patient, and don't try to trick the system
   * - Wait 8+ seconds between requests to same domain
   * - Use realistic browser headers
   * - Establish session by visiting homepage first (if needed)
   */
  private async humanLikeScrape(url: string, domain: string): Promise<string | null> {
    try {
      // Respect per-domain rate limiting
      const lastRequest = this.domainLastRequest.get(domain) || 0;
      const elapsed = Date.now() - lastRequest;

      if (elapsed < this.protectedSiteDelay) {
        const waitTime = this.protectedSiteDelay - elapsed;
        console.log(`Waiting ${Math.round(waitTime / 1000)}s for ${domain} rate limit...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      // Add human-like random jitter (0-3 seconds)
      const jitter = Math.random() * 3000;
      await new Promise(resolve => setTimeout(resolve, jitter));

      // Update last request time
      this.domainLastRequest.set(domain, Date.now());

      // Use realistic Chrome headers
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
      };

      const response = await axios.get(url, {
        headers,
        timeout: 45000, // Longer timeout for slow sites
        maxRedirects: 10,
        validateStatus: (status) => status < 500, // Accept 4xx to analyze what went wrong
      });

      // Check if we got blocked
      if (response.status === 403 || response.status === 429) {
        console.log(`Protected site returned ${response.status} - increasing delay`);
        this.protectedSiteDelay = Math.min(this.protectedSiteDelay * 1.5, 30000); // Max 30s delay
        return null;
      }

      if (response.status === 200) {
        // Success! We can try being slightly faster next time
        this.protectedSiteDelay = Math.max(this.protectedSiteDelay * 0.95, 5000); // Min 5s delay
        return response.data;
      }

      return null;
    } catch (error: any) {
      console.error(`Human-like scrape failed for ${url}:`, error.message);
      return null;
    }
  }

  async startCrawling(cuisineType: string = "popular"): Promise<string> {
    const jobId = `crawl-${Date.now()}`;

    // Discover recipe URLs from multiple sources
    const urls = await this.discoverRecipeUrls(cuisineType);

    const job: CrawlJob = {
      source: cuisineType,
      urls,
      processed: 0,
      total: urls.length,
      startTime: new Date(),
      status: 'running'
    };

    this.activeCrawlJobs.set(jobId, job);

    // Start processing in background with error handling
    this.processUrlsInBackground(jobId, urls).catch(error => {
      console.error(`Crawl job ${jobId} failed:`, error instanceof Error ? error.message : error);
      const job = this.activeCrawlJobs.get(jobId);
      if (job) {
        job.status = 'failed';
      }
      // Don't let background job errors propagate
    });

    return jobId;
  }

  async getCrawlStatus(jobId: string): Promise<CrawlJob | null> {
    return this.activeCrawlJobs.get(jobId) || null;
  }

  async getAllCrawlJobs(): Promise<CrawlJob[]> {
    return Array.from(this.activeCrawlJobs.values());
  }

  // Method to clear URL tracking for debugging
  clearUrlCache(): void {
    this.urlCache.clear();
    console.log('URL tracking cache cleared');
  }

  // Auto-crawling functionality
  // Production-ready scheduling: Configurable intervals with off-peak awareness
  startAutoCrawling(): void {
    if (this.autoCrawlInterval) {
      clearInterval(this.autoCrawlInterval);
    }

    const crawlInterval = this.getCrawlInterval();
    const intervalHours = crawlInterval / (60 * 60 * 1000);
    
    console.log(`Starting automatic recipe crawling...`);
    console.log(`Crawl interval: ${intervalHours} hours (${crawlInterval}ms)`);
    console.log(`Configure via CRAWL_INTERVAL_MS env var (in milliseconds)`);
    console.log(`Recommended: 21600000 (6h), 43200000 (12h), or 86400000 (24h/nightly)`);
    
    this.isAutoCrawlEnabled = true;

    // Clear some old URL cache to allow fresh attempts
    this.cleanupCrawledUrls();

    // Start initial crawl immediately (only if off-peak or CRAWL_IMMEDIATE=true)
    const shouldCrawlImmediately = process.env.CRAWL_IMMEDIATE === 'true' || this.isOffPeakHours();
    
    if (shouldCrawlImmediately) {
      console.log('Starting initial crawl (off-peak hours or CRAWL_IMMEDIATE=true)...');
      this.startCrawling('popular').catch((error) => {
        console.error('Error in initial crawl:', error instanceof Error ? error.message : error);
      });
    } else {
      console.log('Skipping initial crawl (peak hours). Will start on next scheduled interval.');
    }

    // Schedule crawling at configured interval
    this.autoCrawlInterval = setInterval(() => {
      if (this.isAutoCrawlEnabled) {
        const hasActiveJobs = Array.from(this.activeCrawlJobs.values())
          .some(job => job.status === 'running');

        if (!hasActiveJobs) {
          // Prefer off-peak hours, but allow if CRAWL_ANYTIME=true
          const shouldRun = process.env.CRAWL_ANYTIME === 'true' || this.isOffPeakHours();
          
          if (shouldRun) {
            this.cleanupCrawledUrls();
            console.log(`Starting scheduled crawl (interval: ${intervalHours}h)...`);
            this.startCrawling('popular').catch((error) => {
              console.error('Error in scheduled crawl:', error instanceof Error ? error.message : error);
            });
          } else {
            console.log('Skipping scheduled crawl (peak hours). Set CRAWL_ANYTIME=true to override.');
          }
        } else {
          console.log('Skipping scheduled crawl - job already running');
        }
      }
    }, crawlInterval);
  }

  stopAutoCrawling(): void {
    console.log('Stopping automatic recipe crawling...');
    this.isAutoCrawlEnabled = false;
    if (this.autoCrawlInterval) {
      clearInterval(this.autoCrawlInterval);
      this.autoCrawlInterval = null;
    }
  }

  isAutoCrawlRunning(): boolean {
    return this.isAutoCrawlEnabled;
  }

  getActiveJobCount(): number {
    return Array.from(this.activeCrawlJobs.values())
      .filter(job => job.status === 'running').length;
  }

  async crawlYouTubeVideos(): Promise<void> {
    try {
      console.log('Discovering cooking videos on YouTube...');
      const videos = await youtubeCrawler.discoverCookingVideos(20); // Increased for more video content

      if (videos.length > 0) {
        console.log(`Found ${videos.length} cooking videos, processing for recipes...`);
        const recipesAdded = await youtubeCrawler.processVideosForRecipes(videos);
        console.log(`Added ${recipesAdded} recipes from YouTube videos`);
      } else {
        console.log('No cooking videos found on YouTube');
      }
    } catch (error) {
      console.error('Error crawling YouTube videos:', error);
    }
  }

  private async discoverRecipeUrls(cuisineType: string): Promise<string[]> {
    // KISS: Use prioritized sources, limit to top N
    const sourcesToCrawl = PRIORITIZED_SOURCES
      .sort((a, b) => a.priority - b.priority)
      .slice(0, this.maxSourcesPerCrawl);

    // Performance: Discover in parallel with concurrency limit
    const allUrls: string[] = [];
    const concurrency = 6; // Process 6 sources at a time for better throughput
    
    for (let i = 0; i < sourcesToCrawl.length; i += concurrency) {
      const batch = sourcesToCrawl.slice(i, i + concurrency);
      
      const results = await Promise.allSettled(
        batch.map(async (source) => {
          try {
            const urls = await this.discoverFromSource(source, cuisineType);
            return urls.slice(0, 15); // Limit per source
          } catch (error) {
            console.error(`Failed to discover from ${source.name}:`, error);
            return [];
          }
        })
      );

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          allUrls.push(...result.value);
        }
      });

      // Adaptive rate limiting between batches
      if (i + concurrency < sourcesToCrawl.length) {
        await this.delay(this.adaptiveRateLimiter.getDelay());
      }
    }

    // Remove duplicates
    const uniqueUrls = Array.from(new Set(allUrls));
    
    // Performance: Batch check for existing recipes (with error handling)
    let existingUrls: Set<string>;
    try {
      existingUrls = await batchCheckRecipes(uniqueUrls);
    } catch (error) {
      console.error('Error in batch check, proceeding without duplicate check:', error);
      // If batch check fails, proceed without filtering (less efficient but won't crash)
      existingUrls = new Set();
    }
    
    const newUrls = uniqueUrls.filter(url => !existingUrls.has(url));
    console.log(`Discovered ${newUrls.length} new recipes (${existingUrls.size} already exist)`);
    return newUrls;
  }

  private async discoverFromSource(source: any, cuisineType: string): Promise<string[]> {
    const urls: string[] = [];

    try {
      // For now, just discover from main recipe pages
      const response = await axios.get(source.searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Referer': source.baseUrl,
        },
        timeout: 15000,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);

      $(source.recipeSelector).each((_, element) => {
        const href = $(element).attr('href');
        if (href) {
          const fullUrl = href.startsWith('http') ? href : `${source.baseUrl}${href}`;

          // Skip URLs in cooldown period
          const cooldownPeriod = this.urlCache.get(fullUrl)?.success 
            ? this.urlCooldownPeriod 
            : this.failedUrlCooldownPeriod;
          
          if (this.urlCache.shouldSkip(fullUrl, cooldownPeriod)) {
            return;
          }

          // Filter out collection/category pages
          if (this.isCollectionPage(fullUrl)) {
            return;
          }

          urls.push(fullUrl);
        }
      });

    } catch (error) {
      console.error(`Error discovering from ${source.name}:`, error);
    }

    return urls.slice(0, 40); // Return up to 40 fresh URLs per source
  }

  private async processUrlsInBackground(jobId: string, urls: string[]): Promise<void> {
    const job = this.activeCrawlJobs.get(jobId);
    if (!job) return;

    const batchSize = 20; // Increased batch size for better throughput

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const delay = this.adaptiveRateLimiter.getDelay();

      // Process batch with adaptive rate limiting
      const promises = batch.map((url, index) =>
        this.processUrlWithDelay(url, index * (delay / batchSize))
      );

      const results = await Promise.allSettled(promises);
      
      // Update rate limiter based on results
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          this.adaptiveRateLimiter.recordSuccess();
        } else {
          this.adaptiveRateLimiter.recordFailure();
        }
      });

      // Update job progress
      job.processed = Math.min(i + batchSize, urls.length);

      // Adaptive rate limiting between batches
      await this.delay(delay);
    }

    job.status = 'completed';
    console.log(`Crawl job ${jobId} completed. Processed ${job.processed}/${job.total} URLs.`);
  }

  private async processUrlWithDelay(url: string, delay: number): Promise<void> {
    await this.delay(delay);

    try {
      await this.scrapeAndStoreRecipe(url);
    } catch (error) {
      console.error(`Failed to process ${url}:`, error);
    }
  }

  private async scrapeAndStoreRecipe(url: string): Promise<void> {
    // Extract domain for tracking
    const domain = new URL(url).hostname.replace('www.', '');

    try {
      // Check if URL was already crawled (database check for persistence)
      const alreadyCrawled = await storage.isUrlCrawled(url);
      if (alreadyCrawled) {
        console.log(`URL already crawled (from DB): ${url}`);
        this.urlCache.set(url, true);
        return;
      }

      // Performance: Use efficient duplicate check
      const existing = await storage.getRecipeBySource(url);
      if (existing) {
        console.log(`Recipe already exists: ${url}`);
        this.urlCache.set(url, true);
        await storage.markUrlCrawled(url, domain, true, existing.id);
        this.adaptiveRateLimiter.recordSuccess();
        return;
      }

      console.log(`Scraping recipe: ${url}`);

      // Check if this is a protected site that needs human-like pacing
      const isProtectedSite = domain.includes('allrecipes') ||
        domain.includes('foodnetwork') ||
        domain.includes('bonappetit') ||
        domain.includes('epicurious');

      let htmlContent: string | null = null;

      if (isProtectedSite) {
        // Human-like approach: slow and patient, no tricks
        console.log(`Using human-speed scraping for protected site: ${domain}`);
        htmlContent = await this.humanLikeScrape(url, domain);
      }

      // Standard approach for non-protected sites
      if (!htmlContent) {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'Cache-Control': 'max-age=0',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
              'Sec-Fetch-Dest': 'document',
              'Sec-Fetch-Mode': 'navigate',
              'Sec-Fetch-Site': 'none',
              'Sec-Fetch-User': '?1',
            },
            timeout: 30000,
            maxRedirects: 5
          });
          htmlContent = response.data;
        } catch (axiosError) {
          // If Axios fails on a protected site, try Playwright as last resort
          if (isProtectedSite) {
            console.log(`Axios failed for ${url}, retrying with Playwright...`);
            htmlContent = await playwrightCrawler.scrapePage(url);
          } else {
            throw axiosError;
          }
        }
      }

      if (!htmlContent) {
        throw new Error('Failed to retrieve page content');
      }

      const $ = cheerio.load(htmlContent);

      // Use the same extraction logic from routes.ts
      let recipeData = this.extractJSONLD($);

      if (!recipeData) {
        recipeData = this.extractMicrodata($);
      }

      if (!recipeData) {
        recipeData = this.extractHeuristic($, url);
      }

      if (!recipeData) {
        this.urlCache.set(url, false);
        await storage.markUrlCrawled(url, domain, false, undefined, 'No recipe data found');
        this.adaptiveRateLimiter.recordFailure();
        return;
      }

      // Check if this is a collection/roundup title
      if (this.isCollectionTitle(recipeData.title)) {
        console.log(`Found collection page: ${recipeData.title} - extracting individual recipes`);
        await this.extractRecipesFromCollection(url, $);
        this.urlCache.set(url, true);
        await storage.markUrlCrawled(url, domain, true, undefined, 'Collection page processed');
        return;
      }

      // Validate recipe has meaningful ingredients
      if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
        this.urlCache.set(url, false);
        await storage.markUrlCrawled(url, domain, false, undefined, 'No ingredients found');
        this.adaptiveRateLimiter.recordFailure();
        return;
      }

      // Check if ingredients are meaningful (not just empty strings, too short, or placeholders)
      const meaningfulIngredients = recipeData.ingredients.filter((ing: string) =>
        ing &&
        ing.trim().length > 3 &&
        !ing.toLowerCase().includes('n/a') &&
        !ing.toLowerCase().includes('tbd') &&
        !ing.toLowerCase().includes('see description') &&
        !ing.toLowerCase().includes('varies') &&
        !/^\d+$/.test(ing.trim()) // Not just a number
      );

      if (meaningfulIngredients.length === 0) {
        this.urlCache.set(url, false);
        await storage.markUrlCrawled(url, domain, false, undefined, 'No meaningful ingredients');
        this.adaptiveRateLimiter.recordFailure();
        return;
      }

      // Auto-assign tags based on content analysis
      const autoTags = this.generateAutoTags(recipeData.title, meaningfulIngredients, recipeData.instructions || []);

      // Mark as auto-scraped with enhanced metadata
      const recipeWithMetadata = {
        title: recipeData.title,
        ingredients: JSON.stringify(meaningfulIngredients),
        directions: JSON.stringify(recipeData.instructions || []),
        source: url,
        imageUrl: recipeData.images && recipeData.images.length > 0 ? recipeData.images[0] : null,
        isAutoScraped: 1,

        // Enhanced tagging
        category: autoTags.category,
        cuisine: autoTags.cuisine,
        difficulty: autoTags.difficulty,
        prepTimeMinutes: recipeData.prepTime,
        cookTimeMinutes: recipeData.cookTime,
        totalTimeMinutes: recipeData.totalTime,
        servings: recipeData.servings,
        dietaryRestrictions: autoTags.dietaryRestrictions.length > 0 ? JSON.stringify(autoTags.dietaryRestrictions) : null,
        tags: autoTags.tags.length > 0 ? JSON.stringify(autoTags.tags) : null,
      };

      // Validate and store
      const validatedRecipe = insertRecipeSchema.parse(recipeWithMetadata);
      const savedRecipe = await storage.createRecipe(validatedRecipe);

      // Mark as successful in both cache and database
      this.urlCache.set(url, true);
      await storage.markUrlCrawled(url, domain, true, savedRecipe.id);
      this.adaptiveRateLimiter.recordSuccess();

      console.log(`Successfully scraped and stored: ${recipeData.title}`);

    } catch (error: any) {
      // Handle different types of errors
      let errorMessage = 'Unknown error';
      if (error.response && error.response.status === 403) {
        errorMessage = 'Access denied (403) - site blocking bots';
        console.log(`Access denied (403) for ${url} - site may be blocking bots`);
      } else if (error.response && error.response.status === 404) {
        errorMessage = 'Page not found (404)';
        console.log(`Page not found (404) for ${url}`);
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Timeout';
        console.log(`Timeout for ${url}`);
      } else {
        errorMessage = error.message || 'Unknown error';
        console.error(`Error scraping ${url}:`, error.message || error);
      }
      // Mark as failed in both cache and database
      this.urlCache.set(url, false);
      await storage.markUrlCrawled(url, domain, false, undefined, errorMessage);
      this.adaptiveRateLimiter.recordFailure();
    }
  }

  // Extraction methods (copied from routes.ts)
  private extractJSONLD($: cheerio.CheerioAPI) {
    const scripts = $('script[type="application/ld+json"]');

    for (let i = 0; i < scripts.length; i++) {
      try {
        const jsonData = JSON.parse($(scripts[i]).html() || '');
        const recipe = this.findRecipeInJSON(jsonData);
        if (recipe) return recipe;
      } catch (e) {
        continue;
      }
    }
    return null;
  }

  private findRecipeInJSON(data: any): any {
    if (Array.isArray(data)) {
      for (const item of data) {
        const recipe = this.findRecipeInJSON(item);
        if (recipe) return recipe;
      }
    } else if (data && typeof data === 'object') {
      if (data['@type'] === 'Recipe' || data.type === 'Recipe') {
        return this.parseJSONLDRecipe(data);
      }
      for (const key in data) {
        const recipe = this.findRecipeInJSON(data[key]);
        if (recipe) return recipe;
      }
    }
    return null;
  }

  private parseJSONLDRecipe(recipe: any) {
    const ingredients = Array.isArray(recipe.recipeIngredient)
      ? recipe.recipeIngredient.map((ing: any) => {
          const text = typeof ing === 'string' ? ing : (ing.text || ing.name || String(ing));
          return HtmlSanitizer.stripHtml(text);
        }).filter(Boolean)
      : [];

    const instructions = Array.isArray(recipe.recipeInstructions)
      ? recipe.recipeInstructions.map((inst: any) => {
          const text = typeof inst === 'string' ? inst : (inst.text || inst.name || String(inst));
          return HtmlSanitizer.stripHtml(text);
        }).filter(Boolean)
      : [];

    const images = [];
    if (recipe.image) {
      if (Array.isArray(recipe.image)) {
        images.push(...recipe.image.slice(0, 2).map((img: any) =>
          typeof img === 'string' ? img : img.url || img.contentUrl || String(img)
        ));
      } else {
        images.push(typeof recipe.image === 'string' ? recipe.image : recipe.image.url || recipe.image.contentUrl || String(recipe.image));
      }
    }

    return {
      title: recipe.name || 'Untitled Recipe',
      ingredients: ingredients.filter(Boolean),
      instructions: instructions.filter(Boolean),
      prepTime: this.parseTime(recipe.prepTime),
      cookTime: this.parseTime(recipe.cookTime),
      totalTime: this.parseTime(recipe.totalTime),
      servings: parseInt(recipe.recipeYield) || parseInt(recipe.yield) || null,
      images: images.filter(Boolean).slice(0, 2),
      sourceUrl: recipe.url || '',
      sourceName: recipe.author?.name || recipe.publisher?.name || ''
    };
  }

  private extractMicrodata($: cheerio.CheerioAPI) {
    const recipeEl = $('[itemtype*="Recipe"]').first();
    if (!recipeEl.length) return null;

    const title = recipeEl.find('[itemprop="name"]').first().text().trim() || 'Untitled Recipe';

    const ingredients: string[] = [];
    recipeEl.find('[itemprop="recipeIngredient"]').each((_, el) => {
      const ingredient = $(el).text().trim();
      if (ingredient) ingredients.push(ingredient);
    });

    const instructions: string[] = [];
    recipeEl.find('[itemprop="recipeInstructions"]').each((_, el) => {
      const instruction = $(el).text().trim();
      if (instruction) instructions.push(instruction);
    });

    const images: string[] = [];
    recipeEl.find('[itemprop="image"]').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('content');
      if (src && images.length < 2) images.push(src);
    });

    return {
      title,
      ingredients,
      instructions,
      prepTime: this.parseTime(recipeEl.find('[itemprop="prepTime"]').attr('datetime') || ''),
      cookTime: this.parseTime(recipeEl.find('[itemprop="cookTime"]').attr('datetime') || ''),
      totalTime: this.parseTime(recipeEl.find('[itemprop="totalTime"]').attr('datetime') || ''),
      servings: parseInt(recipeEl.find('[itemprop="recipeYield"]').text()) || null,
      images,
      sourceUrl: '',
      sourceName: ''
    };
  }

  private extractHeuristic($: cheerio.CheerioAPI, url: string) {
    const title = $('h1').first().text().trim() ||
      $('title').text().trim() ||
      'Untitled Recipe';

    const ingredients: string[] = [];
    const ingredientSelectors = [
      '.ingredients li',
      '.recipe-ingredients li',
      '.ingredient',
      '[class*="ingredient"] li'
    ];

    for (const selector of ingredientSelectors) {
      $(selector).each((_, el) => {
        const ingredient = $(el).text().trim();
        if (ingredient && ingredient.length > 2) {
          ingredients.push(ingredient);
        }
      });
      if (ingredients.length > 0) break;
    }

    const instructions: string[] = [];
    const instructionSelectors = [
      '.instructions li',
      '.recipe-instructions li',
      '.instruction',
      '[class*="instruction"] li',
      '.directions li',
      '.method li'
    ];

    for (const selector of instructionSelectors) {
      $(selector).each((_, el) => {
        const instruction = $(el).text().trim();
        if (instruction && instruction.length > 5) {
          instructions.push(instruction);
        }
      });
      if (instructions.length > 0) break;
    }

    const images: string[] = [];
    $('img').each((_, el) => {
      const src = $(el).attr('src');
      const alt = $(el).attr('alt') || '';
      if (src && (alt.toLowerCase().includes('recipe') || alt.toLowerCase().includes('food'))) {
        if (images.length < 2) {
          images.push(src.startsWith('http') ? src : new URL(src, url).href);
        }
      }
    });

    if (ingredients.length === 0 && instructions.length === 0) {
      return null;
    }

    return {
      title,
      ingredients,
      instructions,
      prepTime: null,
      cookTime: null,
      totalTime: null,
      servings: null,
      images,
      sourceUrl: url,
      sourceName: new URL(url).hostname
    };
  }

  private parseTime(timeString: string): number | null {
    if (!timeString) return null;

    const iso8601Match = timeString.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (iso8601Match) {
      const hours = parseInt(iso8601Match[1] || '0');
      const minutes = parseInt(iso8601Match[2] || '0');
      return hours * 60 + minutes;
    }

    const numberMatch = timeString.match(/(\d+)/);
    if (numberMatch) {
      return parseInt(numberMatch[1]);
    }

    return null;
  }

  // Check if URL is a collection/category page that should be skipped
  private isCollectionPage(url: string): boolean {
    const collectionPatterns = [
      '/collection/',
      '/category/',
      '/recipes/$',
      '/recipes-',
      'collections',
      'categories',
      '/search',
      '/tags',
      '/cuisine',
      '/diet',
      '/cold-soup-recipes',
      '/soup-recipes',
      '/vegetarian-recipes',
      '/brunch-recipes',
      '/meal-prep',
      '/best-',
      '/top-',
      '/-ideas'
    ];

    return collectionPatterns.some(pattern => url.toLowerCase().includes(pattern));
  }

  private isCollectionTitle(title: string): boolean {
    const lowerTitle = title.toLowerCase();

    // Check for collection patterns in titles
    const collectionPatterns = [
      /\d+\s+(best|top|favorite|good)\s+.*(recipe|idea|way|thing)/,
      /best\s+.*(recipe|idea)s?\s*$/,
      /(recipe|idea)s?\s+(for|to)\s+/,
      /roundup/,
      /collection/,
      /guide\s+to/,
      /ways\s+to/,
      /things\s+to/,
      /ultimate.*guide/,
      /complete.*guide/,
      /meal\s+prep\s+ideas/,
      /^\d+.*recipes?$/,
      /^\d+.*best/,
      /^\d+.*top/
    ];

    return collectionPatterns.some(pattern => pattern.test(lowerTitle));
  }

  private async extractRecipesFromCollection(collectionUrl: string, $: cheerio.CheerioAPI): Promise<void> {
    try {
      const recipeLinks: string[] = [];
      const baseUrl = new URL(collectionUrl);

      // Look for recipe links using various selectors
      const linkSelectors = [
        'a[href*="recipe"]',
        'a[href*="/recipe/"]',
        'a[href*="/recipes/"]',
        '.recipe-card a',
        '.recipe-link',
        '.recipe-title a',
        'h2 a[href*="recipe"]',
        'h3 a[href*="recipe"]',
        '.entry-title a',
        '.post-title a'
      ];

      for (const selector of linkSelectors) {
        $(selector).each((_, element) => {
          const href = $(element).attr('href');
          if (href) {
            let fullUrl: string;
            try {
              fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;

              // Filter out obvious non-recipe links
              const lowerHref = href.toLowerCase();
              if (!lowerHref.includes('/tag/') &&
                !lowerHref.includes('/category/') &&
                !lowerHref.includes('/author/') &&
                !lowerHref.includes('/search') &&
                !lowerHref.includes('#') &&
                !fullUrl.includes('pinterest.com') &&
                !fullUrl.includes('facebook.com') &&
                !fullUrl.includes('instagram.com') &&
                !fullUrl.includes('youtube.com') &&
                !fullUrl.includes('twitter.com')) {

                // Check if it's actually a recipe URL pattern
                if (lowerHref.includes('recipe') ||
                  lowerHref.match(/\/\d{4}\/\d{2}\//) || // Date pattern
                  lowerHref.includes('/food/') ||
                  lowerHref.includes('/cooking/')) {
                  recipeLinks.push(fullUrl);
                }
              }
            } catch (e) {
              // Skip invalid URLs
              return;
            }
          }
        });

        // If we found links with this selector, we can stop trying others
        if (recipeLinks.length > 0) break;
      }

      // Remove duplicates and limit to reasonable number
      const uniqueLinks = Array.from(new Set(recipeLinks)).slice(0, 50);

      if (uniqueLinks.length > 0) {
        console.log(`Found ${uniqueLinks.length} individual recipes in collection: ${collectionUrl}`);

        // Add these URLs to be processed in background
        const jobId = `collection-extract-${Date.now()}`;
        this.processUrlsInBackground(jobId, uniqueLinks).catch(error => {
          console.error(`Collection extraction job ${jobId} failed:`, error);
        });
      } else {
        console.log(`No individual recipe links found in collection: ${collectionUrl}`);
      }

    } catch (error) {
      console.error(`Error extracting recipes from collection ${collectionUrl}:`, error);
    }
  }

  // Clean up old URLs periodically (BoundedUrlCache handles this automatically, but we can force cleanup)
  private cleanupCrawledUrls(): void {
    // BoundedUrlCache automatically manages size, but we can log stats
    console.log(`URL cache size: ${this.urlCache.size()}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // AI-powered auto-tagging system
  private generateAutoTags(title: string, ingredients: string[], instructions: string[]) {
    const content = `${title} ${ingredients.join(' ')} ${instructions.join(' ')}`.toLowerCase();

    // Auto-detect category
    let category = 'main-course'; // default
    if (content.match(/appetizer|starter|dip|chips|wings/)) category = 'appetizer';
    if (content.match(/dessert|cake|cookie|ice cream|pie|sweet|chocolate/)) category = 'dessert';
    if (content.match(/drink|smoothie|cocktail|juice|tea|coffee/)) category = 'beverage';
    if (content.match(/breakfast|pancake|waffle|oatmeal|cereal/)) category = 'breakfast';
    if (content.match(/soup|broth|bisque|chowder/)) category = 'soup';
    if (content.match(/salad|greens|lettuce/)) category = 'salad';
    if (content.match(/bread|roll|biscuit|muffin/)) category = 'bread';
    if (content.match(/side|accompaniment/)) category = 'side-dish';

    // Auto-detect cuisine
    let cuisine = 'american'; // default
    if (content.match(/pasta|pizza|italian|parmesan|basil/)) cuisine = 'italian';
    if (content.match(/taco|burrito|mexican|salsa|cilantro|lime/)) cuisine = 'mexican';
    if (content.match(/soy sauce|ginger|chinese|stir.fry|rice/)) cuisine = 'chinese';
    if (content.match(/curry|indian|turmeric|cumin|garam masala/)) cuisine = 'indian';
    if (content.match(/sushi|japanese|miso|sake|teriyaki/)) cuisine = 'japanese';
    if (content.match(/thai|coconut milk|fish sauce|lemongrass/)) cuisine = 'thai';
    if (content.match(/french|wine|butter|herb|provence/)) cuisine = 'french';
    if (content.match(/greek|feta|olive|mediterranean|oregano/)) cuisine = 'greek';
    if (content.match(/korean|kimchi|sesame|gochujang/)) cuisine = 'korean';

    // Auto-detect dietary restrictions
    const dietaryRestrictions: string[] = [];
    if (!content.match(/meat|chicken|beef|pork|fish|seafood/)) {
      if (!content.match(/egg|dairy|milk|cheese|butter/)) {
        dietaryRestrictions.push('vegan');
      } else {
        dietaryRestrictions.push('vegetarian');
      }
    }
    if (!content.match(/gluten|flour|wheat|bread/)) dietaryRestrictions.push('gluten-free');
    if (!content.match(/dairy|milk|cheese|butter|cream/)) dietaryRestrictions.push('dairy-free');
    if (content.match(/keto|low.carb/)) dietaryRestrictions.push('keto');
    if (content.match(/paleo/)) dietaryRestrictions.push('paleo');

    // Auto-detect difficulty
    let difficulty = 'easy'; // default
    const stepCount = instructions.length;
    const complexIngredients = ingredients.filter(ing =>
      ing.match(/sauce|marinade|dough|reduction|confit/)
    ).length;

    if (stepCount > 8 || complexIngredients > 3 || content.match(/marinate|overnight|rest|chill/)) {
      difficulty = 'hard';
    } else if (stepCount > 5 || complexIngredients > 1) {
      difficulty = 'medium';
    }

    // Generate content-based tags
    const tags: string[] = [];
    if (content.match(/quick|easy|fast|minutes/)) tags.push('quick');
    if (content.match(/healthy|nutritious|low.fat/)) tags.push('healthy');
    if (content.match(/comfort|hearty|rich/)) tags.push('comfort-food');
    if (content.match(/spicy|hot|pepper|chili/)) tags.push('spicy');
    if (content.match(/sweet|sugar|honey|maple/)) tags.push('sweet');
    if (content.match(/crispy|crunchy|fried/)) tags.push('crispy');
    if (content.match(/creamy|smooth|rich/)) tags.push('creamy');
    if (content.match(/fresh|raw|cold/)) tags.push('fresh');
    if (content.match(/baked|roasted|oven/)) tags.push('baked');
    if (content.match(/grilled|bbq|barbecue/)) tags.push('grilled');

    return {
      category,
      cuisine,
      difficulty,
      dietaryRestrictions,
      tags
    };
  }
}

export const recipeCrawler = new RecipeCrawler();