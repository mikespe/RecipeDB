/**
 * Enhanced regex-based content extraction for unstructured recipe pages
 * Implements pattern matching techniques from web scraping best practices
 */
import * as cheerio from 'cheerio';
import { ScrapedRecipeData } from './recipe-service';

export class RegexExtractor {
  /**
   * Extract recipe using comprehensive regex patterns
   */
  static extractRecipeWithPatterns($: cheerio.CheerioAPI, url: string): ScrapedRecipeData | null {
    const html = $.html();
    const text = $.text();

    const title = this.extractTitle($, html, text);
    const ingredients = this.extractIngredients($, html, text);
    const directions = this.extractDirections($, html, text);
    const imageUrl = this.extractBestImage($);

    if (title && ingredients.length >= 2 && directions.length >= 1) {
      return {
        title,
        ingredients: Array.from(new Set(ingredients)),
        directions: Array.from(new Set(directions)),
        imageUrl,
        source: url,
        prepTimeMinutes: this.extractTime(text, 'prep'),
        cookTimeMinutes: this.extractTime(text, 'cook'),
        servings: this.extractServings(text)
      };
    }

    return null;
  }

  /**
   * Enhanced title extraction with multiple patterns
   */
  private static extractTitle($: cheerio.CheerioAPI, html: string, text: string): string {
    // Priority 1: Recipe-specific selectors
    const recipeSelectors = [
      'h1[class*="recipe"]',
      'h1[id*="recipe"]',
      '[class*="recipe-title"] h1',
      '[class*="recipe-name"] h1'
    ];

    for (const selector of recipeSelectors) {
      const element = $(selector).first();
      if (element.length && element.text().trim()) {
        return element.text().trim();
      }
    }

    // Priority 2: Standard heading patterns
    const titlePatterns = [
      /<h1[^>]*>([^<]+recipe[^<]*)<\/h1>/i,
      /<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<title>([^<]*recipe[^<]*)<\/title>/i,
      /<h1[^>]*>([^<]{10,80})<\/h1>/i // General h1 with reasonable length
    ];

    for (const pattern of titlePatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const title = match[1].trim();
        if (title.length > 5 && title.length < 100) {
          return title;
        }
      }
    }

    // Priority 3: First h1 element
    const firstH1 = $('h1').first().text().trim();
    if (firstH1 && firstH1.length > 5 && firstH1.length < 100) {
      return firstH1;
    }

