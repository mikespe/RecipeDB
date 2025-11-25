/**
 * Refactored Recipe Service - SOLID Architecture
 * Single Responsibility: Recipe business logic
 * Open/Closed: Extensible for new recipe sources
 * Liskov Substitution: Interface-based design
 * Interface Segregation: Focused interfaces
 * Dependency Inversion: Depends on abstractions
 */

import { BaseService } from '../core/BaseService';
import { ValidationService, ValidationResult } from '../core/ValidationService';
import { ErrorHandler, AppError } from '../core/ErrorHandler';
import type { Recipe, InsertRecipe } from '@shared/schema';

export interface IRecipeRepository {
  findById(id: string): Promise<Recipe | undefined>;
  findPaginated(page: number, limit: number): Promise<{ recipes: Recipe[]; total: number }>;
  search(query: string): Promise<Recipe[]>;
  create(recipe: InsertRecipe): Promise<Recipe>;
  getStats(): Promise<{ total: string; autoScraped: string; userAdded: number }>;
}

export interface IRecipeScraper {
  scrape(url: string): Promise<Partial<InsertRecipe>>;
  canHandle(url: string): boolean;
}

export class RecipeService extends BaseService {
  constructor(
    private repository: IRecipeRepository,
    private scrapers: IRecipeScraper[],
    private validator: ValidationService
  ) {
    super('RecipeService');
  }

  async getById(id: string): Promise<Recipe> {
    this.validateRequired({ id }, ['id']);

    const recipe = await this.repository.findById(id);
    if (!recipe) {
      throw ErrorHandler.notFound(`Recipe with id ${id} not found`);
    }

    this.log(`Retrieved recipe: ${recipe.title}`);
    return recipe;
  }

  async getPaginated(page: number = 1, limit: number = 10): Promise<{ recipes: Recipe[]; total: number; hasMore: boolean }> {
    // Validate and sanitize pagination parameters
    const safePage = Math.max(1, isNaN(page) ? 1 : Math.floor(page));
    const safeLimit = Math.max(1, Math.min(100, isNaN(limit) ? 10 : Math.floor(limit)));

    const result = await this.repository.findPaginated(safePage, safeLimit);
    const hasMore = (safePage * safeLimit) < result.total;

    this.log(`Retrieved ${result.recipes.length} recipes (page ${safePage}, limit ${safeLimit})`);

    return {
      ...result,
      hasMore
    };
  }

  async search(query: string): Promise<Recipe[]> {
    // Sanitize search query
    const sanitizedQuery = query?.trim()?.substring(0, 200) || '';

    if (!sanitizedQuery) {
      return [];
    }

    const results = await this.repository.search(sanitizedQuery);
    this.log(`Search for "${sanitizedQuery}" returned ${results.length} results`);

    return results;
  }

  async scrapeAndCreate(url: string): Promise<Recipe> {
    // Validate URL
    if (!this.validator.validateUrl(url)) {
      throw ErrorHandler.validation('Invalid URL format');
    }

    // Find appropriate scraper
    const scraper = this.scrapers.find(s => s.canHandle(url));
    if (!scraper) {
      throw ErrorHandler.scraping('No scraper available for this URL');
    }

    try {
      // Scrape recipe data
      this.log(`Scraping recipe from: ${url}`);
      const scrapedData = await scraper.scrape(url);

      // Validate scraped data
      const validation = this.validator.validateRecipeData(scrapedData);
      if (!validation.isValid) {
        throw ErrorHandler.validation(`Invalid recipe data: ${validation.errors.join(', ')}`);
      }

      // Create recipe
      const recipeData: InsertRecipe = {
        ...scrapedData,
        source: url,
        isAutoScraped: 1
      } as InsertRecipe;

      const recipe = await this.repository.create(recipeData);
      this.log(`Created recipe: ${recipe.title}`);

      return recipe;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw ErrorHandler.scraping(`Failed to scrape recipe: ${(error as any).message}`);
    }
  }

  async getStats() {
    return await this.repository.getStats();
  }
}

// Repository implementation
export class DatabaseRecipeRepository implements IRecipeRepository {
  constructor(private storage: any) { } // TODO: Replace with proper DB interface

  async findById(id: string): Promise<Recipe | undefined> {
    return await this.storage.getRecipe(id);
  }

  async findPaginated(page: number, limit: number): Promise<{ recipes: Recipe[]; total: number }> {
    return await this.storage.getRecipesPaginated(page, limit);
  }

  async search(query: string): Promise<Recipe[]> {
    return await this.storage.searchRecipes(query);
  }

  async create(recipe: InsertRecipe): Promise<Recipe> {
    return await this.storage.createRecipe(recipe);
  }

  async getStats() {
    return await this.storage.getStats();
  }
}

// Simple scraper implementation
export class BasicRecipeScraper implements IRecipeScraper {
  canHandle(url: string): boolean {
    // Simple check - extend as needed
    return url.startsWith('http://') || url.startsWith('https://');
  }

  async scrape(url: string): Promise<Partial<InsertRecipe>> {
    // TODO: Integrate existing scraping logic
    throw new Error('Scraping not implemented yet');
  }
}