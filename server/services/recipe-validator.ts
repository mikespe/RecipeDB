/**
 * Recipe validation service - follows Single Responsibility Principle
 */

export interface RecipeData {
  title: string;
  description?: string;
  ingredients: string[];
  directions: string[];
  source?: string;
  imageUrl?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  servings?: number;
  category?: string;
  cuisine?: string;
  tags?: string[];
}

export class RecipeValidator {
  private static readonly MIN_TITLE_LENGTH = 3;
  private static readonly MIN_INGREDIENTS = 1;
  private static readonly MIN_DIRECTIONS = 1;
  private static readonly MAX_IMAGES = 2;

  /**
   * Validate recipe data completeness
   */
  static isValidRecipe(data: Partial<RecipeData>): data is RecipeData {
    return !!(
      data.title &&
      data.title.length >= this.MIN_TITLE_LENGTH &&
      data.ingredients &&
      data.ingredients.length >= this.MIN_INGREDIENTS &&
      data.directions &&
      data.directions.length >= this.MIN_DIRECTIONS
    );
  }

  /**
   * Clean and normalize recipe data
   */
  static normalizeRecipeData(data: Partial<RecipeData>): RecipeData | null {
    if (!this.isValidRecipe(data)) {
      return null;
    }

    return {
      title: data.title.trim(),
      description: typeof data.description === 'string' ? data.description.trim() || undefined : undefined,
      ingredients: data.ingredients.map(ing => ing.trim()).filter(Boolean),
      directions: data.directions.map(dir => dir.trim()).filter(Boolean),
      source: typeof data.source === 'string' ? data.source.trim() || undefined : undefined,
      imageUrl: typeof data.imageUrl === 'string' ? (data.imageUrl.trim() || undefined) : undefined,
      prepTimeMinutes: data.prepTimeMinutes ?? undefined,
      cookTimeMinutes: data.cookTimeMinutes ?? undefined,
      totalTimeMinutes: data.totalTimeMinutes ?? undefined,
      servings: data.servings ?? undefined,
      category: typeof data.category === 'string' ? data.category.trim() || undefined : undefined,
      cuisine: typeof data.cuisine === 'string' ? data.cuisine.trim() || undefined : undefined,
      tags: data.tags?.filter(Boolean) ?? undefined
    };
  }

  /**
   * Check if video content looks like a recipe
   */
  static isRecipeVideo(title: string, description: string = ''): boolean {
    const recipeKeywords = [
      'recipe', 'cooking', 'how to make', 'baking', 'cook', 'bake',
      'ingredients', 'tutorial', 'easy', 'homemade', 'step by step',
      'kitchen', 'food', 'dish', 'meal', 'prep', 'preparation',
      'breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'appetizer',
      'sauce', 'soup', 'salad', 'pasta', 'bread', 'cake', 'cookie',
      'pie', 'pizza', 'grill', 'fry', 'roast', 'sauté', 'boil',
      'seasoning', 'spice', 'herb', 'dough', 'batter', 'quick recipe',
      'tasty', 'delicious', 'yummy', 'chef', 'cuisine', 'culinary',
      'foodie', 'nutrition', 'healthy', 'diet', 'vegan', 'vegetarian'
    ];

    const content = (title + ' ' + description).toLowerCase();
    console.log(`Checking recipe video with content: "${content.substring(0, 300)}..."`);

    // Look for any recipe-related keywords (reduced from 2+ to 1+ for now)
    const matchedKeywords = recipeKeywords.filter(keyword => content.includes(keyword));
    console.log(`Matched keywords: ${matchedKeywords.join(', ')}`);

    return matchedKeywords.length >= 1;
  }
}