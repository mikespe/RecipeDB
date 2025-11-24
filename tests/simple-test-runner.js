/**
 * Simple Test Runner - Manual validation without Jest complexity
 */

const API_BASE = 'http://localhost:5000';

// Simple assertion helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Test runner
async function runTest(name, testFn) {
  try {
    console.log(`🧪 Running: ${name}`);
    await testFn();
    console.log(`✅ PASSED: ${name}`);
    return true;
  } catch (error) {
    console.error(`❌ FAILED: ${name} - ${error.message}`);
    return false;
  }
}

// Test suite
async function runAllTests() {
  console.log('🚀 Starting comprehensive test suite...\n');
  
  const tests = [
    ['API Response Structure - Stats', testStatsApi],
    ['API Response Structure - Pagination', testPaginationApi],
    ['API Response Structure - Search', testSearchApi],
    ['API Response Structure - Individual Recipe', testIndividualRecipe],
    ['Data Integrity - Recipe Content', testRecipeDataIntegrity],
    ['Error Handling - Invalid Requests', testErrorHandling],
    ['Performance - Response Times', testPerformance],
    ['Security - Input Validation', testInputValidation],
    ['Regression Prevention - Display Issues', testDisplayRegression]
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const [name, testFn] of tests) {
    const success = await runTest(name, testFn);
    if (success) passed++;
    else failed++;
    console.log(''); // Add spacing
  }
  
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Application is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Review the issues above.');
  }
  
  return failed === 0;
}

// Test implementations
async function testStatsApi() {
  const response = await fetch(`${API_BASE}/api/recipes/stats`);
  assert(response.status === 200, 'Stats API should return 200');
  
  const data = await response.json();
  assert(data.success === true, 'Stats should have success: true');
  assert(typeof data.total === 'string', 'Total should be a string');
  assert(typeof data.autoScraped === 'string', 'AutoScraped should be a string');
  assert(typeof data.userAdded === 'number', 'UserAdded should be a number');
  
  const total = parseInt(data.total);
  assert(total > 0, 'Should have at least some recipes');
  
  console.log(`   📈 Found ${data.total} total recipes`);
}

async function testPaginationApi() {
  const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=5`);
  assert(response.status === 200, 'Pagination API should return 200');
  
  const data = await response.json();
  assert(data.success === true, 'Should have success: true');
  assert(data.recipes !== undefined, 'Should have recipes object');
  assert(Array.isArray(data.recipes.recipes), 'Recipes should be an array');
  // Handle both string and number total values for backwards compatibility
  const total = typeof data.recipes.total === 'string' ? parseInt(data.recipes.total) : data.recipes.total;
  assert(typeof total === 'number' && !isNaN(total), 'Total should be a valid number');
  assert(typeof data.recipes.hasMore === 'boolean', 'HasMore should be a boolean');
  
  // Test frontend compatibility
  const extractedData = data.recipes || data;
  assert(Array.isArray(extractedData.recipes), 'Frontend extraction should work');
  
  console.log(`   📄 Retrieved ${data.recipes.recipes.length} recipes`);
}

async function testSearchApi() {
  const response = await fetch(`${API_BASE}/api/recipes/search?q=bread`);
  assert(response.status === 200, 'Search API should return 200');
  
  const data = await response.json();
  assert(data.success === true, 'Should have success: true');
  assert(Array.isArray(data.recipes), 'Recipes should be an array');
  
  // Test frontend compatibility
  const recipes = data.recipes || data;
  assert(Array.isArray(recipes), 'Frontend extraction should work');
  
  console.log(`   🔍 Search returned ${data.recipes.length} results`);
}

async function testIndividualRecipe() {
  // First get a recipe ID
  const listResponse = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=1`);
  const listData = await listResponse.json();
  
  if (listData.recipes.recipes.length === 0) {
    console.log('   ⚠️ No recipes available for individual test');
    return;
  }
  
  const recipeId = listData.recipes.recipes[0].id;
  
  const response = await fetch(`${API_BASE}/api/recipes/${recipeId}`);
  assert(response.status === 200, 'Individual recipe API should return 200');
  
  const data = await response.json();
  assert(data.success === true, 'Should have success: true');
  assert(data.recipe !== undefined, 'Should have recipe object');
  
  // Test frontend compatibility
  const recipe = data.recipe || data;
  assert(recipe.id === recipeId, 'Should return correct recipe');
  assert(typeof recipe.title === 'string', 'Should have title');
  assert(typeof recipe.ingredients === 'string', 'Should have ingredients');
  assert(typeof recipe.directions === 'string', 'Should have directions');
  
  // Test JSON parsing
  const ingredients = JSON.parse(recipe.ingredients);
  const directions = JSON.parse(recipe.directions);
  assert(Array.isArray(ingredients), 'Ingredients should be parseable array');
  assert(Array.isArray(directions), 'Directions should be parseable array');
  
  console.log(`   🍽️ Recipe "${recipe.title}" has ${ingredients.length} ingredients, ${directions.length} directions`);
}

