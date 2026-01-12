/**
 * Recipe Sanitizer Service
 * Automatically validates and fixes incomplete recipe data on startup
 */

import { storage } from "../storage";
import { RecipeService } from "./recipe-service";
import { HtmlSanitizer } from "./html-sanitizer";
import type { Recipe } from "@shared/schema";

interface SanitizationResult {
  totalChecked: number;
  incompleteFound: number;
  fixed: number;
  failed: number;
  details: Array<{
    id: string;
    title: string;
    issues: string[];
    fixed: boolean;
    error?: string;
  }>;
}

interface RecipeIssues {
  missingImage: boolean;
  fewIngredients: boolean;
  fewDirections: boolean;
  noSource: boolean;
  hasHtmlInDirections: boolean;
  hasHtmlInIngredients: boolean;
}

export class RecipeSanitizer {
  private static readonly MIN_INGREDIENTS = 3;
  private static readonly MIN_DIRECTIONS = 2;

  /**
   * Check if text contains HTML tags
   */
  private static containsHtml(text: string): boolean {
    if (!text) return false;
    // Check for common HTML patterns: <tag>, <tag attr="...">, etc.
    return /<[a-zA-Z][^>]*>/i.test(text);
  }

  /**
   * Check a recipe for quality issues
   */
  static analyzeRecipe(recipe: Recipe): RecipeIssues {
    let ingredientCount = 0;
    let directionCount = 0;
    let directionsRaw = '';
    let ingredientsRaw = '';

    // Parse ingredients
    if (recipe.ingredients) {
      try {
        const parsed = JSON.parse(recipe.ingredients);
        ingredientCount = Array.isArray(parsed) ? parsed.filter(i => i && i.trim()).length : 0;
        ingredientsRaw = Array.isArray(parsed) ? parsed.join(' ') : recipe.ingredients;
      } catch {
        ingredientCount = recipe.ingredients.trim() ? 1 : 0;
        ingredientsRaw = recipe.ingredients;
      }
    }

    // Parse directions
    if (recipe.directions) {
      try {
        const parsed = JSON.parse(recipe.directions);
        directionCount = Array.isArray(parsed) ? parsed.filter(d => d && d.trim()).length : 0;
        directionsRaw = Array.isArray(parsed) ? parsed.join(' ') : recipe.directions;
      } catch {
        directionCount = recipe.directions.trim() ? 1 : 0;
        directionsRaw = recipe.directions;
      }
    }

    // Check for valid image URL (not base64, not empty)
    const hasValidImage = !!(
      recipe.imageUrl &&
      recipe.imageUrl.trim() &&
      recipe.imageUrl.startsWith('http')
    );

    // Check for valid source URL
    const hasValidSource = !!(
      recipe.source &&
      recipe.source.startsWith('http')
    );

    return {
      missingImage: !hasValidImage,
      fewIngredients: ingredientCount < this.MIN_INGREDIENTS,
      fewDirections: directionCount < this.MIN_DIRECTIONS,
      noSource: !hasValidSource,
      hasHtmlInDirections: this.containsHtml(directionsRaw),
      hasHtmlInIngredients: this.containsHtml(ingredientsRaw),
    };
  }

  /**
   * Determine if a recipe needs fixing
   */
  static needsFixing(issues: RecipeIssues): boolean {
    // HTML cleaning can be done without re-scraping
    if (issues.hasHtmlInDirections || issues.hasHtmlInIngredients) {
      return true;
    }

    // For other issues, we need a source URL to re-scrape from
    if (issues.noSource) return false;

    return issues.missingImage || issues.fewIngredients || issues.fewDirections;
  }

  /**
   * Get human-readable issue descriptions
   */
  static getIssueDescriptions(issues: RecipeIssues): string[] {
    const descriptions: string[] = [];
    if (issues.hasHtmlInDirections) descriptions.push('HTML tags in directions');
    if (issues.hasHtmlInIngredients) descriptions.push('HTML tags in ingredients');
    if (issues.missingImage) descriptions.push('missing/invalid image');
    if (issues.fewIngredients) descriptions.push(`fewer than ${this.MIN_INGREDIENTS} ingredients`);
    if (issues.fewDirections) descriptions.push(`fewer than ${this.MIN_DIRECTIONS} directions`);
    if (issues.noSource) descriptions.push('no source URL for re-scraping');
    return descriptions;
  }

