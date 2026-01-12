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
import { HtmlSanitizer } from "./html-sanitizer";
import { SCRAPING_STRATEGIES, ADVANCED_STRATEGIES, StrategyExecutor, ScrapingUtils } from "./scraping-strategies";
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
   * Uses consolidated strategy executor for DRY code
   */
  static async scrapeWebsiteRecipe(url: string): Promise<ScrapedRecipeData | null> {
    console.log(`Starting enhanced scraping for: ${url}`);

    // Strategy 1: Enhanced scraping with multiple extraction methods
    try {
      console.log('Attempting enhanced scraping with advanced content extraction...');
      const result = await EnhancedScraper.scrapeWithEnhancements(url, {
        usePlaywright: false,
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

    // Strategy 3: Execute consolidated strategies sequentially
    console.log(`Trying consolidated scraping strategies for: ${url}`);
    const result = await StrategyExecutor.executeSequential(
      url,
      SCRAPING_STRATEGIES.slice(0, 5), // Use first 5 standard strategies
      this.processResponse.bind(this)
    );

    if (result) return result;

    throw new Error("This website may have anti-bot protection or the recipe format is not supported. Try recipes from sites like Delish, NY Times Cooking, or other major recipe sites.");
  }

  /**
   * Specialized scraper for heavily protected sites (AllRecipes, Food Network)
   * Uses consolidated advanced strategies
   */
  private static async scrapeBlockedSite(url: string): Promise<ScrapedRecipeData | null> {
    const domain = new URL(url).hostname.toLowerCase();
    console.log(`Using specialized anti-bot techniques for: ${domain}`);

    // Special handling for AllRecipes with ultimate bypass system
    if (domain.includes('allrecipes.com')) {
      try {
        console.log('Deploying AllRecipes bypass system');
        const { AllRecipesBypass } = await import('./allrecipes-bypass.js');
        const extractedData = await AllRecipesBypass.attemptBypass(url);

        if (extractedData) {
          console.log('AllRecipes bypass succeeded');
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
        console.log('AllRecipes bypass failed:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Try advanced strategies using consolidated executor
    console.log('Trying advanced anti-bot strategies...');
    const advancedResult = await StrategyExecutor.executeSequential(
      url,
      [...ADVANCED_STRATEGIES, ...SCRAPING_STRATEGIES.slice(5)], // Advanced + bot strategies
      this.processResponse.bind(this)
    );

    if (advancedResult) return advancedResult;

    // Ultimate bypass with full stealth headers
    try {
      console.log('Attempting ultimate stealth bypass...');
      await new Promise(resolve => setTimeout(resolve, ScrapingUtils.getRandomDelay(8000, 13000)));

      const response = await axios.get(url, {
        timeout: 35000,
        headers: StrategyExecutor.getUltimateBypassHeaders(url),
        maxRedirects: 20,
        validateStatus: (status) => status < 500,
      });

      const result = this.processResponse(response, url);
      if (result) {
        console.log('Ultimate stealth bypass succeeded');
        return result;
      }
    } catch (error) {
      console.log('Ultimate stealth bypass failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Last resort: Enhanced scraping with browser automation
    try {
      console.log('Attempting browser automation...');
      const result = await EnhancedScraper.scrapeWithEnhancements(url, {
        usePlaywright: true,
        persistCookies: true,
        useProxyRotation: false,
        maxRetries: 1,
        timeout: 45000
      });

      if (result) {
        console.log('Browser automation succeeded');
        return result;
      }
    } catch (error) {
      console.log('Browser automation failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Domain-specific error messages
    if (domain.includes('allrecipes.com')) {
      throw new Error("AllRecipes has sophisticated anti-bot protection. Try Delish, NY Times Cooking, or King Arthur Baking instead.");
    } else if (domain.includes('foodnetwork.com')) {
      throw new Error("Food Network has enterprise-grade bot detection. Try Delish, NY Times Cooking, or BBC Good Food instead.");
    }

    throw new Error("Unable to bypass anti-bot protection on this site");
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
        ? recipe.recipeIngredient.map((ing: any) => {
            const text = typeof ing === 'string' ? ing : (ing.text || '');
            return HtmlSanitizer.stripHtml(text);
          }).filter(Boolean)
        : [];

      const directions = Array.isArray(recipe.recipeInstructions)
        ? recipe.recipeInstructions.map((inst: any) => {
            const text = typeof inst === 'string' ? inst : (inst.text || inst.name || '');
            return HtmlSanitizer.stripHtml(text);
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