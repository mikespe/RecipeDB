/**
 * Crawler Optimizer - Performance and efficiency improvements
 * Following DRY, KISS, SOLID principles
 */

import { storage } from "../storage";

/**
 * Prioritized recipe sources - KISS: Focus on high-quality, accessible sources
 * Ordered by: quality, accessibility, update frequency
 */
export const PRIORITIZED_SOURCES = [
  // Tier 1: High quality, good accessibility, frequent updates
  { name: "BBC Good Food", baseUrl: "https://www.bbcgoodfood.com", searchUrl: "https://www.bbcgoodfood.com/recipes/", recipeSelector: "a[href*='/recipes/']", priority: 1, maxPages: 2 },
  { name: "Simply Recipes", baseUrl: "https://www.simplyrecipes.com", searchUrl: "https://www.simplyrecipes.com/recipes/", recipeSelector: "a[href*='/recipes/']", priority: 1, maxPages: 2 },
  { name: "King Arthur Baking", baseUrl: "https://www.kingarthurbaking.com", searchUrl: "https://www.kingarthurbaking.com/recipes/", recipeSelector: "a[href*='/recipe/']", priority: 1, maxPages: 2 },
  { name: "Serious Eats", baseUrl: "https://www.seriouseats.com", searchUrl: "https://www.seriouseats.com/recipes/", recipeSelector: "a[href*='/recipes/']", priority: 1, maxPages: 2 },
  
  // Tier 2: Good quality, moderate accessibility
  { name: "Bon Appetit", baseUrl: "https://www.bonappetit.com", searchUrl: "https://www.bonappetit.com/recipes/", recipeSelector: "a[href*='/recipe/']", priority: 2, maxPages: 1 },
  { name: "Epicurious", baseUrl: "https://www.epicurious.com", searchUrl: "https://www.epicurious.com/recipes/", recipeSelector: "a[href*='/recipes/']", priority: 2, maxPages: 1 },
  { name: "Food52", baseUrl: "https://food52.com", searchUrl: "https://food52.com/recipes/", recipeSelector: "a[href*='recipe']", priority: 2, maxPages: 1 },
  { name: "Delish", baseUrl: "https://www.delish.com", searchUrl: "https://www.delish.com/cooking/recipes/", recipeSelector: "a[href*='recipe']", priority: 2, maxPages: 1 },
  
  // Tier 3: Popular blogs with good recipes
  { name: "Minimalist Baker", baseUrl: "https://minimalistbaker.com", searchUrl: "https://minimalistbaker.com/recipes/", recipeSelector: "a[href*='/recipe/']", priority: 3, maxPages: 1 },
  { name: "Cookie and Kate", baseUrl: "https://cookieandkate.com", searchUrl: "https://cookieandkate.com/recipes/", recipeSelector: "a[href*='/recipe/']", priority: 3, maxPages: 1 },
  { name: "Pinch of Yum", baseUrl: "https://pinchofyum.com", searchUrl: "https://pinchofyum.com/recipes/", recipeSelector: "a[href*='/recipe/']", priority: 3, maxPages: 1 },
];

/**
 * Optimized duplicate check - DRY: Single source of truth
 */
export async function checkRecipeExists(url: string): Promise<boolean> {
  try {
    const existing = await storage.getRecipeBySource(url);
    return !!existing;
  } catch (error) {
    // If check fails, assume doesn't exist to avoid blocking
    return false;
  }
}

/**
 * Batch duplicate check - Performance: Check multiple URLs at once
 */
export async function batchCheckRecipes(urls: string[]): Promise<Set<string>> {
  const existingUrls = new Set<string>();
  
  // Check in parallel batches of 10
  const batchSize = 10;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const checks = await Promise.allSettled(
      batch.map(async (url) => {
        const exists = await checkRecipeExists(url);
        return exists ? url : null;
      })
    );
    
    checks.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        existingUrls.add(result.value);
      }
    });
  }
  
  return existingUrls;
}

/**
 * Adaptive rate limiter - Performance: Adjusts based on success rate
 */
export class AdaptiveRateLimiter {
  private successCount = 0;
  private failureCount = 0;
  private baseDelay = 1000;
  private minDelay = 500;
  private maxDelay = 3000;

  getDelay(): number {
    const total = this.successCount + this.failureCount;
    if (total === 0) return this.baseDelay;

    const successRate = this.successCount / total;
    
    // If success rate is high, reduce delay (faster)
    if (successRate > 0.8) {
      return Math.max(this.minDelay, this.baseDelay * 0.7);
    }
    
    // If success rate is low, increase delay (slower, more careful)
    if (successRate < 0.5) {
      return Math.min(this.maxDelay, this.baseDelay * 1.5);
    }
    
    return this.baseDelay;
  }

  recordSuccess() {
    this.successCount++;
    // Reset counters periodically to adapt to current conditions
    if (this.successCount + this.failureCount > 100) {
      this.successCount = Math.floor(this.successCount * 0.5);
      this.failureCount = Math.floor(this.failureCount * 0.5);
    }
  }

  recordFailure() {
    this.failureCount++;
  }
}

/**
 * URL cache with size limit - Performance: Prevent memory leaks
 */
export class BoundedUrlCache {
  private cache = new Map<string, { date: Date; success: boolean }>();
  private maxSize = 10000; // Limit to 10k URLs

  set(url: string, success: boolean) {
    // If cache is full, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries());
      // Remove oldest 20% of entries
      const toRemove = Math.floor(this.maxSize * 0.2);
      entries
        .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
        .slice(0, toRemove)
        .forEach(([url]) => this.cache.delete(url));
    }
    
    this.cache.set(url, { date: new Date(), success });
  }

  get(url: string): { date: Date; success: boolean } | undefined {
    return this.cache.get(url);
  }

  shouldSkip(url: string, cooldownPeriod: number): boolean {
    const record = this.cache.get(url);
    if (!record) return false;
    
    const now = new Date();
    const elapsed = now.getTime() - record.date.getTime();
    return elapsed < cooldownPeriod;
  }

  clear() {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

