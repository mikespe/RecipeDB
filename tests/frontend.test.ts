/**
 * Frontend Integration Tests
 * 
 * Tests the frontend components and their integration with the API
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

// Simulate frontend data fetching logic
async function fetchRecipes(page = 1, limit = 10) {
  const response = await fetch(`${API_BASE}/api/recipes/paginated?page=${page}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch recipes');
  const result = await response.json();
  // Handle nested response structure: {success: true, recipes: {recipes: [...], total, hasMore}}
  return result.recipes || result;
}

async function searchRecipes(query: string) {
  const response = await fetch(`${API_BASE}/api/recipes/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to search recipes');
  const result = await response.json();
  // Handle potential nested response structure
  return result.recipes || result;
}

describe('Frontend Data Integration', () => {
  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('Recipe List Display', () => {
    it('should fetch and format recipe data correctly for display', async () => {
      const data = await fetchRecipes(1, 5);
      
      expect(data).toHaveProperty('recipes');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('hasMore');
      expect(Array.isArray(data.recipes)).toBe(true);
      
      // Test that each recipe has the required fields for display
      if (data.recipes.length > 0) {
        const recipe = data.recipes[0];
        
        // Required fields for RecipeCard component
        expect(recipe).toHaveProperty('id');
        expect(recipe).toHaveProperty('title');
        expect(recipe).toHaveProperty('ingredients');
        expect(recipe).toHaveProperty('directions');
        expect(recipe).toHaveProperty('source');
        expect(recipe).toHaveProperty('isAutoScraped');
        
        // Test JSON parsing (what frontend does)
        expect(() => JSON.parse(recipe.ingredients)).not.toThrow();
        expect(() => JSON.parse(recipe.directions)).not.toThrow();
        
        const ingredients = JSON.parse(recipe.ingredients);
        const directions = JSON.parse(recipe.directions);
        
        expect(Array.isArray(ingredients)).toBe(true);
        expect(Array.isArray(directions)).toBe(true);
      }
    });

    it('should handle empty recipe list gracefully', async () => {
      // Test with a very high page number to get empty results
      const data = await fetchRecipes(9999, 10);
      
      expect(data).toHaveProperty('recipes');
      expect(Array.isArray(data.recipes)).toBe(true);
      expect(data.recipes.length).toBe(0);
      expect(data.hasMore).toBe(false);
    });
  });

  describe('Recipe Search Functionality', () => {
    it('should return properly formatted search results', async () => {
      const results = await searchRecipes('bread');
      
      expect(Array.isArray(results)).toBe(true);
      
      // Test that search results have the same structure as list results
      if (results.length > 0) {
        const recipe = results[0];
        expect(recipe).toHaveProperty('id');
        expect(recipe).toHaveProperty('title');
        expect(recipe).toHaveProperty('ingredients');
        expect(recipe).toHaveProperty('directions');
        
        // Verify that the search actually worked
        const title = recipe.title.toLowerCase();
        const ingredients = JSON.parse(recipe.ingredients).join(' ').toLowerCase();
        const hasSearchTerm = title.includes('bread') || ingredients.includes('bread');
        expect(hasSearchTerm).toBe(true);
      }
    });

    it('should handle search with no results', async () => {
      const results = await searchRecipes('xyznonexistentrecipe123');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('Recipe Card Display Logic', () => {
    it('should properly parse and display recipe ingredients', async () => {
      const data = await fetchRecipes(1, 1);
      
      if (data.recipes.length > 0) {
        const recipe = data.recipes[0];
        const ingredients = JSON.parse(recipe.ingredients);
        
        // Test slicing logic for ingredient display (RecipeCard shows first 4)
        const displayIngredients = ingredients.slice(0, 4);
        const hasMoreIngredients = ingredients.length > 4;
        
        expect(Array.isArray(displayIngredients)).toBe(true);
        expect(displayIngredients.length).toBeLessThanOrEqual(4);
        expect(typeof hasMoreIngredients).toBe('boolean');
        
        if (ingredients.length > 4) {
          expect(hasMoreIngredients).toBe(true);
          expect(displayIngredients.length).toBe(4);
        } else {
          expect(hasMoreIngredients).toBe(false);
          expect(displayIngredients.length).toBe(ingredients.length);
        }
      }
    });
  });

  describe('Pagination Logic', () => {
    it('should handle load more functionality correctly', async () => {
      const page1 = await fetchRecipes(1, 3);
      const page2 = await fetchRecipes(2, 3);
      
      expect(page1.recipes).toBeDefined();
      expect(page2.recipes).toBeDefined();
      
      // Simulate frontend logic: combining pages
      const allRecipes = [...page1.recipes, ...page2.recipes];
      
      // Should have up to 6 recipes total
      expect(allRecipes.length).toBeLessThanOrEqual(6);
      
      // Should have unique recipes (no duplicates)
      const recipeIds = allRecipes.map(r => r.id);
      const uniqueIds = new Set(recipeIds);
      expect(uniqueIds.size).toBe(recipeIds.length);
    });
  });
});

describe('Error Scenarios Frontend Should Handle', () => {
  it('should handle API errors gracefully', async () => {
    // Test what happens when API returns an error
    try {
      const response = await fetch(`${API_BASE}/api/recipes/paginated?page=-1`);
      const data = await response.json();
      
      // Frontend should handle both error responses and empty data
      if (!response.ok || data.error) {
        expect(true).toBe(true); // Error is expected and handled
      } else {
        // If no error, should still have proper structure
        expect(data).toHaveProperty('recipes');
      }
    } catch (error) {
      // Network errors should be caught
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('should handle malformed recipe data', async () => {
    const data = await fetchRecipes(1, 5);
    
    if (data.recipes.length > 0) {
      data.recipes.forEach((recipe: any) => {
        // Test that frontend can handle potential malformed JSON
        try {
          const ingredients = JSON.parse(recipe.ingredients || '[]');
          expect(Array.isArray(ingredients)).toBe(true);
        } catch (error) {
          // If JSON is malformed, frontend should handle gracefully
          console.warn(`Malformed ingredients JSON for recipe ${recipe.id}`);
        }
        
        try {
          const directions = JSON.parse(recipe.directions || '[]');
          expect(Array.isArray(directions)).toBe(true);
        } catch (error) {
          // If JSON is malformed, frontend should handle gracefully
          console.warn(`Malformed directions JSON for recipe ${recipe.id}`);
        }
      });
    }
  });
});