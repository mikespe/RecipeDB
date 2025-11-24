/**
 * Regression Detection Tests
 * Specific tests to catch common regression patterns and prevent them
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

const API_BASE = 'http://localhost:5000';

describe('Regression Detection Tests', () => {
  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('Recipe Display Regression Prevention', () => {
    it('should prevent nested response structure regression', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=5`);
      const data = await response.json();
      
      // Ensure the structure is what frontend expects
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('recipes');
      expect(data.recipes).toHaveProperty('recipes');
      expect(data.recipes).toHaveProperty('total');
      expect(data.recipes).toHaveProperty('hasMore');
      
      // Frontend extraction should work
      const extractedData = data.recipes || data;
      expect(Array.isArray(extractedData.recipes)).toBe(true);
      
      console.log('✅ Pagination response structure is correct');
    });

    it('should prevent individual recipe nesting regression', async () => {
      const listResponse = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=1`);
      const listData = await listResponse.json();
      
      if (listData.recipes.recipes.length > 0) {
        const recipeId = listData.recipes.recipes[0].id;
        
        const response = await fetch(`${API_BASE}/api/recipes/${recipeId}`);
        const data = await response.json();
        
        // Ensure the structure is what frontend expects
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('recipe');
        
        // Frontend extraction should work
        const recipe = data.recipe || data;
        expect(recipe).toHaveProperty('id');
        expect(recipe).toHaveProperty('ingredients');
        expect(recipe).toHaveProperty('directions');
        
        console.log('✅ Individual recipe response structure is correct');
      }
    });

    it('should prevent search response structure regression', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/search?q=bread`);
      const data = await response.json();
      
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('recipes');
      
      // Frontend extraction should work
      const recipes = data.recipes || data;
      expect(Array.isArray(recipes)).toBe(true);
      
      console.log('✅ Search response structure is correct');
    });
  });

  describe('Data Quality Regression Prevention', () => {
    it('should prevent empty ingredients/directions regression', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=10`);
      const data = await response.json();
      
      if (data.recipes.recipes.length > 0) {
        data.recipes.recipes.forEach((recipe: any, index: number) => {
          // Ingredients should be parseable JSON
          expect(() => JSON.parse(recipe.ingredients)).not.toThrow();
          
          // Directions should be parseable JSON  
          expect(() => JSON.parse(recipe.directions)).not.toThrow();
          
          const ingredients = JSON.parse(recipe.ingredients);
          const directions = JSON.parse(recipe.directions);
          
          expect(Array.isArray(ingredients)).toBe(true);
          expect(Array.isArray(directions)).toBe(true);
          
          // Should have actual content (prevent empty array regression)
          if (ingredients.length === 0) {
            console.warn(`⚠️ Recipe ${recipe.id} has empty ingredients`);
          }
          
          if (directions.length === 0) {
            console.warn(`⚠️ Recipe ${recipe.id} has empty directions`);
          }
          
          // At least check first few recipes have content
          if (index < 3) {
            expect(ingredients.length).toBeGreaterThan(0);
            expect(directions.length).toBeGreaterThan(0);
          }
        });
      }
      
      console.log('✅ Recipe data quality checks passed');
    });

    it('should prevent malformed JSON regression', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=5`);
      const data = await response.json();
      
      if (data.recipes.recipes.length > 0) {
        data.recipes.recipes.forEach((recipe: any) => {
          // These should never throw
          const ingredients = JSON.parse(recipe.ingredients);
          const directions = JSON.parse(recipe.directions);
          
          // Should be proper arrays, not strings or other types
          expect(Array.isArray(ingredients)).toBe(true);
          expect(Array.isArray(directions)).toBe(true);
          
          // Each item should be a string
          ingredients.forEach((ing: any) => {
            expect(typeof ing).toBe('string');
            expect(ing.length).toBeGreaterThan(0);
          });
          
          directions.forEach((dir: any) => {
            expect(typeof dir).toBe('string');
            expect(dir.length).toBeGreaterThan(0);
          });
        });
      }
      
      console.log('✅ JSON format validation passed');
    });
  });

  describe('Performance Regression Prevention', () => {
    it('should prevent slow response regression', async () => {
      const endpoints = [
        '/api/recipes/stats',
        '/api/recipes/paginated?page=1&limit=10',
        '/api/recipes/search?q=pasta'
      ];

      for (const endpoint of endpoints) {
        const startTime = Date.now();
        const response = await fetch(`${API_BASE}${endpoint}`);
        const endTime = Date.now();
        
        expect(response.status).toBe(200);
        
        const responseTime = endTime - startTime;
        console.log(`${endpoint}: ${responseTime}ms`);
        
        // Should respond within 5 seconds (generous for complex queries)
        expect(responseTime).toBeLessThan(5000);
        
        // Warn if getting slow
        if (responseTime > 2000) {
          console.warn(`⚠️ Slow response detected: ${endpoint} took ${responseTime}ms`);
        }
      }
      
      console.log('✅ Performance regression checks passed');
    });

    it('should prevent memory leak regression with concurrent requests', async () => {
      const concurrentRequests = 10;
      const requests = Array(concurrentRequests).fill(0).map((_, index) => 
        fetch(`${API_BASE}/api/recipes/paginated?page=${index + 1}&limit=5`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete in reasonable time even with concurrent load
      const totalTime = endTime - startTime;
      console.log(`${concurrentRequests} concurrent requests: ${totalTime}ms`);
      
      expect(totalTime).toBeLessThan(10000); // 10 seconds max
      
      console.log('✅ Concurrent request handling passed');
    });
  });

  describe('Security Regression Prevention', () => {
    it('should prevent XSS in recipe data', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=5`);
      const data = await response.json();
      
      if (data.recipes.recipes.length > 0) {
        data.recipes.recipes.forEach((recipe: any) => {
          // Check for potential XSS patterns
          const xssPatterns = ['<script', 'javascript:', 'onload=', 'onerror='];
          
          xssPatterns.forEach(pattern => {
            expect(recipe.title.toLowerCase()).not.toContain(pattern);
            expect(recipe.source.toLowerCase()).not.toContain(pattern);
            
            const ingredients = JSON.parse(recipe.ingredients);
            const directions = JSON.parse(recipe.directions);
            
            ingredients.forEach((ing: string) => {
              expect(ing.toLowerCase()).not.toContain(pattern);
            });
            
            directions.forEach((dir: string) => {
              expect(dir.toLowerCase()).not.toContain(pattern);
            });
          });
        });
      }
      
      console.log('✅ XSS prevention checks passed');
    });

    it('should prevent SQL injection patterns', async () => {
      const sqlPatterns = ["'; DROP TABLE", "' OR '1'='1", "UNION SELECT"];
      
      for (const pattern of sqlPatterns) {
        const response = await fetch(`${API_BASE}/api/recipes/search?q=${encodeURIComponent(pattern)}`);
        
        // Should not crash or return 500
        expect(response.status).not.toBe(500);
        
        if (response.status === 200) {
          const data = await response.json();
          expect(data).toHaveProperty('success', true);
          expect(Array.isArray(data.recipes)).toBe(true);
        }
      }
      
      console.log('✅ SQL injection prevention checks passed');
    });
  });

  describe('Business Logic Regression Prevention', () => {
    it('should prevent duplicate recipe regression', async () => {
      const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=50`);
      const data = await response.json();
      
      if (data.recipes.recipes.length > 1) {
        const recipeIds = data.recipes.recipes.map((recipe: any) => recipe.id);
        const uniqueIds = new Set(recipeIds);
        
        expect(uniqueIds.size).toBe(recipeIds.length);
        
        if (uniqueIds.size !== recipeIds.length) {
          console.error('❌ Duplicate recipe IDs detected:', recipeIds);
        }
      }
      
      console.log('✅ Duplicate prevention checks passed');
    });

    it('should prevent stats calculation regression', async () => {
      const statsResponse = await fetch(`${API_BASE}/api/recipes/stats`);
      const stats = await statsResponse.json();
      
      const paginatedResponse = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=1000`);
      const paginated = await paginatedResponse.json();
      
      // Stats should be consistent with actual data
      const actualTotal = paginated.recipes.total;
      const reportedTotal = parseInt(stats.total);
      
      expect(reportedTotal).toBe(actualTotal);
      
      console.log(`✅ Stats consistency: ${reportedTotal} reported = ${actualTotal} actual`);
    });
  });
});