/**
 * Enhanced web scraping service with browser automation and advanced techniques
 * Implements missing features from industry best practices analysis
 */
import { chromium, Browser, Page } from 'playwright';
import { CookieJar } from 'tough-cookie';
import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedRecipeData } from './recipe-service';

interface ScrapingConfig {
  usePlaywright?: boolean;
  useProxyRotation?: boolean;
  persistCookies?: boolean;
  maxRetries?: number;
  timeout?: number;
}

export class EnhancedScraper {
  private static browser: Browser | null = null;
  private static cookieJar = new CookieJar();
  
  // Proxy rotation pool (would be external service in production)
  private static readonly PROXY_POOL = [
    // In production, these would be real proxy servers
    { host: '127.0.0.1', port: 8080, enabled: false },
    // Add more proxies as needed
  ];

  /**
   * Main enhanced scraping method with fallback strategies
   */
  static async scrapeWithEnhancements(
    url: string, 
    config: ScrapingConfig = {}
  ): Promise<ScrapedRecipeData | null> {
    const {
      usePlaywright = false,
      useProxyRotation = false,
      persistCookies = true,
      maxRetries = 3,
      timeout = 30000
    } = config;

    // Strategy 1: Try Playwright for dynamic content
    if (usePlaywright) {
      try {
        console.log('Attempting Playwright scraping for dynamic content...');
        const result = await this.scrapeWithPlaywright(url, timeout);
        if (result) return result;
      } catch (error) {
        console.log('Playwright scraping failed:', error instanceof Error ? error.message : 'Unknown error');
      }
    }

    // Strategy 2: Enhanced static scraping with cookies and proxies
    try {
      console.log('Attempting enhanced static scraping...');
      return await this.scrapeWithEnhancedStatic(url, {
        useProxyRotation,
        persistCookies,
        maxRetries,
        timeout
      });
    } catch (error) {
      console.log('Enhanced static scraping failed:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Browser automation scraping for JavaScript-heavy sites
   */
  private static async scrapeWithPlaywright(url: string, timeout: number): Promise<ScrapedRecipeData | null> {
    let page: Page | null = null;
    
    try {
      // Initialize browser if needed
      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        });
      }

      page = await this.browser.newPage();
      
      // Set realistic viewport and user agent
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.context().addInitScript(() => {
        Object.defineProperty(navigator, 'userAgent', {
          get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
      });

      // Add extra headers to appear more realistic
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1',
      });

      // Navigate with timeout
      await page.goto(url, { 
        waitUntil: 'networkidle', 
        timeout 
      });

      // Wait for potential recipe content to load
      try {
        await page.waitForSelector('script[type="application/ld+json"], [itemtype*="Recipe"], .recipe, #recipe', { 
          timeout: 5000 
        });
      } catch {
        // Continue if no specific selectors found
      }

      // Get the fully rendered HTML
      const html = await page.content();
      const $ = cheerio.load(html);

      // Extract recipe using existing methods
      return this.extractRecipeFromDom($, url);

    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Enhanced static scraping with cookies, proxies, and advanced patterns
   */
  private static async scrapeWithEnhancedStatic(
    url: string, 
    config: Partial<ScrapingConfig>
  ): Promise<ScrapedRecipeData | null> {
    const requestConfig: AxiosRequestConfig = {
      timeout: config.timeout || 30000,
      maxRedirects: 10,
      validateStatus: (status) => status < 500,
    };

    // Add realistic headers
    requestConfig.headers = {
      'User-Agent': this.getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'max-age=0',
      'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Connection': 'keep-alive',
    };

    // Add cookies if persistence is enabled
    if (config.persistCookies) {
      const cookies = await this.cookieJar.getCookieString(url);
      if (cookies) {
        requestConfig.headers['Cookie'] = cookies;
      }
    }

    // Add proxy if rotation is enabled
    if (config.useProxyRotation) {
      const proxy = this.getRandomProxy();
      if (proxy && proxy.enabled) {
        // In production, configure actual proxy here
        requestConfig.headers['X-Forwarded-For'] = this.generateRandomIP();
      }
    }

    // Add random delay
    await this.randomDelay(1000, 3000);

    const response = await axios.get(url, requestConfig);

    // Store cookies for future requests
    if (config.persistCookies && response.headers['set-cookie']) {
      for (const cookie of response.headers['set-cookie']) {
        await this.cookieJar.setCookie(cookie, url);
      }
    }

    const $ = cheerio.load(response.data);
    return this.extractRecipeFromDom($, url);
  }

  /**
   * Enhanced recipe extraction with multiple fallback methods
   */
  private static extractRecipeFromDom($: cheerio.CheerioAPI, url: string): ScrapedRecipeData | null {
    // Method 1: JSON-LD structured data (highest priority)
    const jsonLdRecipe = this.extractFromJsonLd($);
    if (jsonLdRecipe && this.isValidRecipe(jsonLdRecipe)) {
      return { ...jsonLdRecipe, source: url };
    }

    // Method 2: Microdata
    const microdataRecipe = this.extractFromMicrodata($);
    if (microdataRecipe && this.isValidRecipe(microdataRecipe)) {
      return { ...microdataRecipe, source: url };
    }

    // Method 3: Enhanced pattern matching with regex
    const regexRecipe = this.extractWithRegexPatterns($, url);
    if (regexRecipe && this.isValidRecipe(regexRecipe)) {
      return regexRecipe;
    }

    // Method 4: XPath-like advanced selectors
    const advancedRecipe = this.extractWithAdvancedSelectors($, url);
    if (advancedRecipe && this.isValidRecipe(advancedRecipe)) {
      return advancedRecipe;
    }

    // Method 5: AI-powered content analysis (fallback)
    const aiRecipe = this.extractWithContentAnalysis($, url);
    if (aiRecipe && this.isValidRecipe(aiRecipe)) {
      return aiRecipe;
    }

    return null;
  }

  /**
   * Extract using regex patterns for unstructured content
   */
  private static extractWithRegexPatterns($: cheerio.CheerioAPI, url: string): ScrapedRecipeData | null {
    const html = $.html();
    const text = $.text();

    try {
      // Title patterns
      const titlePatterns = [
        /<h1[^>]*>([^<]+recipe[^<]*)<\/h1>/i,
        /<title>([^<]*recipe[^<]*)<\/title>/i,
        /recipe[^\n]*:([^\n]+)/i
      ];

      let title = '';
      for (const pattern of titlePatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          title = match[1].trim();
          break;
        }
      }

      // Ingredient patterns
      const ingredientPatterns = [
        /ingredients?\s*:?\s*\n((?:[-•*]\s*[^\n]+\n?)+)/gi,
        /(?:ingredients?|what you need)[^:]*:?\s*\n((?:[^\n]+\n?)+?)(?:\n\s*\n|instructions?|directions?|method)/gi,
        /<li[^>]*>[^<]*(?:cup|tablespoon|teaspoon|pound|ounce|gram)[^<]*<\/li>/gi
      ];

      const ingredients: string[] = [];
      for (const pattern of ingredientPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const lines = match.split('\n').filter(line => line.trim());
            lines.forEach(line => {
              const cleaned = line.replace(/^[-•*]\s*/, '').trim();
              if (cleaned && cleaned.length > 3) {
                ingredients.push(cleaned);
              }
            });
          });
        }
      }