  /**
   * Clean HTML from a JSON array string
   */
  private static cleanHtmlFromJsonArray(jsonStr: string): string | null {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed)) return null;

      const cleaned = parsed
        .map(item => HtmlSanitizer.stripHtml(item))
        .filter(item => item && item.trim().length > 0);

      return JSON.stringify(cleaned);
    } catch {
      return null;
    }
  }

  /**
   * Attempt to fix a recipe - cleans HTML locally, re-scrapes for missing data
   */
  static async fixRecipe(recipe: Recipe): Promise<{ success: boolean; error?: string }> {
    const issues = this.analyzeRecipe(recipe);
    const updates: Partial<Recipe> = {};

    // First, handle HTML cleaning (doesn't require re-scraping)
    if (issues.hasHtmlInDirections && recipe.directions) {
      const cleaned = this.cleanHtmlFromJsonArray(recipe.directions);
      if (cleaned) {
        updates.directions = cleaned;
        console.log(`[Sanitizer] Cleaned HTML from directions: ${recipe.title}`);
      }
    }

    if (issues.hasHtmlInIngredients && recipe.ingredients) {
      const cleaned = this.cleanHtmlFromJsonArray(recipe.ingredients);
      if (cleaned) {
        updates.ingredients = cleaned;
        console.log(`[Sanitizer] Cleaned HTML from ingredients: ${recipe.title}`);
      }
    }

    // If we have HTML to clean, we can do that without re-scraping
    const needsRescrape = issues.missingImage || issues.fewIngredients || issues.fewDirections;

    // For other issues, we need to re-scrape
    if (needsRescrape) {
      if (!recipe.source || !recipe.source.startsWith('http')) {
        // If we at least cleaned HTML, that's still a success
        if (Object.keys(updates).length > 0) {
          await storage.updateRecipe(recipe.id, updates);
          return { success: true };
        }
        return { success: false, error: 'No valid source URL for re-scraping' };
      }

      try {
        console.log(`[Sanitizer] Re-scraping: ${recipe.title} from ${recipe.source}`);

        // Re-scrape the recipe
        const scrapedData = await RecipeService.scrapeWebsiteRecipe(recipe.source);

        if (scrapedData) {
          // Update image if missing and scraped data has one
          if (issues.missingImage && scrapedData.imageUrl) {
            updates.imageUrl = scrapedData.imageUrl;
          }

          // Update ingredients if current has too few (and we didn't already clean HTML)
          if (issues.fewIngredients && scrapedData.ingredients && !updates.ingredients) {
            const newIngredients = Array.isArray(scrapedData.ingredients)
              ? scrapedData.ingredients
              : [scrapedData.ingredients];
            if (newIngredients.length >= this.MIN_INGREDIENTS) {
              updates.ingredients = JSON.stringify(HtmlSanitizer.stripHtmlFromArray(newIngredients));
            }
          }

          // Update directions if current has too few (and we didn't already clean HTML)
          if (issues.fewDirections && scrapedData.directions && !updates.directions) {
            const newDirections = Array.isArray(scrapedData.directions)
              ? scrapedData.directions
              : [scrapedData.directions];
            if (newDirections.length >= this.MIN_DIRECTIONS) {
              updates.directions = JSON.stringify(HtmlSanitizer.stripHtmlFromArray(newDirections));
            }
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Sanitizer] Re-scrape failed for ${recipe.title}:`, errorMsg);

        // If we at least cleaned HTML, still save that
        if (Object.keys(updates).length > 0) {
          await storage.updateRecipe(recipe.id, updates);
          console.log(`[Sanitizer] Partially fixed: ${recipe.title} - updated ${Object.keys(updates).join(', ')}`);
          return { success: true };
        }
        return { success: false, error: errorMsg };
      }
    }

    // Apply updates if we have any
    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No improvements found' };
    }

    await storage.updateRecipe(recipe.id, updates);
    console.log(`[Sanitizer] Fixed: ${recipe.title} - updated ${Object.keys(updates).join(', ')}`);

    return { success: true };
  }

  /**
   * Fix HTML only (no re-scraping) - fast and safe
   */
  static async fixHtmlOnly(recipe: Recipe): Promise<{ success: boolean; error?: string }> {
    const issues = this.analyzeRecipe(recipe);
    const updates: Partial<Recipe> = {};

    if (issues.hasHtmlInDirections && recipe.directions) {
      const cleaned = this.cleanHtmlFromJsonArray(recipe.directions);
      if (cleaned) {
        updates.directions = cleaned;
      }
    }

    if (issues.hasHtmlInIngredients && recipe.ingredients) {
      const cleaned = this.cleanHtmlFromJsonArray(recipe.ingredients);
      if (cleaned) {
        updates.ingredients = cleaned;
      }
    }

    if (Object.keys(updates).length === 0) {
      return { success: false, error: 'No HTML to clean' };
    }

    await storage.updateRecipe(recipe.id, updates);
    console.log(`[Sanitizer] Cleaned HTML: ${recipe.title}`);
    return { success: true };
  }

  /**
   * Run full sanitization on all recipes
   */
  static async sanitizeAll(options?: {
    dryRun?: boolean;
    maxFixes?: number;
    delayBetweenMs?: number;
    htmlOnly?: boolean;
  }): Promise<SanitizationResult> {
    const { dryRun = false, maxFixes = 50, delayBetweenMs = 2000, htmlOnly = false } = options || {};

    console.log(`[Sanitizer] Starting recipe sanitization (dryRun: ${dryRun}, maxFixes: ${maxFixes}, htmlOnly: ${htmlOnly})`);

    const result: SanitizationResult = {
      totalChecked: 0,
      incompleteFound: 0,
      fixed: 0,
      failed: 0,
      details: [],
    };

    try {
      const allRecipes = await storage.getAllRecipes();
      result.totalChecked = allRecipes.length;

      console.log(`[Sanitizer] Checking ${allRecipes.length} recipes...`);

      let fixAttempts = 0;

      for (const recipe of allRecipes) {
        const issues = this.analyzeRecipe(recipe);

        // In htmlOnly mode, only look for HTML issues
        const hasRelevantIssues = htmlOnly
          ? (issues.hasHtmlInDirections || issues.hasHtmlInIngredients)
          : this.needsFixing(issues);

        if (hasRelevantIssues) {
          result.incompleteFound++;
          const issueDescriptions = htmlOnly
            ? this.getIssueDescriptions(issues).filter(d => d.includes('HTML'))
            : this.getIssueDescriptions(issues);

          console.log(`[Sanitizer] Found issues in "${recipe.title}": ${issueDescriptions.join(', ')}`);

          if (dryRun) {
            result.details.push({
              id: recipe.id,
              title: recipe.title,
              issues: issueDescriptions,
              fixed: false,
            });
            continue;
          }

          // Respect max fixes limit
          if (fixAttempts >= maxFixes) {
            console.log(`[Sanitizer] Reached max fixes limit (${maxFixes}), stopping`);
            break;
          }

          // Add delay (shorter for htmlOnly since no network requests)
          if (fixAttempts > 0) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenMs));
          }

          fixAttempts++;

          // Use appropriate fix method
          const fixResult = htmlOnly
            ? await this.fixHtmlOnly(recipe)
            : await this.fixRecipe(recipe);

          result.details.push({
            id: recipe.id,
            title: recipe.title,
            issues: issueDescriptions,
            fixed: fixResult.success,
            error: fixResult.error,
          });

          if (fixResult.success) {
            result.fixed++;
          } else {
            result.failed++;
          }
        }
      }

      console.log(`[Sanitizer] Complete: ${result.totalChecked} checked, ${result.incompleteFound} issues found, ${result.fixed} fixed, ${result.failed} failed`);

      return result;
    } catch (error) {
      console.error('[Sanitizer] Fatal error:', error);
      throw error;
    }
  }

  /**
   * Run sanitization in background (non-blocking)
   */
  static runInBackground(options?: Parameters<typeof this.sanitizeAll>[0]): void {
    // Don't block server startup
    setImmediate(async () => {
      try {
        // Wait a bit for database connections to stabilize
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('[Sanitizer] Starting background sanitization...');
        const result = await this.sanitizeAll(options);

        if (result.fixed > 0 || result.failed > 0) {
          console.log('[Sanitizer] Background sanitization summary:', {
            checked: result.totalChecked,
            found: result.incompleteFound,
            fixed: result.fixed,
            failed: result.failed,
          });
        }
      } catch (error) {
        console.error('[Sanitizer] Background sanitization failed:', error);
      }
    });
  }
}
