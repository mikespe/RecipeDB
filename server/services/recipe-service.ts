/**
 * Recipe service - Centralized business logic for recipe operations
 * Follows Single Responsibility Principle and DRY
 */
import { storage } from "../storage";
import { insertRecipeSchema, type Recipe } from "@shared/schema";
import { UrlUtils } from "./url-utils";
import { RecipeValidator } from "./recipe-validator";
import { EnhancedScraper } from "./enhanced-scraper";
import { RegexExtractor } from "./regex-extractor";
import * as cheerio from "cheerio";
import axios from "axios";

export interface ScrapedRecipeData {
  title: string;
  ingredients: string[];
  directions: string[];
  source: string;
  imageUrl?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  servings?: number;
  category?: string;
  cuisine?: string;
  tags?: string[];
}

export class RecipeService {
  private static readonly REQUEST_TIMEOUT = 20000;
  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];

  private static getRandomUserAgent(): string {
    return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
  }

  private static getRandomDelay(): number {
    return Math.random() * 2000 + 1000; // 1-3 seconds
  }

  /**
   * Check if recipe already exists by URL
   */
  static async findExistingRecipe(url: string): Promise<Recipe | null> {
    const allRecipes = await storage.getAllRecipes();

    // For YouTube URLs, check by video ID
    if (UrlUtils.isYouTubeUrl(url)) {
      const videoId = UrlUtils.extractYouTubeVideoId(url);
      if (!videoId) return null;
      
      return allRecipes.find(recipe => {
        if (!recipe.source) return false;
        const existingVideoId = UrlUtils.extractYouTubeVideoId(recipe.source);
        return existingVideoId === videoId;
      }) || null;
    }

    // For regular URLs, check exact match
    return allRecipes.find(recipe => recipe.source === url) || null;
  }

  /**
   * Create and save a recipe to database
   */
  static async createRecipe(recipeData: ScrapedRecipeData): Promise<Recipe> {
    const normalizedData = RecipeValidator.normalizeRecipeData(recipeData);
    if (!normalizedData) {
      throw new Error("Invalid recipe data");
    }

    const dbRecipe = {
      title: normalizedData.title,
      ingredients: JSON.stringify(normalizedData.ingredients),
      directions: JSON.stringify(normalizedData.directions),
      source: normalizedData.source || "",
      imageUrl: normalizedData.imageUrl,
      isAutoScraped: 0,
      prepTimeMinutes: normalizedData.prepTimeMinutes,
      cookTimeMinutes: normalizedData.cookTimeMinutes,
      totalTimeMinutes: normalizedData.totalTimeMinutes,
      servings: typeof normalizedData.servings === 'number' && !isNaN(normalizedData.servings) ? normalizedData.servings : undefined,
      category: normalizedData.category,
      cuisine: normalizedData.cuisine,
      tags: normalizedData.tags ? JSON.stringify(normalizedData.tags) : null
    };

    const validatedRecipe = insertRecipeSchema.parse(dbRecipe);
    return await storage.createRecipe(validatedRecipe);
  }

  /**
   * Enhanced multi-strategy scraper with improved content extraction
   */
  static async scrapeWebsiteRecipe(url: string): Promise<ScrapedRecipeData | null> {
    console.log(`Starting enhanced scraping for: ${url}`);
    
    // Strategy 1: Enhanced scraping with multiple extraction methods
    try {
      console.log('Attempting enhanced scraping with advanced content extraction...');
      const result = await EnhancedScraper.scrapeWithEnhancements(url, {
        usePlaywright: false, // Start with static scraping
        persistCookies: true,
        useProxyRotation: false,
        maxRetries: 1,
        timeout: 30000
      });
      
      if (result) {
        console.log('Enhanced scraping successful!');
        return result;
      }
    } catch (error) {
      console.log('Enhanced scraping failed, trying traditional methods:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    const domain = new URL(url).hostname.toLowerCase();
    
    // Strategy 2: Use specialized anti-bot strategies for blocked sites
    if (domain.includes('allrecipes.com') || domain.includes('foodnetwork.com')) {
      console.log(`Detected blocked site: ${domain} - deploying advanced anti-bot strategies`);
      return await this.scrapeBlockedSite(url);
    }

    // Strategy 3: Traditional progressive strategies
    const strategies = [
      this.strategicScrapeStandard.bind(this),
      this.strategicScrapeMobile.bind(this),
      this.strategicScrapeSimple.bind(this),
      this.strategicScrapeFirefox.bind(this),
      this.strategicScrapeSafari.bind(this)
    ];

    console.log(`Trying traditional scraping strategies for: ${url}`);
    
    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`Attempting strategy ${i + 1}/${strategies.length}...`);
        
        // Random delay between strategies
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, this.getRandomDelay()));
        }
        
        const result = await strategies[i](url);
        if (result) {
          console.log(`Success with strategy ${i + 1}`);
          return result;
        }
      } catch (error) {
        console.log(`Strategy ${i + 1} failed:`, error instanceof Error ? error.message : 'Unknown error');
        
        // If it's a definitive error (like 404), don't try other strategies
        if (error instanceof Error && error.message.includes('not found')) {
          throw error;
        }
        
        // Continue to next strategy for other errors
        continue;
      }
    }

    throw new Error("This website may have anti-bot protection or the recipe format is not supported. Try recipes from sites like Delish, NY Times Cooking, or other major recipe sites.");
  }

  /**
   * Strategy 1: Standard modern browser headers
   */
  private static async strategicScrapeStandard(url: string): Promise<ScrapedRecipeData | null> {
    await new Promise(resolve => setTimeout(resolve, this.getRandomDelay()));
    
    const response = await axios.get(url, {
      timeout: this.REQUEST_TIMEOUT,
      headers: {
        'User-Agent': this.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Google Chrome";v="120", "Chromium";v="120", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Connection': 'keep-alive',
      },
      maxRedirects: 15,
      validateStatus: (status) => status < 500,
    });

    return this.processResponse(response, url);
  }

  /**
   * Strategy 2: Mobile browser simulation
   */
  private static async strategicScrapeMobile(url: string): Promise<ScrapedRecipeData | null> {
    await new Promise(resolve => setTimeout(resolve, this.getRandomDelay()));
    
    const response = await axios.get(url, {
      timeout: this.REQUEST_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      maxRedirects: 10,
      validateStatus: (status) => status < 500,
    });

    return this.processResponse(response, url);
  }

  /**
   * Strategy 3: Minimal headers (older browser simulation)
   */
  private static async strategicScrapeSimple(url: string): Promise<ScrapedRecipeData | null> {
    await new Promise(resolve => setTimeout(resolve, this.getRandomDelay()));
    
    const response = await axios.get(url, {
      timeout: this.REQUEST_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'en-US',
        'Connection': 'keep-alive',
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });

    return this.processResponse(response, url);
  }

  /**
   * Strategy 4: Firefox simulation with referrer
   */
  private static async strategicScrapeFirefox(url: string): Promise<ScrapedRecipeData | null> {
    await new Promise(resolve => setTimeout(resolve, this.getRandomDelay()));
    
    const response = await axios.get(url, {
      timeout: this.REQUEST_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
      },
      maxRedirects: 10,
      validateStatus: (status) => status < 500,
    });

    return this.processResponse(response, url);
  }

  /**
   * Strategy 5: Safari simulation with different referrer
   */
  private static async strategicScrapeSafari(url: string): Promise<ScrapedRecipeData | null> {
    await new Promise(resolve => setTimeout(resolve, this.getRandomDelay()));
    
    const response = await axios.get(url, {
      timeout: this.REQUEST_TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.pinterest.com/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      maxRedirects: 8,
      validateStatus: (status) => status < 500,
    });

    return this.processResponse(response, url);
  }

  /**
   * Specialized scraper for heavily protected sites (AllRecipes, Food Network)
   */
  private static async scrapeBlockedSite(url: string): Promise<ScrapedRecipeData | null> {
    const domain = new URL(url).hostname.toLowerCase();
    console.log(`Using specialized anti-bot techniques for: ${domain}`);

    // Special handling for AllRecipes with ultimate bypass system
    if (domain.includes('allrecipes.com')) {
      try {
        console.log('🔥 DEPLOYING ALLRECIPES ULTIMATE BYPASS SYSTEM');
        const { AllRecipesBypass } = await import('./allrecipes-bypass.js');
        const extractedData = await AllRecipesBypass.attemptBypass(url);
        
        if (extractedData) {
          console.log('🎉 ALLRECIPES BREAKTHROUGH ACHIEVED!');
          return {
            title: extractedData.title,
            ingredients: extractedData.ingredients,
            directions: extractedData.directions,
            source: url,
            imageUrl: extractedData.imageUrl,
            prepTimeMinutes: extractedData.prepTime,
            cookTimeMinutes: extractedData.cookTime,
            servings: extractedData.servings
          };
        }
      } catch (error) {
        console.log('❌ AllRecipes ultimate bypass failed:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    const advancedStrategies = [
      this.strategicScrapeBrowserEmulation.bind(this),
      this.strategicScrapeSessionSimulation.bind(this),
      this.strategicScrapeResidentialProxy.bind(this),
      this.strategicScrapeGoogleBot.bind(this),
      this.strategicScrapeCrawlerBypass.bind(this)
    ];

    for (let i = 0; i < advancedStrategies.length; i++) {
      try {
        console.log(`Attempting advanced anti-bot strategy ${i + 1}/${advancedStrategies.length}...`);
        
        // Longer delays for suspicious sites
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
        }
        
        const result = await advancedStrategies[i](url);
        if (result) {
          console.log(`Success with advanced strategy ${i + 1} on ${domain}`);
          return result;
        }
      } catch (error) {
        console.log(`Advanced strategy ${i + 1} failed:`, error instanceof Error ? error.message : 'Unknown error');
        continue;
      }
    }

    // Final attempt with most aggressive technique
    try {
      console.log(`Attempting final ultra-advanced bypass technique...`);
      const result = await this.strategicScrapeUltimateBypass(url);
      if (result) {
        console.log(`SUCCESS: Ultra-advanced bypass worked for ${domain}`);
        return result;
      }
    } catch (error) {
      console.log(`Ultra-advanced bypass failed:`, error instanceof Error ? error.message : 'Unknown error');
    }

    // Final desperate attempt: Zero-footprint request
    try {
      console.log(`Attempting zero-footprint bypass...`);
      const result = await this.strategicScrapeZeroFootprint(url);
      if (result) {
        console.log(`SUCCESS: Zero-footprint bypass worked for ${domain}`);
        return result;
      }
    } catch (error) {
      console.log(`Zero-footprint bypass failed:`, error instanceof Error ? error.message : 'Unknown error');
    }

    // Last resort: Enhanced scraping with browser automation
    try {
      console.log(`Attempting enhanced scraping with browser automation...`);
      const result = await EnhancedScraper.scrapeWithEnhancements(url, {
        usePlaywright: true,
        persistCookies: true,
        useProxyRotation: false,
        maxRetries: 1,
        timeout: 45000
      });
      
      if (result) {
        console.log(`SUCCESS: Enhanced scraping worked for ${domain}`);
        return result;
      }
    } catch (error) {
      console.log(`Enhanced scraping failed:`, error instanceof Error ? error.message : 'Unknown error');
    }

    // If all advanced strategies fail
    if (domain.includes('allrecipes.com')) {
      throw new Error("AllRecipes has extremely sophisticated anti-bot protection. Even our most advanced bypass techniques including browser automation cannot penetrate their current security measures. Try Delish, NY Times Cooking, or King Arthur Baking instead.");
    } else if (domain.includes('foodnetwork.com')) {
      throw new Error("Food Network has implemented enterprise-grade bot detection that blocks all automated access attempts including browser automation. Try Delish, NY Times Cooking, or BBC Good Food instead.");
    }
    
    throw new Error("Unable to bypass advanced anti-bot protection on this site even with browser automation");
  }

  /**
   * Strategy: Full browser emulation with realistic browsing patterns
   */
  private static async strategicScrapeBrowserEmulation(url: string): Promise<ScrapedRecipeData | null> {
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Referer': 'https://www.google.com/search?q=recipe',
        'Connection': 'keep-alive',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'DNT': '1',
      },
      maxRedirects: 15,
      validateStatus: (status) => status < 500,
    });

    return this.processResponse(response, url);
  }

  /**
   * Strategy: Session simulation with multiple requests
   */
  private static async strategicScrapeSessionSimulation(url: string): Promise<ScrapedRecipeData | null> {
    const baseUrl = new URL(url).origin;
    
    // Step 1: Visit homepage first
    try {
      await axios.get(baseUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      });
      
      // Wait to simulate human browsing
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));
    } catch (error) {
      // Continue even if homepage fails
    }

    // Step 2: Visit recipe page
    const response = await axios.get(url, {
      timeout: 25000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': baseUrl,
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
      },
      maxRedirects: 12,
      validateStatus: (status) => status < 500,
    });

    return this.processResponse(response, url);
  }

  /**
   * Strategy: Residential proxy simulation
   */
  private static async strategicScrapeResidentialProxy(url: string): Promise<ScrapedRecipeData | null> {
    await new Promise(resolve => setTimeout(resolve, 4000 + Math.random() * 3000));
    
    const response = await axios.get(url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.7,es;q=0.3',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.bing.com/',
        'Connection': 'keep-alive',
        'Cookie': 'session_id=' + Math.random().toString(36).substring(2, 15),
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'X-Forwarded-For': this.generateRandomIP(),
        'X-Real-IP': this.generateRandomIP(),
      },
      maxRedirects: 8,
      validateStatus: (status) => status < 500,
    });

    return this.processResponse(response, url);
  }

  /**
   * Strategy: GoogleBot user agent (often whitelisted)
   */
  private static async strategicScrapeGoogleBot(url: string): Promise<ScrapedRecipeData | null> {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });

    return this.processResponse(response, url);
  }

  /**
   * Strategy: Search engine crawler bypass
   */
  private static async strategicScrapeCrawlerBypass(url: string): Promise<ScrapedRecipeData | null> {
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'From': 'bingbot(at)microsoft.com',
      },
      maxRedirects: 3,
      validateStatus: (status) => status < 500,
    });

    return this.processResponse(response, url);
  }

  /**
   * Ultimate bypass: Kitchen sink approach with maximum stealth
   */
  private static async strategicScrapeUltimateBypass(url: string): Promise<ScrapedRecipeData | null> {
    console.log(`Deploying ultimate stealth bypass for: ${url}`);
    
    // Ultra-long human-like delay
    await new Promise(resolve => setTimeout(resolve, 8000 + Math.random() * 5000));
    
    const ultimateHeaders = {
      'User-Agent': this.getRandomUltimateUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
      'Accept-Language': 'en-US,en;q=0.9,es;q=0.8,fr;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Referer': this.getRandomReferer(),
      'Origin': new URL(url).origin,
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Sec-Ch-Ua': '"Google Chrome";v="121", "Not:A-Brand";v="99", "Chromium";v="121"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'DNT': '1',
      'Cookie': this.generateRealisticCookies(url),
      'X-Forwarded-For': this.generateRandomIP(),
      'X-Real-IP': this.generateRandomIP(),
      'X-Originating-IP': this.generateRandomIP(),
      'CF-IPCountry': 'US',
      'CF-RAY': this.generateCloudflareRay(),
      'CF-Visitor': '{"scheme":"https"}',
    };

    try {
      const response = await axios.get(url, {
        timeout: 35000,
        headers: ultimateHeaders,
        maxRedirects: 20,
        validateStatus: (status) => status < 500,
        // Simulate slow connection
        onDownloadProgress: (progressEvent) => {
          // Simulate realistic download progress
        }
      });

      return this.processResponse(response, url);
    } catch (error) {
      // If that fails, try with minimal headers (sometimes works)
      console.log('Full stealth failed, trying minimal approach...');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const minimalResponse = await axios.get(url, {
        timeout: 20000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });

      return this.processResponse(minimalResponse, url);
    }
  }

  /**
   * Generate ultra-realistic user agents
   */
  private static getRandomUltimateUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Generate random realistic referers
   */
  private static getRandomReferer(): string {
    const referers = [
      'https://www.google.com/search?q=chocolate+chip+cookie+recipe',
      'https://www.bing.com/search?q=best+cookie+recipe',
      'https://duckduckgo.com/?q=homemade+cookies',
      'https://www.pinterest.com/search/pins/?q=cookie%20recipe',
      'https://www.facebook.com/',
      'https://www.reddit.com/r/Cooking/',
    ];
    return referers[Math.floor(Math.random() * referers.length)];
  }

  /**
   * Generate realistic cookie strings
   */
  private static generateRealisticCookies(url: string): string {
    const domain = new URL(url).hostname;
    const sessionId = Math.random().toString(36).substring(2, 15);
    const userId = Math.random().toString(36).substring(2, 10);
    
    return [
      `session_id=${sessionId}`,
      `user_id=${userId}`,
      `_ga=GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000)}`,
      `_gid=GA1.2.${Math.floor(Math.random() * 1000000000)}.${Math.floor(Date.now() / 1000)}`,
      `visited=${Date.now()}`,
      `preferences=theme=light;lang=en`,
      `csrf_token=${Math.random().toString(36).substring(2, 25)}`,
    ].join('; ');
  }

  /**
   * Generate fake Cloudflare Ray ID
   */
  private static generateCloudflareRay(): string {
    const chars = '0123456789abcdef';
    let ray = '';
    for (let i = 0; i < 16; i++) {
      ray += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${ray}-ORD`;
  }

  /**
   * Zero-footprint bypass: Absolute minimal request
   */
  private static async strategicScrapeZeroFootprint(url: string): Promise<ScrapedRecipeData | null> {
    console.log(`Deploying zero-footprint bypass for: ${url}`);
    
    // Minimal delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'curl/7.68.0',
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 500,
    });

    return this.processResponse(response, url);
  }

  /**
   * Generate random IP for proxy simulation
   */
  private static generateRandomIP(): string {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  /**
   * Process the response from any strategy
   */
  private static processResponse(response: any, url: string): ScrapedRecipeData | null {
    if (response.status !== 200) {
      console.log(`Failed to fetch ${url}: Status ${response.status}`);
      
      if (response.status === 403) {
        throw new Error("Access denied by website protection");
      } else if (response.status === 404) {
        throw new Error("Recipe page not found. Please check the URL and try again.");
      } else if (response.status === 429) {
        throw new Error("Rate limited - too many requests");
      } else {
        throw new Error(`HTTP ${response.status} - Unable to access website`);
      }
    }

    const $ = cheerio.load(response.data);
    return this.extractRecipeFromHtml($, url);
  }

  /**
   * Enhanced recipe extraction with multiple fallback methods
   */
  private static extractRecipeFromHtml($: cheerio.CheerioAPI, url: string): ScrapedRecipeData | null {
    // Method 1: JSON-LD structured data (highest success rate)
    const jsonLdRecipe = this.extractFromJsonLd($);
    if (jsonLdRecipe && this.isValidRecipe(jsonLdRecipe)) {
      console.log('Successfully extracted using JSON-LD');
      return { ...jsonLdRecipe, source: url };
    }

    // Method 2: Microdata (good fallback)
    const microdataRecipe = this.extractFromMicrodata($);
    if (microdataRecipe && this.isValidRecipe(microdataRecipe)) {
      console.log('Successfully extracted using microdata');
      return { ...microdataRecipe, source: url };
    }

    // Method 3: Enhanced regex pattern extraction
    const regexRecipe = RegexExtractor.extractRecipeWithPatterns($, url);
    if (regexRecipe && this.isValidRecipe(regexRecipe)) {
      console.log('Successfully extracted using regex patterns');
      return regexRecipe;
    }

    // Method 4: Manual extraction (basic fallback)
    const manualResult = this.extractManually($, url);
    if (manualResult && this.isValidRecipe(manualResult)) {
      console.log('Successfully extracted using manual extraction');
      return manualResult;
    }

    console.log('All extraction methods failed');
    throw new Error("This page doesn't appear to contain a recipe, or the recipe format is not supported. Please try a different recipe URL.");
  }

  /**
   * Validate if extracted recipe has minimum required fields
   */
  private static isValidRecipe(recipe: Partial<ScrapedRecipeData>): boolean {
    return !!(
      recipe.title && 
      recipe.ingredients && 
      recipe.ingredients.length >= 2 && 
      recipe.directions && 
      recipe.directions.length >= 1
    );
  }

  /**
   * Extract recipe from JSON-LD structured data
   */
  private static extractFromJsonLd($: cheerio.CheerioAPI): Omit<ScrapedRecipeData, 'source'> | null {
    try {
      const scripts = $('script[type="application/ld+json"]');
      
      for (let i = 0; i < scripts.length; i++) {
        const script = $(scripts[i]);
        const jsonText = script.html();
        if (!jsonText) continue;

        try {
          const data = JSON.parse(jsonText);
          const recipes = Array.isArray(data) ? data : [data];

          for (const item of recipes) {
            if (item['@type'] === 'Recipe' || item.type === 'Recipe') {
              return this.parseJsonLdRecipe(item);
            }
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      console.log('Error extracting JSON-LD:', error instanceof Error ? error.message : 'Unknown error');
    }
    return null;
  }

  private static parseJsonLdRecipe(recipe: any): Omit<ScrapedRecipeData, 'source'> | null {
    try {
      const ingredients = Array.isArray(recipe.recipeIngredient) 
        ? recipe.recipeIngredient.map((ing: any) => typeof ing === 'string' ? ing : ing.text || '').filter(Boolean)
        : [];

      const directions = Array.isArray(recipe.recipeInstructions)
        ? recipe.recipeInstructions.map((inst: any) => {
            if (typeof inst === 'string') return inst;
            return inst.text || inst.name || '';
          }).filter(Boolean)
        : [];

      if (!recipe.name || ingredients.length === 0 || directions.length === 0) {
        return null;
      }

      return {
        title: recipe.name,
        ingredients,
        directions,
        imageUrl: (() => {
          const image = recipe.image;
          if (!image) return undefined;
          if (typeof image === 'string') return image;
          if (Array.isArray(image) && image.length > 0) {
            return typeof image[0] === 'string' ? image[0] : image[0]?.url || undefined;
          }
          return image.url || image.contentUrl || undefined;
        })(),
        prepTimeMinutes: this.parseTime(recipe.prepTime),
        cookTimeMinutes: this.parseTime(recipe.cookTime),
        totalTimeMinutes: this.parseTime(recipe.totalTime),
        servings: (() => {
          if (!recipe.recipeYield) return undefined;
          const parsed = parseInt(recipe.recipeYield);
          return isNaN(parsed) ? undefined : parsed;
        })(),
        category: (() => {
          const cat = recipe.recipeCategory;
          if (!cat) return undefined;
          if (typeof cat === 'string') return cat;
          if (Array.isArray(cat) && cat.length > 0) return typeof cat[0] === 'string' ? cat[0] : undefined;
          return undefined;
        })(),
        cuisine: (() => {
          const cui = recipe.recipeCuisine;
          if (!cui) return undefined;
          if (typeof cui === 'string') return cui;
          if (Array.isArray(cui) && cui.length > 0) return typeof cui[0] === 'string' ? cui[0] : undefined;
          return undefined;
        })(),
        tags: recipe.keywords ? (Array.isArray(recipe.keywords) ? recipe.keywords : [recipe.keywords]) : undefined
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract recipe from microdata
   */
  private static extractFromMicrodata($: cheerio.CheerioAPI): Omit<ScrapedRecipeData, 'source'> | null {
    const recipe = $('[itemtype*="schema.org/Recipe"]').first();
    if (recipe.length === 0) return null;

    try {
      const title = recipe.find('[itemprop="name"]').first().text().trim();
      const ingredients = recipe.find('[itemprop="recipeIngredient"]').map((_, el) => $(el).text().trim()).get().filter(Boolean);
      const directions = recipe.find('[itemprop="recipeInstructions"]').map((_, el) => $(el).text().trim()).get().filter(Boolean);

      if (!title || ingredients.length === 0 || directions.length === 0) {
        return null;
      }

      return {
        title,
        ingredients,
        directions,
        imageUrl: recipe.find('[itemprop="image"]').attr('src') || undefined,
        prepTimeMinutes: this.parseTime(recipe.find('[itemprop="prepTime"]').attr('datetime') || ''),
        cookTimeMinutes: this.parseTime(recipe.find('[itemprop="cookTime"]').attr('datetime') || ''),
        totalTimeMinutes: this.parseTime(recipe.find('[itemprop="totalTime"]').attr('datetime') || ''),
        servings: (() => {
          const yieldText = recipe.find('[itemprop="recipeYield"]').text();
          if (!yieldText) return undefined;
          const parsed = parseInt(yieldText);
          return isNaN(parsed) ? undefined : parsed;
        })()
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Manual extraction as fallback
   */
  private static extractManually($: cheerio.CheerioAPI, url: string): ScrapedRecipeData | null {
    const title = $('h1').first().text().trim() || 
                 $('.recipe-title').first().text().trim() ||
                 $('[class*="title"]').first().text().trim();

    if (!title) return null;

    const ingredients: string[] = [];
    const directions: string[] = [];

    // Try various selectors for ingredients
    $('.recipe-ingredients li, .ingredients li, [class*="ingredient"] li').each((_, el) => {
      const text = $(el).text().trim();
      if (text && !ingredients.includes(text)) {
        ingredients.push(text);
      }
    });

    // Try various selectors for directions
    $('.recipe-instructions li, .instructions li, [class*="instruction"] li, .directions li').each((_, el) => {
      const text = $(el).text().trim();
      if (text && !directions.includes(text)) {
        directions.push(text);
      }
    });

    if (ingredients.length === 0 || directions.length === 0) {
      return null;
    }

    return {
      title,
      ingredients,
      directions,
      source: url,
      imageUrl: $('img[src*="recipe"], .recipe-image img').first().attr('src') || undefined
    };
  }

  /**
   * Process HTML content with enhanced extraction
   */
  static async processHtmlContent(htmlContent: string, url: string): Promise<ScrapedRecipeData | null> {
    try {
      const $ = cheerio.load(htmlContent);
      return this.extractRecipeFromHtml($, url);
    } catch (error) {
      console.error('HTML processing error:', error);
      return null;
    }
  }

  /**
   * Parse time string to minutes
   */
  private static parseTime(timeStr: string): number | undefined {
    if (!timeStr) return undefined;
    
    // Parse ISO 8601 duration (PT15M, PT1H30M, etc.)
    const isoMatch = timeStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (isoMatch) {
      const hours = parseInt(isoMatch[1] || '0');
      const minutes = parseInt(isoMatch[2] || '0');
      return hours * 60 + minutes;
    }

    // Parse simple numbers
    const numberMatch = timeStr.match(/(\d+)/);
    if (numberMatch) {
      return parseInt(numberMatch[1]);
    }

    return undefined;
  }
}