      // Directions patterns
      const directionPatterns = [
        /(?:instructions?|directions?|method)[^:]*:?\s*\n((?:\d+\.\s*[^\n]+\n?)+)/gi,
        /(?:instructions?|directions?|method)[^:]*:?\s*\n((?:[-•*]\s*[^\n]+\n?)+)/gi
      ];

      const directions: string[] = [];
      for (const pattern of directionPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const lines = match.split('\n').filter(line => line.trim());
            lines.forEach(line => {
              const cleaned = line.replace(/^\d+\.\s*|^[-•*]\s*/, '').trim();
              if (cleaned && cleaned.length > 10) {
                directions.push(cleaned);
              }
            });
          });
        }
      }

      // Image extraction with better patterns
      const imageUrl = this.extractBestImage($);

      if (title && ingredients.length > 0 && directions.length > 0) {
        return {
          title,
          ingredients: Array.from(new Set(ingredients)), // Remove duplicates
          directions: Array.from(new Set(directions)),
          imageUrl,
          source: url
        };
      }

    } catch (error) {
      console.log('Regex extraction error:', error);
    }

    return null;
  }

  /**
   * Advanced CSS selectors (XPath-like functionality)
   */
  private static extractWithAdvancedSelectors($: cheerio.CheerioAPI, url: string): ScrapedRecipeData | null {
    try {
      // Advanced title selectors
      const titleSelectors = [
        'h1:contains("recipe")',
        '[class*="recipe"] h1, [id*="recipe"] h1',
        'h1[class*="title"], h2[class*="title"]',
        '.entry-title, .post-title, .recipe-title'
      ];

      let title = '';
      for (const selector of titleSelectors) {
        const element = $(selector).first();
        if (element.length && element.text().trim()) {
          title = element.text().trim();
          break;
        }
      }

      // Advanced ingredient selectors
      const ingredientSelectors = [
        '.recipe-ingredient, .ingredient',
        '[class*="ingredient"] li, [id*="ingredient"] li',
        'ul:has(li:contains("cup")) li, ul:has(li:contains("tablespoon")) li',
        '.ingredients li, #ingredients li'
      ];

      const ingredients: string[] = [];
      for (const selector of ingredientSelectors) {
        $(selector).each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 3 && this.looksLikeIngredient(text)) {
            ingredients.push(text);
          }
        });
        if (ingredients.length > 0) break;
      }

      // Advanced direction selectors
      const directionSelectors = [
        '.recipe-instruction, .instruction, .step',
        '[class*="instruction"] li, [id*="instruction"] li',
        '.directions li, #directions li, .method li',
        'ol li:contains(".")'
      ];

      const directions: string[] = [];
      for (const selector of directionSelectors) {
        $(selector).each((_, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 10) {
            directions.push(text);
          }
        });
        if (directions.length > 0) break;
      }

      const imageUrl = this.extractBestImage($);

      if (title && ingredients.length > 0 && directions.length > 0) {
        return {
          title,
          ingredients,
          directions,
          imageUrl,
          source: url
        };
      }

    } catch (error) {
      console.log('Advanced selector extraction error:', error);
    }

    return null;
  }

  /**
   * Enhanced image extraction with quality prioritization
   */
  private static extractBestImage($: cheerio.CheerioAPI): string | undefined {
    const imageSelectors = [
      // High priority: recipe-specific images
      '.recipe-image img, .recipe-photo img',
      '[class*="recipe"] img[src*="recipe"]',
      'img[alt*="recipe"], img[title*="recipe"]',
      // Medium priority: featured images
      '.featured-image img, .hero-image img',
      'img[class*="featured"], img[class*="hero"]',
      // Lower priority: any large images
      'img[width="400"], img[width="500"], img[width="600"]',
      'img[height="300"], img[height="400"], img[height="500"]',
      // Fallback: any content images
      '.content img, .post-content img, article img'
    ];

    for (const selector of imageSelectors) {
      const img = $(selector).first();
      if (img.length) {
        const src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
        if (src && this.isValidImageUrl(src)) {
          return this.normalizeImageUrl(src);
        }
      }
    }

    return undefined;
  }

  /**
   * Content analysis for recipe detection
   */
  private static extractWithContentAnalysis($: cheerio.CheerioAPI, url: string): ScrapedRecipeData | null {
    const text = $.text().toLowerCase();
    
    // Check if this looks like a recipe page
    const recipeKeywords = ['ingredients', 'directions', 'instructions', 'recipe', 'cook', 'bake', 'prep time'];
    const keywordCount = recipeKeywords.filter(keyword => text.includes(keyword)).length;
    
    if (keywordCount < 3) {
      return null; // Doesn't look like a recipe page
    }

    // Extract paragraphs and analyze content
    const paragraphs = $('p').map((_, el) => $(el).text().trim()).get();
    const lists = $('ul, ol').map((_, el) => $(el).text().trim()).get();

    // Find potential ingredients and directions
    const potentialIngredients = this.findIngredientsInText([...paragraphs, ...lists]);
    const potentialDirections = this.findDirectionsInText([...paragraphs, ...lists]);

    if (potentialIngredients.length > 0 && potentialDirections.length > 0) {
      const title = $('h1').first().text().trim() || $('title').text().trim() || 'Extracted Recipe';
      
      return {
        title,
        ingredients: potentialIngredients,
        directions: potentialDirections,
        imageUrl: this.extractBestImage($),
        source: url
      };
    }

    return null;
  }

  // Helper methods
  private static findIngredientsInText(texts: string[]): string[] {
    const ingredients: string[] = [];
    const measurementWords = ['cup', 'cups', 'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons', 'pound', 'pounds', 'ounce', 'ounces', 'gram', 'grams', 'liter', 'liters'];
    
    for (const text of texts) {
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 5 && measurementWords.some(word => trimmed.toLowerCase().includes(word))) {
          ingredients.push(trimmed);
        }
      }
    }
    
    return ingredients.slice(0, 20); // Limit to reasonable number
  }

  private static findDirectionsInText(texts: string[]): string[] {
    const directions: string[] = [];
    const actionWords = ['heat', 'cook', 'bake', 'mix', 'stir', 'add', 'combine', 'place', 'remove', 'serve'];
    
    for (const text of texts) {
      const sentences = text.split(/[.!?]+/);
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length > 20 && actionWords.some(word => trimmed.toLowerCase().includes(word))) {
          directions.push(trimmed);
        }
      }
    }
    
    return directions.slice(0, 15); // Limit to reasonable number
  }

  private static looksLikeIngredient(text: string): boolean {
    const measurementPattern = /\d+\s*(cup|tablespoon|teaspoon|pound|ounce|gram|liter|tsp|tbsp|lb|oz|g|l)/i;
    const ingredientWords = ['flour', 'sugar', 'salt', 'pepper', 'oil', 'butter', 'egg', 'milk', 'water', 'onion', 'garlic'];
    
    return measurementPattern.test(text) || ingredientWords.some(word => text.toLowerCase().includes(word));
  }

  private static isValidImageUrl(src: string): boolean {
    if (!src) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const lowerSrc = src.toLowerCase();
    return imageExtensions.some(ext => lowerSrc.includes(ext)) || lowerSrc.includes('image');
  }

  private static normalizeImageUrl(src: string): string {
    if (src.startsWith('//')) {
      return 'https:' + src;
    }
    if (src.startsWith('/')) {
      // Would need base URL to resolve relative URLs properly
      return src;
    }
    return src;
  }

  private static isValidRecipe(recipe: Partial<ScrapedRecipeData>): boolean {
    return !!(
      recipe.title && 
      recipe.ingredients && 
      recipe.ingredients.length >= 2 && 
      recipe.directions && 
      recipe.directions.length >= 1
    );
  }

  // Existing helper methods from original RecipeService
  private static extractFromJsonLd($: cheerio.CheerioAPI): Omit<ScrapedRecipeData, 'source'> | null {
    // Implementation from original RecipeService
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

  private static parseTime(timeStr: string): number | undefined {
    if (!timeStr) return undefined;
    
    const match = timeStr.match(/PT(\d+H)?(\d+M)?/);
    if (match) {
      const hours = match[1] ? parseInt(match[1]) : 0;
      const minutes = match[2] ? parseInt(match[2]) : 0;
      return hours * 60 + minutes;
    }
    
    const minuteMatch = timeStr.match(/(\d+)\s*min/i);
    if (minuteMatch) {
      return parseInt(minuteMatch[1]);
    }
    
    return undefined;
  }

  private static getRandomUserAgent(): string {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  private static getRandomProxy() {
    return this.PROXY_POOL[Math.floor(Math.random() * this.PROXY_POOL.length)];
  }

  private static generateRandomIP(): string {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  private static async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Cleanup browser resources
   */
  static async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}