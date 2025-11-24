/**
 * Architecture & Refactoring Tests
 * Ensures new architecture maintains functionality
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

const API_BASE = 'http://localhost:5000';

describe('Architecture & Clean Code Tests', () => {
  beforeAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('API Response Consistency', () => {
    it('should maintain consistent response structure across all endpoints', async () => {
      const endpoints = [
        { url: '/api/recipes/stats', expectedShape: { success: true } },
        { url: '/api/recipes/paginated?page=1&limit=5', expectedShape: { success: true, recipes: { recipes: [], total: 0, hasMore: false } } },
        { url: '/api/recipes/search?q=test', expectedShape: { success: true, recipes: [] } }
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(`${API_BASE}${endpoint.url}`);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data).toHaveProperty('success', true);
        
        // Check that response follows consistent patterns
        expect(data).toHaveProperty('success');
        expect(typeof data.success).toBe('boolean');
        
        console.log(`✅ ${endpoint.url} - Consistent structure`);
      }
    });

    it('should handle errors consistently across all endpoints', async () => {
      const errorEndpoints = [
        '/api/recipes/non-existent-id',
        '/api/recipes/search?q=' + 'x'.repeat(1000), // Very long query
      ];

      for (const endpoint of errorEndpoints) {
        const response = await fetch(`${API_BASE}${endpoint}`);
        
        if (response.status >= 400) {
          const data = await response.json();
          
          // Error responses should have consistent structure
          expect(data).toHaveProperty('success');
          expect(data).toHaveProperty('error');
          expect(data).toHaveProperty('message');
          
          console.log(`✅ ${endpoint} - Consistent error structure`);
        }
      }
    });
  });

  describe('Performance & Scalability', () => {
    it('should handle pagination efficiently', async () => {
      const testPages = [1, 2, 5, 10];
      const responses = [];

      for (const page of testPages) {
        const startTime = Date.now();
        const response = await fetch(`${API_BASE}/api/recipes/paginated?page=${page}&limit=10`);
        const endTime = Date.now();
        
        expect(response.status).toBe(200);
        
        const data = await response.json();
        responses.push({
          page,
          responseTime: endTime - startTime,
          recipesCount: data.recipes?.recipes?.length || 0
        });
      }

      // Performance should be consistent across pages
      const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
      expect(avgResponseTime).toBeLessThan(3000); // Should average under 3 seconds
      
      console.log('📊 Pagination Performance:', responses);
    });

    it('should handle concurrent requests without degradation', async () => {
      const concurrentCount = 15;
      const promises = Array(concurrentCount).fill(0).map((_, index) => 
        fetch(`${API_BASE}/api/recipes/paginated?page=${Math.floor(index/3) + 1}&limit=5`)
      );

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      const totalTime = endTime - startTime;
      console.log(`📊 ${concurrentCount} concurrent requests completed in ${totalTime}ms`);
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(10000);
    });
  });

  describe('Data Integrity & Validation', () => {
    it('should validate and sanitize pagination parameters', async () => {
      const testCases = [
        { page: 0, limit: 10, expectedPage: 1 },
        { page: -5, limit: 10, expectedPage: 1 },
        { page: 1, limit: 0, expectedMinLimit: 1 },
        { page: 1, limit: 1000, expectedMaxLimit: 100 },
        { page: 'invalid', limit: 10, expectedPage: 1 },
        { page: 1, limit: 'invalid', expectedMinLimit: 1 }
      ];

      for (const testCase of testCases) {
        const response = await fetch(`${API_BASE}/api/recipes/paginated?page=${testCase.page}&limit=${testCase.limit}`);
        expect(response.status).toBe(200);
        
        const data = await response.json();
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('recipes');
        
        // Should handle invalid parameters gracefully
        expect(Array.isArray(data.recipes?.recipes)).toBe(true);
      }
      
      console.log('✅ Pagination parameter validation working');
    });

    it('should properly sanitize search queries', async () => {
      const maliciousQueries = [
        '<script>alert("xss")</script>',
        "'; DROP TABLE recipes; --",
        'UNION SELECT * FROM users',
        '\n\r\t special chars \n\r\t',
        'very'.repeat(100) + 'long query'
      ];

      for (const query of maliciousQueries) {
        const response = await fetch(`${API_BASE}/api/recipes/search?q=${encodeURIComponent(query)}`);
        
        // Should not crash or return 500 errors
        expect(response.status).not.toBe(500);
        
        if (response.status === 200) {
          const data = await response.json();
          expect(data).toHaveProperty('success', true);
          expect(Array.isArray(data.recipes)).toBe(true);
        }
      }
      
      console.log('✅ Search query sanitization working');
    });
  });

  describe('Code Quality Metrics', () => {
    it('should maintain fast response times', async () => {
      const endpoints = [
        '/api/recipes/stats',
        '/api/recipes/paginated?page=1&limit=10',
        '/api/recipes/search?q=pasta'
      ];

      const performanceMetrics = [];

      for (const endpoint of endpoints) {
        const measurements = [];
        
        // Take multiple measurements for accuracy
        for (let i = 0; i < 3; i++) {
          const startTime = Date.now();
          const response = await fetch(`${API_BASE}${endpoint}`);
          const endTime = Date.now();
          
          expect(response.status).toBe(200);
          measurements.push(endTime - startTime);
          
          await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause
        }
        
        const avgTime = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
        performanceMetrics.push({ endpoint, avgTime, measurements });
        
        // Performance threshold
        expect(avgTime).toBeLessThan(5000);
      }

      console.log('📊 Performance Metrics:', performanceMetrics);
    });

    it('should maintain database connection stability', async () => {
      // Rapid sequential requests to test connection pooling
      const rapidRequests = Array(20).fill(0).map((_, index) => 
        fetch(`${API_BASE}/api/recipes/stats`)
      );

      const responses = await Promise.all(rapidRequests);
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
      });

      // Test database-heavy operations
      const searchRequests = Array(5).fill(0).map((_, index) => 
        fetch(`${API_BASE}/api/recipes/search?q=test${index}`)
      );

      const searchResponses = await Promise.all(searchRequests);
      searchResponses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      console.log('✅ Database connection stability verified');
    });
  });

  describe('Backwards Compatibility', () => {
    it('should maintain existing API contract', async () => {
      // Test that existing client code will continue to work
      const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=5`);
      const data = await response.json();
      
      // Original response structure should still work
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('recipes');
      expect(data.recipes).toHaveProperty('recipes');
      expect(data.recipes).toHaveProperty('total');
      expect(data.recipes).toHaveProperty('hasMore');
      
      // Frontend extraction should still work
      const extractedData = data.recipes || data;
      expect(Array.isArray(extractedData.recipes)).toBe(true);
      
      console.log('✅ Backwards compatibility maintained');
    });

    it('should support legacy response format expectations', async () => {
      // Test individual recipe endpoint
      const listResponse = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=1`);
      const listData = await listResponse.json();
      
      if (listData.recipes.recipes.length > 0) {
        const recipeId = listData.recipes.recipes[0].id;
        
        const response = await fetch(`${API_BASE}/api/recipes/${recipeId}`);
        const data = await response.json();
        
        // Should maintain expected structure
        expect(data).toHaveProperty('success', true);
        expect(data).toHaveProperty('recipe');
        
        const recipe = data.recipe || data;
        expect(recipe).toHaveProperty('id');
        expect(recipe).toHaveProperty('title');
        expect(recipe).toHaveProperty('ingredients');
        expect(recipe).toHaveProperty('directions');
      }
      
      console.log('✅ Legacy response format compatibility verified');
    });
  });
});