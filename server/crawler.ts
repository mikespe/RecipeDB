import axios from "axios";
import * as cheerio from "cheerio";
import { storage } from "./storage";
import { insertRecipeSchema } from "@shared/schema";
import { youtubeCrawler } from "./youtube-crawler";

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
  private rateLimitDelay = 1000; // Increased to 1 second to avoid rate limiting
  private maxConcurrentJobs = 4; // Reduced concurrent processing to avoid overwhelming servers
  private autoCrawlInterval: NodeJS.Timeout | null = null;
  private isAutoCrawlEnabled = true;
  private crawledUrls: Map<string, { date: Date, success: boolean }> = new Map(); // Track crawled URLs with success status
  private urlCooldownPeriod = 2 * 60 * 60 * 1000; // Reduced to 2 hours for successful crawls
  private failedUrlCooldownPeriod = 15 * 60 * 1000; // Reduced to 15 minutes for failed crawls

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
    
    // Start processing in background
    this.processUrlsInBackground(jobId, urls).catch(error => {
      console.error(`Crawl job ${jobId} failed:`, error);
      const job = this.activeCrawlJobs.get(jobId);
      if (job) {
        job.status = 'failed';
      }
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
    this.crawledUrls.clear();
    console.log('URL tracking cache cleared');
  }

  // Auto-crawling functionality
  startAutoCrawling(): void {
    if (this.autoCrawlInterval) {
      clearInterval(this.autoCrawlInterval);
    }

    console.log('Starting automatic recipe crawling...');
    this.isAutoCrawlEnabled = true;
    
    // Clear some old URL cache to allow fresh attempts
    this.cleanupCrawledUrls();
    
    // Start initial crawl immediately
    this.startCrawling('popular').catch(console.error);
    
    // Schedule crawling every 5 minutes to be less aggressive
    this.autoCrawlInterval = setInterval(() => {
      if (this.isAutoCrawlEnabled) {
        // Only start new crawl if no active jobs
        const hasActiveJobs = Array.from(this.activeCrawlJobs.values())
          .some(job => job.status === 'running');
        
        if (!hasActiveJobs) {
          // Clean up old URL tracking data
          this.cleanupCrawledUrls();
          
          console.log('Starting scheduled crawl...');
          this.startCrawling('popular').catch(console.error);
          
          // Skip YouTube crawling due to quota issues
          // console.log('Starting YouTube video crawl from cooking channels...');
          // this.crawlYouTubeVideos().catch(console.error);
        } else {
          console.log('Skipping scheduled crawl - job already running');
        }
      }
    }, 5 * 60 * 1000); // 5 minutes - less aggressive crawling interval
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
    const allUrls: string[] = [];
    
    for (const source of RECIPE_SOURCES) {
      try {
        console.log(`Discovering recipes from ${source.name}...`);
        const urls = await this.discoverFromSource(source, cuisineType);
        allUrls.push(...urls.slice(0, 20)); // Reduced to 20 recipes per source to avoid overwhelming servers
        
        // Rate limiting between sources
        await this.delay(this.rateLimitDelay);
      } catch (error) {
        console.error(`Failed to discover from ${source.name}:`, error);
      }
    }

    // Remove duplicates
    return Array.from(new Set(allUrls));
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
          
          // Skip URLs that were recently crawled successfully, or failed recently
          const crawlRecord = this.crawledUrls.get(fullUrl);
          const now = new Date();
          if (crawlRecord) {
            const cooldownPeriod = crawlRecord.success ? this.urlCooldownPeriod : this.failedUrlCooldownPeriod;
            if ((now.getTime() - crawlRecord.date.getTime()) < cooldownPeriod) {
              return; // Skip this URL
            }
          }
          
          // Filter out obvious collection/category pages
          if (this.isCollectionPage(fullUrl)) {
            return; // Skip collection pages
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

    const batchSize = 16; // Process 16 URLs at a time - increased batch size
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      
      // Process batch concurrently but with rate limiting
      const promises = batch.map((url, index) => 
        this.processUrlWithDelay(url, index * (this.rateLimitDelay / batchSize))
      );
      
      await Promise.allSettled(promises);
      
      // Update job progress
      if (job) {
        job.processed = Math.min(i + batchSize, urls.length);
      }
      
      // Rate limiting between batches
      await this.delay(this.rateLimitDelay);
    }

    if (job) {
      job.status = 'completed';
    }

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
    try {
      // Check if recipe already exists (more efficient check by source URL)
      const existingRecipes = await storage.searchRecipes(url);
      if (existingRecipes.some(recipe => recipe.source === url)) {
        console.log(`Recipe already exists: ${url}`);
        // Mark as successfully crawled
        this.crawledUrls.set(url, { date: new Date(), success: true });
        return;
      }

      console.log(`Scraping recipe: ${url}`);
      
      // Fetch the webpage with better headers to avoid blocking
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 20000,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      
      // Use the same extraction logic from routes.ts
      let recipeData = this.extractJSONLD($);
      
      if (!recipeData) {
        recipeData = this.extractMicrodata($);
      }
      
      if (!recipeData) {
        recipeData = this.extractHeuristic($, url);
      }

      if (!recipeData) {
        console.log(`Could not extract recipe data from: ${url}`);
        this.crawledUrls.set(url, { date: new Date(), success: false }); // Mark as failed attempt
        return;
      }

      // Check if this is a collection/roundup title - extract individual recipes instead
      if (this.isCollectionTitle(recipeData.title)) {
        console.log(`Found collection page: ${recipeData.title} - extracting individual recipes`);
        await this.extractRecipesFromCollection(url, $);
        this.crawledUrls.set(url, { date: new Date(), success: true }); // Mark as successfully processed
        return;
      }

      // Validate recipe has meaningful ingredients before storing
      if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
        console.log(`No ingredients found, skipping: ${recipeData.title}`);
        this.crawledUrls.set(url, { date: new Date(), success: false }); // Mark as failed attempt
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
        console.log(`No meaningful ingredients found, skipping: ${recipeData.title}`);
        this.crawledUrls.set(url, { date: new Date(), success: false }); // Mark as failed attempt
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
      await storage.createRecipe(validatedRecipe);
      
      // Mark URL as successfully crawled
      this.crawledUrls.set(url, { date: new Date(), success: true });
      
      console.log(`Successfully scraped and stored: ${recipeData.title}`);
      
    } catch (error: any) {
      // Handle different types of errors
      if (error.response && error.response.status === 403) {
        console.log(`Access denied (403) for ${url} - site may be blocking bots`);
      } else if (error.response && error.response.status === 404) {
        console.log(`Page not found (404) for ${url}`);
      } else if (error.code === 'ECONNABORTED') {
        console.log(`Timeout for ${url}`);
      } else {
        console.error(`Error scraping ${url}:`, error.message || error);
      }
      // Mark as failed attempt - will retry sooner
      this.crawledUrls.set(url, { date: new Date(), success: false });
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
      ? recipe.recipeIngredient.map((ing: any) => typeof ing === 'string' ? ing : ing.text || ing.name || String(ing))
      : [];
      
    const instructions = Array.isArray(recipe.recipeInstructions)
      ? recipe.recipeInstructions.map((inst: any) => {
          if (typeof inst === 'string') return inst;
          return inst.text || inst.name || String(inst);
        })
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

  // Clean up old crawled URLs periodically
  private cleanupCrawledUrls(): void {
    const now = new Date();
    const maxCutoffTime = now.getTime() - (this.urlCooldownPeriod * 3); // Keep successful for 12 hours max
    
    Array.from(this.crawledUrls.entries()).forEach(([url, record]) => {
      const cutoffTime = record.success ? maxCutoffTime : now.getTime() - (this.failedUrlCooldownPeriod * 4);
      if (record.date.getTime() < cutoffTime) {
        this.crawledUrls.delete(url);
      }
    });
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