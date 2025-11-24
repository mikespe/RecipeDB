/**
 * Debug Tests for Recipe Display Issues
 */

import { describe, it, expect } from '@jest/globals';

const API_BASE = 'http://localhost:5000';

describe('Recipe Display Debug Tests', () => {
  it('should verify paginated API structure matches frontend expectations', async () => {
    const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=2`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    console.log('Paginated API Response Structure:', JSON.stringify(data, null, 2));
    
    // Check the structure
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('recipes');
    expect(data.recipes).toHaveProperty('recipes');
    expect(data.recipes).toHaveProperty('total');
    expect(data.recipes).toHaveProperty('hasMore');
    
    // Simulate frontend extraction
    const extractedData = data.recipes || data;
    expect(Array.isArray(extractedData.recipes)).toBe(true);
    
    if (extractedData.recipes.length > 0) {
      const recipe = extractedData.recipes[0];
      expect(recipe).toHaveProperty('id');
      expect(recipe).toHaveProperty('title');
      expect(recipe).toHaveProperty('ingredients');
      expect(recipe).toHaveProperty('directions');
      
      // Test JSON parsing
      const ingredients = JSON.parse(recipe.ingredients);
      const directions = JSON.parse(recipe.directions);
      
      console.log('Sample Recipe Ingredients Count:', ingredients.length);
      console.log('Sample Recipe Directions Count:', directions.length);
      
      expect(Array.isArray(ingredients)).toBe(true);
      expect(Array.isArray(directions)).toBe(true);
      expect(ingredients.length).toBeGreaterThan(0);
      expect(directions.length).toBeGreaterThan(0);
    }
  });

  it('should verify individual recipe API structure', async () => {
    // First get a recipe ID
    const listResponse = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=1`);
    const listData = await listResponse.json();
    
    if (listData.recipes.recipes.length > 0) {
      const recipeId = listData.recipes.recipes[0].id;
      
      const response = await fetch(`${API_BASE}/api/recipes/${recipeId}`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      console.log('Individual Recipe API Response Structure:', JSON.stringify(data, null, 2));
      
      // Check the structure
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('recipe');
      
      // Simulate frontend extraction
      const recipe = data.recipe || data;
      expect(recipe).toHaveProperty('id');
      expect(recipe).toHaveProperty('title');
      expect(recipe).toHaveProperty('ingredients');
      expect(recipe).toHaveProperty('directions');
      
      // Test JSON parsing
      const ingredients = JSON.parse(recipe.ingredients);
      const directions = JSON.parse(recipe.directions);
      
      console.log('Individual Recipe Ingredients:', ingredients);
      console.log('Individual Recipe Directions:', directions);
      
      expect(Array.isArray(ingredients)).toBe(true);
      expect(Array.isArray(directions)).toBe(true);
      expect(ingredients.length).toBeGreaterThan(0);
      expect(directions.length).toBeGreaterThan(0);
    }
  });

  it('should verify search API returns correct structure', async () => {
    const response = await fetch(`${API_BASE}/api/recipes/search?q=bread`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    console.log('Search API Response Structure:', JSON.stringify(data, null, 2));
    
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('recipes');
    
    // Simulate frontend extraction
    const recipes = data.recipes || data;
    expect(Array.isArray(recipes)).toBe(true);
    
    if (recipes.length > 0) {
      const recipe = recipes[0];
      expect(recipe).toHaveProperty('id');
      expect(recipe).toHaveProperty('title');
      expect(recipe).toHaveProperty('ingredients');
      expect(recipe).toHaveProperty('directions');
      
      console.log('Search Recipe Sample:', {
        id: recipe.id,
        title: recipe.title,
        ingredientsLength: JSON.parse(recipe.ingredients).length,
        directionsLength: JSON.parse(recipe.directions).length
      });
    }
  });
});