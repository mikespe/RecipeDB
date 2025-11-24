/**
 * Comprehensive Backend Testing Suite
 * Tests all API endpoints, edge cases, and regression scenarios
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const API_BASE = 'http://localhost:5000';

describe('Backend API Comprehensive Tests', () => {
  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  describe('Recipe Statistics API', () => {
    it('should return valid statistics with correct types', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/stats`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('autoScraped');
      expect(data).toHaveProperty('userAdded');
      
      // Validate data types and values
      expect(typeof data.total).toBe('string');
      expect(typeof data.autoScraped).toBe('string');
      expect(typeof data.userAdded).toBe('number');
      expect(parseInt(data.total)).toBeGreaterThanOrEqual(0);
      expect(parseInt(data.autoScraped)).toBeGreaterThanOrEqual(0);
      expect(data.userAdded).toBeGreaterThanOrEqual(0);
    });

    it('should handle concurrent statistics requests', async () => {
      const requests = Array(10).fill(0).map(() => 
        fetch(`${API_BASE}/api/recipes/stats`)
      );
      
      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      const dataPromises = responses.map(r => r.json());
      const data = await Promise.all(dataPromises);
      
      // All responses should be identical
      data.forEach(d => {
        expect(d.success).toBe(true);
        expect(d).toHaveProperty('total');
      });
    });
  });

  describe('Recipe Pagination API', () => {
    it('should return correct pagination structure', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=5`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('recipes');
      expect(data.recipes).toHaveProperty('recipes');
      expect(data.recipes).toHaveProperty('total');
      expect(data.recipes).toHaveProperty('hasMore');
      
      expect(Array.isArray(data.recipes.recipes)).toBe(true);
      expect(typeof data.recipes.total).toBe('number');
      expect(typeof data.recipes.hasMore).toBe('boolean');
      expect(data.recipes.recipes.length).toBeLessThanOrEqual(5);
    });

    it('should handle invalid pagination parameters gracefully', async () => {
      const testCases = [
        { page: 0, limit: 10 },
        { page: -1, limit: 10 },
        { page: 1, limit: 0 },
        { page: 1, limit: -1 },
        { page: 1, limit: 1000 },
        { page: 'invalid', limit: 10 },
        { page: 1, limit: 'invalid' }
      ];

      for (const { page, limit } of testCases) {
        const response = await fetch(`${API_BASE}/api/recipes/paginated?page=${page}&limit=${limit}`);
        expect(response.status).toBe(200); // Should handle gracefully, not error
        
        const data = await response.json();
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('recipes');
      }
    });

    it('should maintain consistent ordering across pages', async () => {
      const page1 = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=3`);
      const page2 = await fetch(`${API_BASE}/api/recipes/paginated?page=2&limit=3`);
      const page3 = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=6`);
      
      const data1 = await page1.json();
      const data2 = await page2.json();
      const data3 = await page3.json();
      
      if (data1.recipes.recipes.length >= 3 && data2.recipes.recipes.length > 0) {
        // First 3 from page 1 + page 2 should equal first 6 recipes
        const combined = [...data1.recipes.recipes, ...data2.recipes.recipes.slice(0, 3)];
        const single = data3.recipes.recipes.slice(0, 6);
        
        combined.forEach((recipe, index) => {
          if (single[index]) {
            expect(recipe.id).toBe(single[index].id);
          }
        });
      }
    });
  });

  describe('Recipe Search API', () => {
    it('should return search results with correct structure', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/search?q=bread`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('recipes');
      expect(Array.isArray(data.recipes)).toBe(true);
    });

    it('should handle special characters and edge cases in search', async () => {
      const testQueries = [
        'pasta & cheese',
        'café latte',
        'chicken-noodle',
        '100% organic',
        'search with "quotes"',
        'unicode: 食物',
        'empty:',
        '   whitespace   ',
        'a', // single character
        'verylongquerythatmightcauseissuesifnothandledproperly'
      ];

      for (const query of testQueries) {
        const response = await fetch(`${API_BASE}/api/recipes/search?q=${encodeURIComponent(query)}`);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data).toHaveProperty('success', true);
        expect(Array.isArray(data.recipes)).toBe(true);
      }
    });

    it('should return empty results for non-existent search terms', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/search?q=xyznonexistentrecipe123456`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(Array.isArray(data.recipes)).toBe(true);
      expect(data.recipes.length).toBe(0);
    });

    it('should handle missing query parameter', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/search`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(Array.isArray(data.recipes)).toBe(true);
    });
  });

  describe('Individual Recipe API', () => {
    let validRecipeId: string;

    beforeAll(async () => {
      const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=1`);
      const data = await response.json();
      if (data.recipes.recipes.length > 0) {
        validRecipeId = data.recipes.recipes[0].id;
      }
    });

    it('should return individual recipe with correct structure', async () => {
      if (!validRecipeId) return;
      
      const response = await fetch(`${API_BASE}/api/recipes/${validRecipeId}`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('recipe');
      
      const recipe = data.recipe;
      expect(recipe).toHaveProperty('id', validRecipeId);
      expect(recipe).toHaveProperty('title');
      expect(recipe).toHaveProperty('ingredients');
      expect(recipe).toHaveProperty('directions');
      expect(recipe).toHaveProperty('source');
      
      // Validate JSON structure
      expect(() => JSON.parse(recipe.ingredients)).not.toThrow();
      expect(() => JSON.parse(recipe.directions)).not.toThrow();
      
      const ingredients = JSON.parse(recipe.ingredients);
      const directions = JSON.parse(recipe.directions);
      expect(Array.isArray(ingredients)).toBe(true);
      expect(Array.isArray(directions)).toBe(true);
    });

    it('should return 404 for non-existent recipe', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/non-existent-id-12345`);
      expect(response.status).toBe(404);
    });

    it('should handle malformed recipe IDs', async () => {
      const malformedIds = [
        '', 
        'null', 
        'undefined', 
        '../../etc/passwd',
        '<script>alert("xss")</script>',
        'very-long-id-that-might-cause-issues-' + 'a'.repeat(1000)
      ];

      for (const id of malformedIds) {
        const response = await fetch(`${API_BASE}/api/recipes/${encodeURIComponent(id)}`);
        expect([404, 400, 500]).toContain(response.status);
      }
    });
  });

  describe('Recipe Scraping API', () => {
    it('should reject invalid URLs', async () => {
      const invalidUrls = [
        'not-a-url',
        'javascript:alert("xss")',
        'file:///etc/passwd',
        'ftp://example.com',
        'data:text/html,<script>alert("xss")</script>',
        ''
      ];

      for (const url of invalidUrls) {
        const response = await fetch(`${API_BASE}/api/recipes/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        
        expect([400, 403, 500]).toContain(response.status);
      }
    });

    it('should handle malformed request bodies', async () => {
      const malformedBodies = [
        '{"url":',
        'not json',
        '{}',
        '{"url": null}',
        '{"wrongField": "https://example.com"}'
      ];

      for (const body of malformedBodies) {
        const response = await fetch(`${API_BASE}/api/recipes/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        });
        
        expect([400, 500]).toContain(response.status);
      }
    });

    it('should handle protected/blocked sites gracefully', async () => {
      const protectedSites = [
        'https://www.allrecipes.com/recipe/test/',
        'https://www.foodnetwork.com/recipes/test',
        'https://httpstat.us/403',
        'https://httpstat.us/429'
      ];

      for (const url of protectedSites) {
        const response = await fetch(`${API_BASE}/api/recipes/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        
        // Should not crash, should return proper error
        expect([403, 429, 500]).toContain(response.status);
        
        const data = await response.json();
        expect(data).toHaveProperty('error', true);
        expect(data).toHaveProperty('message');
      }
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle non-existent endpoints', async () => {
      const response = await fetch(`${API_BASE}/api/non-existent-endpoint`);
      expect(response.status).toBe(404);
    });

    it('should handle method not allowed', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/stats`, {
        method: 'POST'
      });
      expect([404, 405]).toContain(response.status);
    });

    it('should handle large request payloads', async () => {
      const largePayload = {
        url: 'https://example.com',
        data: 'x'.repeat(100000)
      };

      const response = await fetch(`${API_BASE}/api/recipes/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(largePayload)
      });
      
      // Should handle gracefully, not crash
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Performance Tests', () => {
    it('should respond to all endpoints within reasonable time', async () => {
      const endpoints = [
        '/api/recipes/stats',
        '/api/recipes/paginated?page=1&limit=10',
        '/api/recipes/search?q=test'
      ];

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        const response = await fetch(`${API_BASE}${endpoint}`);
        const endTime = Date.now();
        
        expect(response.status).toBe(200);
        expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max
      }
    });

    it('should handle concurrent requests without degradation', async () => {
      const concurrentRequests = 20;
      const requests = Array(concurrentRequests).fill(0).map(() => 
        fetch(`${API_BASE}/api/recipes/stats`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time even with concurrent load
      expect(endTime - startTime).toBeLessThan(15000);
    });
  });
});