async function testRecipeDataIntegrity() {
  const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=10`);
  const data = await response.json();
  
  if (data.recipes.recipes.length === 0) {
    console.log('   ⚠️ No recipes available for data integrity test');
    return;
  }
  
  let validRecipes = 0;
  
  for (const recipe of data.recipes.recipes) {
    try {
      // Test JSON parsing
      const ingredients = JSON.parse(recipe.ingredients);
      const directions = JSON.parse(recipe.directions);
      
      assert(Array.isArray(ingredients), `Recipe ${recipe.id} ingredients should be array`);
      assert(Array.isArray(directions), `Recipe ${recipe.id} directions should be array`);
      assert(ingredients.length > 0, `Recipe ${recipe.id} should have ingredients`);
      assert(directions.length > 0, `Recipe ${recipe.id} should have directions`);
      
      validRecipes++;
    } catch (error) {
      console.log(`   ⚠️ Recipe ${recipe.id} has data issues: ${error.message}`);
    }
  }
  
  assert(validRecipes > 0, 'Should have at least some valid recipes');
  console.log(`   ✅ ${validRecipes}/${data.recipes.recipes.length} recipes have valid data`);
}

async function testErrorHandling() {
  // Test non-existent recipe
  const response1 = await fetch(`${API_BASE}/api/recipes/non-existent-id`);
  assert(response1.status === 404, 'Non-existent recipe should return 404');
  
  // Test malformed scraping request
  const response2 = await fetch(`${API_BASE}/api/recipes/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'not-a-url' })
  });
  assert(response2.status >= 400, 'Invalid URL should return error status');
  
  console.log('   🛡️ Error handling working correctly');
}

async function testPerformance() {
  const startTime = Date.now();
  
  const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=10`);
  assert(response.status === 200, 'Performance test request should succeed');
  
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  assert(responseTime < 5000, 'Response should be under 5 seconds');
  console.log(`   ⚡ Response time: ${responseTime}ms`);
}

async function testInputValidation() {
  // Test pagination parameter validation - should return 200 with sanitized params
  const response1 = await fetch(`${API_BASE}/api/recipes/paginated?page=-1&limit=0`);
  assert(response1.status === 200, 'Should handle invalid pagination gracefully');
  
  // Test search with special characters
  const response2 = await fetch(`${API_BASE}/api/recipes/search?q=${encodeURIComponent('<script>alert("xss")</script>')}`);
  assert(response2.status === 200, 'Should handle XSS attempts gracefully');
  
  console.log('   🔒 Input validation working correctly');
}

async function testDisplayRegression() {
  // This was the original bug - ensure it doesn't happen again
  const response = await fetch(`${API_BASE}/api/recipes/paginated?page=1&limit=5`);
  const data = await response.json();
  
  // Critical: ensure the response structure is what frontend expects
  assert(data.success === true, 'Should have success flag');
  assert(data.recipes !== undefined, 'Should have recipes object');
  assert(data.recipes.recipes !== undefined, 'Should have nested recipes array');
  
  // Frontend extraction should work
  const extractedData = data.recipes || data;
  assert(Array.isArray(extractedData.recipes), 'Frontend extraction should work');
  
  if (extractedData.recipes.length > 0) {
    const recipe = extractedData.recipes[0];
    const ingredients = JSON.parse(recipe.ingredients);
    const directions = JSON.parse(recipe.directions);
    
    assert(ingredients.length > 0, 'Ingredients should not be empty (display regression)');
    assert(directions.length > 0, 'Directions should not be empty (display regression)');
  }
  
  console.log('   🚫 Display regression prevention confirmed');
}

// Run the tests
runAllTests().catch(console.error);