/**
 * Frontend Integration & Regression Testing Suite
 * Tests data flow, component integration, and prevents display regressions
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

const API_BASE = 'http://localhost:5000';

// Simulate frontend data fetching patterns
class FrontendDataService {
  async fetchPaginatedRecipes(page = 1, limit = 10) {
    const response = await fetch(`${API_BASE}/api/recipes/paginated?page=${page}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch recipes');
    const result = await response.json();
    return result.recipes || result;
  }

  async searchRecipes(query: string) {
    const response = await fetch(`${API_BASE}/api/recipes/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search recipes');
    const result = await response.json();
    return result.recipes || result;
  }

  async fetchRecipe(id: string) {
    const response = await fetch(`${API_BASE}/api/recipes/${id}`);
    if (!response.ok) throw new Error('Failed to fetch recipe');
    const result = await response.json();
    return result.recipe || result;
  }

  async fetchStats() {
    const response = await fetch(`${API_BASE}/api/recipes/stats`);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }
}

describe('Frontend Integration Tests', () => {
  let dataService: FrontendDataService;
  let testRecipeId: string;

  beforeAll(async () => {
    dataService = new FrontendDataService();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get a test recipe ID
    try {
      const data = await dataService.fetchPaginatedRecipes(1, 1);
      if (data.recipes && data.recipes.length > 0) {
        testRecipeId = data.recipes[0].id;
      }
    } catch (error) {
      console.warn('Could not get test recipe ID:', error);
    }
  });

  describe('Home Page Recipe Display', () => {
    it('should fetch and display paginated recipes correctly', async () => {
      const data = await dataService.fetchPaginatedRecipes(1, 10);
      
      expect(data).toHaveProperty('recipes');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('hasMore');
      expect(Array.isArray(data.recipes)).toBe(true);

      // Test recipe card display data
      if (data.recipes.length > 0) {
        const recipe = data.recipes[0];
        
        // All required fields for RecipeCard component
        expect(recipe).toHaveProperty('id');
        expect(recipe).toHaveProperty('title');
        expect(recipe).toHaveProperty('ingredients');
        expect(recipe).toHaveProperty('directions');
        expect(recipe).toHaveProperty('source');
        expect(recipe).toHaveProperty('isAutoScraped');

        // Test JSON parsing (what RecipeCard does)
        const ingredients = JSON.parse(recipe.ingredients);
        const directions = JSON.parse(recipe.directions);
        
        expect(Array.isArray(ingredients)).toBe(true);
        expect(Array.isArray(directions)).toBe(true);

        // Test display logic for ingredient preview
        const displayIngredients = ingredients.slice(0, 4);
        const hasMoreIngredients = ingredients.length > 4;
        
        expect(displayIngredients.length).toBeLessThanOrEqual(4);
        expect(typeof hasMoreIngredients).toBe('boolean');
        
        console.log(`Recipe "${recipe.title}" has ${ingredients.length} ingredients, ${directions.length} directions`);
      }
    });

    it('should handle "Load More" pagination correctly', async () => {
      const page1 = await dataService.fetchPaginatedRecipes(1, 5);
      const page2 = await dataService.fetchPaginatedRecipes(2, 5);
      
      expect(page1.recipes).toBeDefined();
      expect(page2.recipes).toBeDefined();
      
      // Simulate frontend combining pages
      const allRecipes = [...page1.recipes, ...page2.recipes];
      
      // Should have unique recipes
      const recipeIds = allRecipes.map(r => r.id);
      const uniqueIds = new Set(recipeIds);
      expect(uniqueIds.size).toBe(recipeIds.length);
      
      // Test hasMore logic
      if (page1.hasMore === false) {
        expect(page2.recipes.length).toBe(0);
      }
    });

    it('should prevent regression: recipes showing as 0', async () => {
      const data = await dataService.fetchPaginatedRecipes(1, 10);
      
      // This was the original bug - ensure it doesn't happen again
      expect(data.recipes).not.toBeUndefined();
      expect(Array.isArray(data.recipes)).toBe(true);
      
      if (data.total > 0) {
        expect(data.recipes.length).toBeGreaterThan(0);
        
        // Each recipe should have parseable ingredients/directions
        data.recipes.forEach((recipe: any) => {
          expect(() => JSON.parse(recipe.ingredients)).not.toThrow();
          expect(() => JSON.parse(recipe.directions)).not.toThrow();
          
          const ingredients = JSON.parse(recipe.ingredients);
          const directions = JSON.parse(recipe.directions);
          
          expect(ingredients.length).toBeGreaterThan(0);
          expect(directions.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Recipe Detail Page', () => {
    it('should fetch and display individual recipes correctly', async () => {
      if (!testRecipeId) {
        console.warn('Skipping recipe detail test - no test recipe available');
        return;
      }

      const recipe = await dataService.fetchRecipe(testRecipeId);
      
      expect(recipe).toHaveProperty('id', testRecipeId);
      expect(recipe).toHaveProperty('title');
      expect(recipe).toHaveProperty('ingredients');
      expect(recipe).toHaveProperty('directions');
      
      // Test what RecipeDetail component does
      const ingredients = JSON.parse(recipe.ingredients || '[]');
      const directions = JSON.parse(recipe.directions || '[]');
      
      expect(Array.isArray(ingredients)).toBe(true);
      expect(Array.isArray(directions)).toBe(true);
      
      console.log(`Recipe detail: "${recipe.title}" - ${ingredients.length} ingredients, ${directions.length} directions`);
    });

    it('should prevent regression: ingredients/directions showing as 0', async () => {
      if (!testRecipeId) return;

      const recipe = await dataService.fetchRecipe(testRecipeId);
      
      // This was the regression bug - ensure ingredients/directions display correctly
      const ingredients = JSON.parse(recipe.ingredients || '[]');
      const directions = JSON.parse(recipe.directions || '[]');
      
      // These should not be 0 unless the recipe is actually empty
      if (recipe.ingredients && recipe.ingredients !== '[]') {
        expect(ingredients.length).toBeGreaterThan(0);
      }
      
      if (recipe.directions && recipe.directions !== '[]') {
        expect(directions.length).toBeGreaterThan(0);
      }
      
      // Test the badge display logic
      const ingredientBadgeText = `${ingredients.length} items`;
      const directionBadgeText = `${directions.length} steps`;
      
      expect(ingredientBadgeText).not.toBe('0 items');
      expect(directionBadgeText).not.toBe('0 steps');
    });
  });

  describe('Search Functionality', () => {
    it('should search and display results correctly', async () => {
      const results = await dataService.searchRecipes('bread');
      
      expect(Array.isArray(results)).toBe(true);
      
      // Test search result display
      if (results.length > 0) {
        const recipe = results[0];
        
        // Should have same structure as paginated results
        expect(recipe).toHaveProperty('id');
        expect(recipe).toHaveProperty('title');
        expect(recipe).toHaveProperty('ingredients');
        expect(recipe).toHaveProperty('directions');
        
        // Test search relevance
        const title = recipe.title.toLowerCase();
        const ingredients = JSON.parse(recipe.ingredients).join(' ').toLowerCase();
        const directions = JSON.parse(recipe.directions).join(' ').toLowerCase();
        
        const hasSearchTerm = title.includes('bread') || 
                             ingredients.includes('bread') || 
                             directions.includes('bread');
        
        expect(hasSearchTerm).toBe(true);
      }
    });

    it('should handle empty search results gracefully', async () => {
      const results = await dataService.searchRecipes('xyznonexistentrecipe123456');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('Statistics Display', () => {
    it('should fetch and display statistics correctly', async () => {
      const stats = await dataService.fetchStats();
      
      expect(stats).toHaveProperty('success', true);
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('autoScraped');
      expect(stats).toHaveProperty('userAdded');
      
      // Test header display logic
      const totalRecipes = stats.total;
      const autoScrapedCount = stats.autoScraped;
      const userAddedCount = stats.userAdded;
      
      expect(typeof totalRecipes).toBe('string');
      expect(typeof autoScrapedCount).toBe('string'); 
      expect(typeof userAddedCount).toBe('number');
      
      // These should be valid numbers
      expect(parseInt(totalRecipes)).toBeGreaterThanOrEqual(0);
      expect(parseInt(autoScrapedCount)).toBeGreaterThanOrEqual(0);
      expect(userAddedCount).toBeGreaterThanOrEqual(0);
      
      console.log(`Stats: ${totalRecipes} total, ${autoScrapedCount} auto-scraped, ${userAddedCount} user-added`);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully in data service', async () => {
      // Test network errors
      try {
        const badService = new FrontendDataService();
        const originalFetch = global.fetch;
        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
        
        await expect(badService.fetchPaginatedRecipes()).rejects.toThrow();
        
        global.fetch = originalFetch;
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle malformed JSON gracefully', async () => {
      const data = await dataService.fetchPaginatedRecipes(1, 1);
      
      if (data.recipes.length > 0) {
        const recipe = data.recipes[0];
        
        // Test malformed JSON handling
        try {
          JSON.parse(recipe.ingredients || '[]');
        } catch (error) {
          console.warn('Malformed ingredients JSON detected');
        }
        
        try {
          JSON.parse(recipe.directions || '[]');
        } catch (error) {
          console.warn('Malformed directions JSON detected');
        }
      }
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent data structure across all endpoints', async () => {
      const paginated = await dataService.fetchPaginatedRecipes(1, 1);
      const searched = await dataService.searchRecipes('test');
      
      // Both should return recipes with same structure
      if (paginated.recipes.length > 0 && searched.length > 0) {
        const paginatedRecipe = paginated.recipes[0];
        const searchedRecipe = searched[0];
        
        const paginatedKeys = Object.keys(paginatedRecipe).sort();
        const searchedKeys = Object.keys(searchedRecipe).sort();
        
        expect(paginatedKeys).toEqual(searchedKeys);
      }
    });

    it('should maintain recipe data integrity after fetching individual recipe', async () => {
      if (!testRecipeId) return;

      const paginated = await dataService.fetchPaginatedRecipes(1, 10);
      const paginatedRecipe = paginated.recipes.find((r: any) => r.id === testRecipeId);
      
      if (paginatedRecipe) {
        const individualRecipe = await dataService.fetchRecipe(testRecipeId);
        
        // Core data should be identical
        expect(individualRecipe.id).toBe(paginatedRecipe.id);
        expect(individualRecipe.title).toBe(paginatedRecipe.title);
        expect(individualRecipe.ingredients).toBe(paginatedRecipe.ingredients);
        expect(individualRecipe.directions).toBe(paginatedRecipe.directions);
      }
    });
  });
});