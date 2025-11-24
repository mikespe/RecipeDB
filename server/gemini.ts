import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface RecipeData {
  title: string;
  ingredients: string[];
  instructions: string[];
  prepTime?: number;
  cookTime?: number;
  totalTime?: number;
  servings?: number;
}

export async function extractRecipeWithGemini(
  content: string,
  videoTitle?: string,
  isTranscript: boolean = false
): Promise<RecipeData | null> {
  try {
    console.log(`Using Gemini to extract recipe from ${isTranscript ? 'transcript' : 'content'}`);
    
    const contentType = isTranscript ? 'video transcript' : 'video title and description';
    
    const prompt = `
You are a recipe extraction expert. Extract detailed recipe information from this YouTube ${contentType}.

${videoTitle ? `Video Title: ${videoTitle}` : ''}

Content:
${content}

Extract and format as JSON with this exact structure:
{
  "title": "Recipe name (clean, descriptive)",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "prepTime": number_in_minutes_or_null,
  "cookTime": number_in_minutes_or_null,
  "totalTime": number_in_minutes_or_null,
  "servings": number_or_null
}

STRICT QUALITY REQUIREMENTS:
- Only extract complete, authentic recipes with sufficient detail
- Must have at least 4-5 actual ingredients with quantities when possible
- Must have at least 3-4 detailed cooking steps
- Do NOT create placeholder content or fill in missing information
- Do NOT extract if the content lacks sufficient recipe details
- Return null if you cannot extract a complete, accurate recipe
- Quality over quantity - incomplete recipes are not acceptable
`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens: 1000,
        responseMimeType: "application/json"
      }
    });

    const response = await result.response;
    const text = response.text();

    if (!text) {
      console.log('No response from Gemini');
      return null;
    }

    // Parse the JSON response
    const recipeData = JSON.parse(text);
    
    // Validate that we have minimum required fields
    if (!recipeData.title || !recipeData.ingredients || !recipeData.instructions) {
      console.log('Incomplete recipe data from Gemini');
      return null;
    }

    // Ensure arrays are valid
    if (!Array.isArray(recipeData.ingredients) || !Array.isArray(recipeData.instructions)) {
      console.log('Invalid array format in recipe data');
      return null;
    }

    // Filter out empty or too short ingredients/instructions
    recipeData.ingredients = recipeData.ingredients.filter((ing: string) => 
      typeof ing === 'string' && ing.trim().length > 2
    );
    recipeData.instructions = recipeData.instructions.filter((inst: string) => 
      typeof inst === 'string' && inst.trim().length > 5
    );

    // Validate we still have content after filtering
    if (recipeData.ingredients.length === 0 || recipeData.instructions.length === 0) {
      console.log('No valid ingredients or instructions found');
      return null;
    }

    // Check for placeholder/synthetic content - enforce data integrity
    const ingredientText = recipeData.ingredients.join(' ').toLowerCase();
    const instructionText = recipeData.instructions.join(' ').toLowerCase();
    const title = (recipeData.title || '').toLowerCase();

    // Reject placeholder ingredients
    if (ingredientText.includes('unspecified') || 
        ingredientText.includes('ingredients (if available)') ||
        ingredientText.includes('not specified') ||
        ingredientText.includes('various ingredients') ||
        ingredientText.includes('unspecified ingredients')) {
      console.log('Rejected: Placeholder ingredients detected');
      return null;
    }

    // Reject placeholder instructions
    if (instructionText.includes('according to the recipe (if available)') || 
        instructionText.includes('prepare the ingredients according to') ||
        instructionText.includes('cook according to the recipe') ||
        instructionText.includes('follow the recipe') ||
        instructionText.includes('according to the video') ||
        instructionText.includes('gather all ingredients')) {
      console.log('Rejected: Placeholder instructions detected');
      return null;
    }

    // Reject generic titles
    if (title.includes('youtube recipe') || 
        title.includes('simple dish from youtube') ||
        title.includes('recipe from video') ||
        title === 'recipe' ||
        title === 'cooking video' ||
        title.includes('simple dish') ||
        title.includes('generic youtube recipe')) {
      console.log('Rejected: Generic title detected');
      return null;
    }

    console.log(`Successfully extracted recipe: ${recipeData.title}`);
    return recipeData;

  } catch (error) {
    console.error('Error using Gemini to extract recipe:', error);
    return null;
  }
}

// Test function to validate Gemini setup
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: "Say 'Hello' if you can respond" }] }]
    });
    const response = await result.response;
    const text = response.text();
    return text.toLowerCase().includes('hello');
  } catch (error) {
    console.error('Gemini connection test failed:', error);
    return false;
  }
}