    return '';
  }

  /**
   * Advanced ingredient extraction with multiple methods
   */
  private static extractIngredients($: cheerio.CheerioAPI, html: string, text: string): string[] {
    const ingredients: string[] = [];

    // Method 1: Structured list extraction
    const ingredientSelectors = [
      '.recipe-ingredients li, .ingredients li',
      '[class*="ingredient"] li',
      'ul:has(li:contains("cup")) li, ul:has(li:contains("tablespoon")) li',
      'ul:has(li:contains("tsp")) li, ul:has(li:contains("tbsp")) li'
    ];

    for (const selector of ingredientSelectors) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        if (text && this.looksLikeIngredient(text)) {
          ingredients.push(text);
        }
      });
      if (ingredients.length > 0) break;
    }

    // Method 2: Regex patterns for unstructured content
    if (ingredients.length === 0) {
      const ingredientPatterns = [
        // Ingredients section with bullet points
        /ingredients?\s*:?\s*\n((?:[-•*]\s*[^\n]+\n?)+)/gi,
        // Ingredients section followed by instructions
        /(?:ingredients?|what you need)[^:]*:?\s*\n((?:[^\n]+\n?)+?)(?:\n\s*\n|instructions?|directions?|method)/gi,
        // Lines with measurements
        /^.*(?:\d+(?:\/\d+)?\s*(?:cup|tablespoon|teaspoon|pound|ounce|gram|liter|tsp|tbsp|lb|oz|g|l)s?|1\s*(?:large|medium|small)).*$/gmi
      ];

      for (const pattern of ingredientPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const lines = match.split('\n').filter(line => line.trim());
            lines.forEach(line => {
              const cleaned = line.replace(/^[-•*]\s*/, '').trim();
              if (cleaned && cleaned.length > 3 && this.looksLikeIngredient(cleaned)) {
                ingredients.push(cleaned);
              }
            });
          });
        }
      }
    }

    // Method 3: Content analysis for ingredient-like text
    if (ingredients.length === 0) {
      const paragraphs = $('p, div').map((_, el) => $(el).text().trim()).get();
      for (const paragraph of paragraphs) {
        const sentences = paragraph.split(/[.!?]+/);
        for (const sentence of sentences) {
          const trimmed = sentence.trim();
          if (this.looksLikeIngredient(trimmed) && trimmed.length > 5) {
            ingredients.push(trimmed);
          }
        }
      }
    }

    return ingredients.slice(0, 25); // Reasonable limit
  }

  /**
   * Enhanced direction extraction
   */
  private static extractDirections($: cheerio.CheerioAPI, html: string, text: string): string[] {
    const directions: string[] = [];

    // Method 1: Structured list extraction
    const directionSelectors = [
      '.recipe-instructions li, .instructions li, .directions li',
      '[class*="instruction"] li, [class*="direction"] li',
      'ol li, .method li, .steps li',
      '.recipe-method p, .instructions p'
    ];

    for (const selector of directionSelectors) {
      $(selector).each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 10 && this.looksLikeDirection(text)) {
          directions.push(text);
        }
      });
      if (directions.length > 0) break;
    }

    // Method 2: Regex patterns for unstructured content
    if (directions.length === 0) {
      const directionPatterns = [
        // Instructions section with numbered steps
        /(?:instructions?|directions?|method|preparation)[^:]*:?\s*\n((?:\d+\.\s*[^\n]+\n?)+)/gi,
        // Instructions section with bullet points
        /(?:instructions?|directions?|method)[^:]*:?\s*\n((?:[-•*]\s*[^\n]+\n?)+)/gi,
        // Step-by-step patterns
        /step\s*\d+[^:]*:?\s*([^\n]+)/gi
      ];

      for (const pattern of directionPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const lines = match.split('\n').filter(line => line.trim());
            lines.forEach(line => {
              const cleaned = line.replace(/^\d+\.\s*|^[-•*]\s*|^step\s*\d+\s*:?\s*/i, '').trim();
              if (cleaned && cleaned.length > 15 && this.looksLikeDirection(cleaned)) {
                directions.push(cleaned);
              }
            });
          });
        }
      }
    }

    // Method 3: Content analysis for direction-like paragraphs
    if (directions.length === 0) {
      const paragraphs = $('p').map((_, el) => $(el).text().trim()).get();
      for (const paragraph of paragraphs) {
        if (paragraph.length > 20 && this.looksLikeDirection(paragraph)) {
          directions.push(paragraph);
        }
      }
    }

    return directions.slice(0, 20); // Reasonable limit
  }

  /**
   * Enhanced image extraction with quality scoring
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
      // Large images (likely main content)
      'img[width="400"], img[width="500"], img[width="600"]',
      'img[height="300"], img[height="400"], img[height="500"]',
      // Content images
      '.content img, .post-content img, article img',
      // Fallback: any img with reasonable size attributes
      'img[src]'
    ];

    for (const selector of imageSelectors) {
      const images = $(selector);
      for (let i = 0; i < images.length; i++) {
        const img = $(images[i]);
        const src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');

        if (src && this.isValidImageUrl(src)) {
          const score = this.scoreImage(img, src);
          if (score > 0.5) { // Threshold for quality
            return this.normalizeImageUrl(src);
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Score image quality based on attributes and URL
   */
  private static scoreImage(img: cheerio.Cheerio<any>, src: string): number {
    let score = 0.3; // Base score

    // Check dimensions
    const width = parseInt(img.attr('width') || '0');
    const height = parseInt(img.attr('height') || '0');

    if (width >= 300 || height >= 200) score += 0.3;
    if (width >= 500 || height >= 400) score += 0.2;

    // Check alt text and class for recipe relevance
    const alt = (img.attr('alt') || '').toLowerCase();
    const className = (img.attr('class') || '').toLowerCase();

    if (alt.includes('recipe') || className.includes('recipe')) score += 0.4;
    if (alt.includes('food') || className.includes('food')) score += 0.2;

    // Check URL for quality indicators
    const lowerSrc = src.toLowerCase();
    if (lowerSrc.includes('recipe')) score += 0.3;
    if (lowerSrc.includes('food')) score += 0.2;
    if (lowerSrc.includes('thumb') || lowerSrc.includes('small')) score -= 0.3;

    return Math.min(score, 1.0);
  }

  /**
   * Extract cooking times using patterns
   */
  private static extractTime(text: string, type: 'prep' | 'cook'): number | undefined {
    const patterns = [
      new RegExp(`${type}\\s*time[^:]*:?\\s*(\\d+)\\s*(?:minutes?|mins?|m)`, 'i'),
      new RegExp(`${type}[^:]*:?\\s*(\\d+)\\s*(?:minutes?|mins?|m)`, 'i'),
      new RegExp(`(\\d+)\\s*(?:minutes?|mins?|m)\\s*${type}`, 'i')
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const minutes = parseInt(match[1]);
        if (minutes > 0 && minutes < 480) { // Reasonable range (8 hours max)
          return minutes;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract servings count
   */
  private static extractServings(text: string): number | undefined {
    const patterns = [
      /serves?\s*:?\s*(\d+)/i,
      /servings?\s*:?\s*(\d+)/i,
      /makes?\s*:?\s*(\d+)\s*servings?/i,
      /yield\s*:?\s*(\d+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const servings = parseInt(match[1]);
        if (servings > 0 && servings < 50) { // Reasonable range
          return servings;
        }
      }
    }

    return undefined;
  }

  /**
   * Check if text looks like an ingredient
   */
  private static looksLikeIngredient(text: string): boolean {
    const lowerText = text.toLowerCase();

    // Must contain a measurement or common ingredient
    const measurementPattern = /\d+(?:\/\d+)?\s*(?:cup|tablespoon|teaspoon|pound|ounce|gram|liter|tsp|tbsp|lb|oz|g|l|large|medium|small|dash|pinch)s?/i;
    const commonIngredients = ['flour', 'sugar', 'salt', 'pepper', 'oil', 'butter', 'egg', 'milk', 'water', 'onion', 'garlic', 'tomato', 'cheese', 'chicken', 'beef'];

    return measurementPattern.test(text) ||
      commonIngredients.some(ingredient => lowerText.includes(ingredient)) ||
      /\d+\s*(?:large|medium|small)/.test(lowerText);
  }

  /**
   * Check if text looks like a cooking direction
   */
  private static looksLikeDirection(text: string): boolean {
    const actionWords = ['heat', 'cook', 'bake', 'mix', 'stir', 'add', 'combine', 'place', 'remove', 'serve', 'pour', 'chop', 'cut', 'slice', 'season', 'brown', 'sauté', 'simmer', 'boil'];
    const lowerText = text.toLowerCase();

    return actionWords.some(word => lowerText.includes(word)) &&
      text.length > 15 &&
      text.length < 500;
  }

  /**
   * Validate image URL
   */
  private static isValidImageUrl(src: string): boolean {
    if (!src || src.length < 4) return false;

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const lowerSrc = src.toLowerCase();

    return imageExtensions.some(ext => lowerSrc.includes(ext)) ||
      lowerSrc.includes('image') ||
      lowerSrc.includes('photo') ||
      lowerSrc.includes('img');
  }

  /**
   * Normalize image URL to full path
   */
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
}