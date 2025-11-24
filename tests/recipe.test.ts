/**
 * Comprehensive Recipe System Tests
 * 
 * This test suite covers:
 * - API endpoint functionality
 * - Recipe scraping and data extraction
 * - Database operations
 * - Frontend data fetching and display
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Mock environment for testing
const API_BASE = 'http://localhost:5000';

describe('Recipe API Tests', () => {
  beforeAll(async () => {
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('Recipe Statistics', () => {
    it('should return recipe statistics', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/stats`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('autoScraped');
      expect(data).toHaveProperty('userAdded');
      
      // Verify data types
      expect(typeof data.total).toBe('string'); // Database returns string
      expect(typeof data.autoScraped).toBe('string');
      expect(typeof data.userAdded).toBe('number');
    });
  });

  describe('Recipe Pagination', () => {
    it('should return paginated recipes with correct structure', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=5`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('recipes');
      expect(data.recipes).toHaveProperty('recipes');
      expect(data.recipes).toHaveProperty('total');
      expect(data.recipes).toHaveProperty('hasMore');
      
      // Verify recipes array
      expect(Array.isArray(data.recipes.recipes)).toBe(true);
      expect(data.recipes.recipes.length).toBeLessThanOrEqual(5);
      
      // Verify recipe structure
      if (data.recipes.recipes.length > 0) {
        const recipe = data.recipes.recipes[0];
        expect(recipe).toHaveProperty('id');
        expect(recipe).toHaveProperty('title');
        expect(recipe).toHaveProperty('ingredients');
        expect(recipe).toHaveProperty('directions');
        expect(recipe).toHaveProperty('source');
      }
    });

    it('should handle pagination correctly', async () => {
      const page1 = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=2`);
      const page2 = await fetch(`${API_BASE}/api/recipes/paginated?page=2&limit=2`);
      
      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);
      
      const data1 = await page1.json();
      const data2 = await page2.json();
      
      // Should have different recipes on different pages
      if (data1.recipes.recipes.length > 0 && data2.recipes.recipes.length > 0) {
        expect(data1.recipes.recipes[0].id).not.toBe(data2.recipes.recipes[0].id);
      }
    });
  });

  describe('Recipe Search', () => {
    it('should search recipes successfully', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/search?q=bread`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(Array.isArray(data.recipes)).toBe(true);
    });

    it('should handle empty search results', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/search?q=nonexistentrecipexyz123`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(Array.isArray(data.recipes)).toBe(true);
      expect(data.recipes.length).toBe(0);
    });
  });

  describe('Individual Recipe Fetching', () => {
    it('should fetch a specific recipe', async () => {
      // First get a recipe ID from the paginated endpoint
      const listResponse = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=1`);
      const listData = await listResponse.json();
      
      if (listData.recipes.recipes.length > 0) {
        const recipeId = listData.recipes.recipes[0].id;
        
        const response = await fetch(`${API_BASE}/api/recipes/${recipeId}`);
        expect(response.status).toBe(200);
        
        const recipe = await response.json();
        expect(recipe).toHaveProperty('id', recipeId);
        expect(recipe).toHaveProperty('title');
        expect(recipe).toHaveProperty('ingredients');
        expect(recipe).toHaveProperty('directions');
      }
    });

    it('should return 404 for non-existent recipe', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/non-existent-id`);
      expect(response.status).toBe(404);
    });
  });

  describe('Recipe Scraping', () => {
    it('should handle invalid URLs gracefully', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'invalid-url' })
      });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error', true);
    });

    it('should handle protected sites with proper error messages', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://www.allrecipes.com/recipe/213742/test/' })
      });
      
      // Should return an error but be a valid response
      expect([403, 500]).toContain(response.status);
      const data = await response.json();
      expect(data).toHaveProperty('error', true);
      expect(data).toHaveProperty('message');
    });
  });
});

describe('Data Validation Tests', () => {
  describe('Recipe Data Structure', () => {
    it('should validate recipe ingredients are properly formatted', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=10`);
      const data = await response.json();
      
      if (data.recipes.recipes.length > 0) {
        data.recipes.recipes.forEach((recipe: any) => {
          // Ingredients should be a valid JSON string
          expect(() => JSON.parse(recipe.ingredients)).not.toThrow();
          
          const ingredients = JSON.parse(recipe.ingredients);
          expect(Array.isArray(ingredients)).toBe(true);
          
          if (ingredients.length > 0) {
            expect(typeof ingredients[0]).toBe('string');
          }
        });
      }
    });

    it('should validate recipe directions are properly formatted', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=10`);
      const data = await response.json();
      
      if (data.recipes.recipes.length > 0) {
        data.recipes.recipes.forEach((recipe: any) => {
          // Directions should be a valid JSON string
          expect(() => JSON.parse(recipe.directions)).not.toThrow();
          
          const directions = JSON.parse(recipe.directions);
          expect(Array.isArray(directions)).toBe(true);
          
          if (directions.length > 0) {
            expect(typeof directions[0]).toBe('string');
          }
        });
      }
    });
  });
});

describe('Performance Tests', () => {
  it('should respond to recipe list requests within reasonable time', async () => {
    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=10`);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
  });

  it('should handle concurrent requests', async () => {
    const requests = Array(5).fill(0).map(() => 
      fetch(`${API_BASE}/api/recipes/stats`)
    );
    
    const responses = await Promise.all(requests);
    
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });
});

describe('Error Handling Tests', () => {
  it('should handle malformed requests gracefully', async () => {
    const response = await fetch(`${API_BASE}/api/recipes/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json'
    });
    
    expect(response.status).toBe(400);
  });

  it('should return proper error structure', async () => {
    const response = await fetch(`${API_BASE}/api/recipes/non-existent-endpoint`);
    expect(response.status).toBe(404);
  });
});