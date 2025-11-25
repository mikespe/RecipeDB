/**
 * Clean Recipe Service - DRY, KISS, SOLID Implementation
 * Simplified, maintainable recipe service following clean architecture
 */

import { BaseService } from '../core/BaseService';
import { ValidationService } from '../core/ValidationService';
import { ErrorHandler } from '../core/ErrorHandler';
import { IStorage } from '../storage';
import type { Recipe, InsertRecipe } from '@shared/schema';

export class CleanRecipeService extends BaseService {
  constructor(
    private storage: IStorage,
    private validator: ValidationService
  ) {
    super('CleanRecipeService');
  }

  // KISS: Simple, focused methods
  async getById(id: string): Promise<Recipe> {
    this.validateRequired({ id }, ['id']);

    const recipe = await this.storage.getRecipe(id);
    if (!recipe) {
      throw ErrorHandler.notFound(`Recipe with id ${id} not found`);
    }

    return recipe;
  }

  async getPaginated(page: number = 1, limit: number = 10) {
    // Input sanitization is now handled in storage layer
    return await this.storage.getRecipesPaginated(page, limit);
  }

  async search(query: string): Promise<Recipe[]> {
    if (!query?.trim()) {
      return [];
    }

    // Sanitize query - DRY: Single place for query sanitization
    const sanitizedQuery = query.trim().substring(0, 200);
    return await this.storage.searchRecipes(sanitizedQuery);
  }

  async getStats() {
    return await this.storage.getRecipeStats();
  }

  async create(recipeData: InsertRecipe): Promise<Recipe> {
    // SOLID: Single responsibility for validation
    const validation = this.validator.validateRecipeData(recipeData);
    if (!validation.isValid) {
      throw ErrorHandler.validation(`Invalid recipe data: ${validation.errors.join(', ')}`);
    }

    return await this.storage.createRecipe(recipeData);
  }

  // DRY: Centralized scraping logic
  async scrapeAndCreate(url: string): Promise<Recipe> {
    if (!this.validator.validateUrl(url)) {
      throw ErrorHandler.validation('Invalid URL format');
    }

    try {
      // TODO: Integrate with existing scraping services
      // For now, throw appropriate error
      throw ErrorHandler.scraping('Scraping integration pending');
    } catch (error) {
      if (error instanceof ErrorHandler) {
        throw error;
      }
      throw ErrorHandler.scraping(`Scraping failed: ${(error as any).message}`);
    }
  }
}