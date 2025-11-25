import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface RecipeData {
  title: string;
  description?: string;
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
  "description": "Brief 1-2 sentence description of the dish",
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

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

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
export async function testGeminiConnection(): Promise<{ success: boolean; error?: string; workingModel?: string }> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return { success: false, error: "GEMINI_API_KEY is not set" };
    }

    if (process.env.GEMINI_API_KEY.length < 20) {
      return { success: false, error: "GEMINI_API_KEY appears to be invalid (too short)" };
    }

    // Try Flash models first since user has Flash API key, then try others
    const testModels = [
      "gemini-1.5-flash",        // Flash model (user's key is for this)
      "gemini-1.5-flash-latest",  // Latest Flash
      "gemini-2.0-flash",         // Newer Flash (recommended migration)
      "gemini-2.0-flash-latest",  // Latest 2.0 Flash
      "gemini-1.5-pro",           // Pro model
      "gemini-1.5-pro-latest"     // Latest Pro
    ];
    
    let lastError: string = "";
    for (const modelName of testModels) {
      try {
        console.log(`Testing model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: "Say 'Hello'" }] }]
        });
        const response = await result.response;
        const text = response.text();
        if (text) {
          console.log(`✅ Test successful with model: ${modelName}`);
          return { success: true, workingModel: modelName };
        }
      } catch (err: any) {
        const errorMsg = err.message || String(err);
        console.error(`❌ Model ${modelName} failed:`, errorMsg);
        lastError = errorMsg;
        continue; // Try next model
      }
    }
    return { success: false, error: `All models failed. Last error: ${lastError}` };
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.error('Gemini connection test failed:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

// Helper function to list available models (for debugging)
export async function listAvailableModels(): Promise<{ models: string[]; errors: Record<string, string> }> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return { models: [], errors: { general: "API key not configured" } };
    }

    // The SDK doesn't have a direct listModels method, but we can try common models
    // Prioritize Flash models since user has Flash API key
    const commonModels = [
      "gemini-1.5-flash",         // Flash model (user's key is for this)
      "gemini-1.5-flash-latest",  // Latest Flash
      "gemini-2.0-flash",         // Newer Flash (recommended)
      "gemini-2.0-flash-latest", // Latest 2.0 Flash
      "gemini-1.5-pro",           // Pro model
      "gemini-1.5-pro-latest",    // Latest Pro
      "gemini-pro",               // Older Pro
      "gemini-pro-vision"         // Older vision model
    ];
    
    const available: string[] = [];
    const errors: Record<string, string> = {};
    
    for (const modelName of commonModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        // Try a simple call to see if model exists
        await model.generateContent({
          contents: [{ role: "user", parts: [{ text: "test" }] }]
        });
        available.push(modelName);
      } catch (err: any) {
        const errorMsg = err.message || String(err);
        errors[modelName] = errorMsg;
        // Check if it's a 404 (model not found) vs other error (like auth)
        if (!errorMsg.includes('not found') && !errorMsg.includes('404')) {
          // Model might exist but has auth/permission issues
          console.log(`Model ${modelName} exists but has issues: ${errorMsg}`);
        }
      }
    }
    return { models: available, errors };
  } catch (error: any) {
    console.error('Error listing models:', error);
    return { models: [], errors: { general: error.message || String(error) } };
  }
}

/**
 * Extract recipe from an image using Gemini Vision API
 * @param imageData Base64 encoded image data (with or without data:image prefix)
 * @returns RecipeData or null if extraction fails
 */
/**
 * Parse image data URL to extract MIME type and base64 data
 * @param imageData - Data URL string
 * @returns Object with mimeType and base64Data
 */
function parseImageData(imageData: string): { mimeType: string; base64Data: string } {
  const mimeMatch = imageData.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch?.[1] || 'image/png';
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  
  if (!base64Data || base64Data.length === 0) {
    throw new Error('Invalid image data: base64 data is empty');
  }
  
  return { mimeType, base64Data };
}

export async function extractRecipeFromImage(imageData: string): Promise<RecipeData | null> {
  try {
    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables.');
    }

    // Parse image data
    const { mimeType, base64Data } = parseImageData(imageData);

    const prompt = `
You are a recipe extraction expert. Analyze this recipe image and extract all the recipe information you can see.

Extract and format as JSON with this exact structure:
{
  "title": "Recipe name from the image",
  "description": "Brief 1-2 sentence description of the dish",
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity", ...],
  "instructions": ["step 1", "step 2", ...],
  "prepTime": number_in_minutes_or_null,
  "cookTime": number_in_minutes_or_null,
  "totalTime": number_in_minutes_or_null,
  "servings": number_or_null
}

EXTRACTION GUIDELINES:
- Extract the exact title shown in the image
- Include ALL ingredients with their quantities exactly as shown
- Extract ALL cooking steps/directions in order
- Extract any time information (prep, cook, ready time)
- Extract serving size if shown
- If any field is not visible in the image, use null
- Be precise and accurate - copy text exactly as it appears
- Do NOT make up or infer information not shown in the image
`;

    // Use gemini-2.0-flash - confirmed working model (KISS: no unnecessary fallback)
    const MODEL_NAME = "gemini-2.0-flash";
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Generate content with image (array format is simpler and works)
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error('Gemini Vision API returned no response. Please check your API key and quota.');
    }

    // Extract JSON from the response (may wrap it in markdown code blocks)
    let jsonText = text.trim();

    // Remove markdown code block if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response
    let recipeData;
    try {
      recipeData = JSON.parse(jsonText);
    } catch (parseError) {
      throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    console.log('Parsed recipe data:', JSON.stringify(recipeData, null, 2));

    // Validate required fields
    if (!recipeData.title || !recipeData.ingredients || !recipeData.instructions) {
      return null;
    }

    // Ensure arrays are valid
    if (!Array.isArray(recipeData.ingredients) || !Array.isArray(recipeData.instructions)) {
      return null;
    }

    // Filter out empty items
    recipeData.ingredients = recipeData.ingredients.filter(
      (ing: string) => typeof ing === 'string' && ing.trim().length > 2
    );
    recipeData.instructions = recipeData.instructions.filter(
      (inst: string) => typeof inst === 'string' && inst.trim().length > 5
    );

    // Validate we still have content after filtering
    if (recipeData.ingredients.length === 0 || recipeData.instructions.length === 0) {
      return null;
    }

    return recipeData;

  } catch (error) {
    console.error('Error using Gemini Vision to extract recipe:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Re-throw API key and configuration errors
      if (error.message.includes('API_KEY') || error.message.includes('API key')) {
        throw new Error(`Gemini API configuration error: ${error.message}. Please check your GEMINI_API_KEY environment variable.`);
      }
      
      // Re-throw other errors so they can be handled by the route
      throw error;
    }
    throw new Error('Unknown error occurred while extracting recipe from image');
  }
}