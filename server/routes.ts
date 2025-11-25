import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRecipeSchema } from "@shared/schema";
import { ResponseHandler } from "./services/response-handler";
import { RecipeService } from "./services/recipe-service";
import { YouTubeService } from "./services/youtube-service";
import { UltimateBypass } from "./services/ultimate-bypass";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint (before rate limiting)
  app.get("/health", (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  app.get("/api/health", (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'recipe-api',
    });
  });

  // Get all recipes with pagination
  app.get("/api/recipes/paginated", ResponseHandler.asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const recipes = await storage.getRecipesPaginated(page, limit);
    ResponseHandler.sendSuccess(res, { recipes });
  }));

  // Search recipes
  app.get("/api/recipes/search", ResponseHandler.asyncHandler(async (req: Request, res: Response) => {
    const { q, tags, category, cuisine } = req.query;

    if (!q && !tags && !category && !cuisine) {
      return ResponseHandler.sendError(res, 400, "Search query, tags, category, or cuisine is required");
    }

    const recipes = q ?
      await storage.searchRecipes(q as string) :
      await storage.searchRecipesAdvanced({
        tags: tags ? (tags as string).split(',') : undefined,
        category: category as string,
        cuisine: cuisine as string
      });

    ResponseHandler.sendSuccess(res, { recipes });
  }));

  // Get recipe stats
  app.get("/api/recipes/stats", ResponseHandler.asyncHandler(async (req: Request, res: Response) => {
    const stats = await storage.getRecipeStats();
    ResponseHandler.sendSuccess(res, stats);
  }));

  // Get recipe by ID
  app.get("/api/recipes/:id", ResponseHandler.asyncHandler(async (req: Request, res: Response) => {
    const recipe = await storage.getRecipe(req.params.id);
    if (!recipe) {
      return ResponseHandler.sendError(res, 404, "Recipe not found");
    }
    ResponseHandler.sendSuccess(res, { recipe });
  }));

  // Scrape recipe from URL
  app.post("/api/recipes/scrape", ResponseHandler.asyncHandler(async (req: Request, res: Response) => {
    const { url } = req.body;

    if (!url) {
      return ResponseHandler.sendError(res, 400, "URL is required");
    }

    try {
      // Check if recipe already exists
      const existingRecipe = await storage.getRecipeBySource(url);
      if (existingRecipe) {
        return ResponseHandler.sendSuccess(res, {
          message: "Recipe from this URL already exists",
          existingRecipe,
          note: "Different URL formats for the same content are considered duplicates"
        });
      }

      // Determine scraping strategy based on domain
      const domain = new URL(url).hostname.toLowerCase();
      let scrapedData;

      if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        // YouTube video processing
        scrapedData = await YouTubeService.extractRecipeFromVideo(url);
      } else if (domain.includes('allrecipes.com') || domain.includes('foodnetwork.com')) {
        // Use ultimate bypass for protected sites
        console.log('Deploying ultimate bypass system for enterprise-protected site...');
        const htmlContent = await UltimateBypass.executeUltimateBypass(url);

        if (!htmlContent) {
          return ResponseHandler.sendError(res, 403,
            `${domain.includes('allrecipes.com') ? 'AllRecipes' : 'Food Network'} has extremely sophisticated anti-bot protection. Even our most advanced bypass techniques including browser automation cannot penetrate their current security measures. Try Delish, NY Times Cooking, or King Arthur Baking instead.`
          );
        }

        // Process the bypassed content
        scrapedData = await RecipeService.processHtmlContent(htmlContent, url);
      } else {
        // Standard scraping for other sites
        scrapedData = await RecipeService.scrapeWebsiteRecipe(url);
      }

      if (!scrapedData) {
        return ResponseHandler.sendError(res, 400, "Could not extract recipe data from this URL");
      }

      // Create recipe using centralized service
      const recipe = await RecipeService.createRecipe(scrapedData as any);
      ResponseHandler.sendSuccess(res, { recipe }, "Recipe successfully scraped and added");
    } catch (error) {
      console.error("Recipe scraping error:", error);
      if (error instanceof Error && error.message.includes('not found')) {
        return ResponseHandler.sendError(res, 404, "Recipe page not found. Please check the URL and try again.");
      }
      ResponseHandler.sendError(res, 500, error instanceof Error ? error.message : "Failed to scrape recipe");
    }
  }));

  // Diagnostic endpoint to test Gemini API
  app.get("/api/test-gemini", ResponseHandler.asyncHandler(async (req: Request, res: Response) => {
    try {
      const { testGeminiConnection, listAvailableModels } = await import('./gemini');
      const connectionResult = await testGeminiConnection();
      const modelsResult = await listAvailableModels();
      
      ResponseHandler.sendSuccess(res, {
        apiKeyConfigured: !!process.env.GEMINI_API_KEY,
        // Don't expose key length in production (security best practice)
        apiKeyLength: process.env.NODE_ENV === 'development' 
          ? (process.env.GEMINI_API_KEY?.length || 0)
          : undefined,
        connectionTest: connectionResult.success,
        connectionError: connectionResult.error,
        workingModel: connectionResult.workingModel,
        availableModels: modelsResult.models,
        modelErrors: modelsResult.errors,
        message: connectionResult.success 
          ? `Gemini API is working with model: ${connectionResult.workingModel}!` 
          : `Gemini API connection failed: ${connectionResult.error || 'Unknown error'}`
      });
    } catch (error) {
      console.error("Gemini diagnostic error:", error);
      ResponseHandler.sendError(res, 500, error instanceof Error ? error.message : "Failed to test Gemini API");
    }
  }));

  // Screenshot OCR recipe extraction endpoint
  app.post("/api/recipes/screenshot", ResponseHandler.asyncHandler(async (req: Request, res: Response) => {
    const { imageData } = req.body;

    if (!imageData) {
      return ResponseHandler.sendError(res, 400, "Image data is required");
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return ResponseHandler.sendError(res, 500, "GEMINI_API_KEY is not configured. Please set your Gemini API key in the environment variables.");
    }

    try {
      // Import the Gemini Vision extraction function
      const { extractRecipeFromImage } = await import('./gemini');

      // Extract recipe from image using Gemini Vision
      const extractedData = await extractRecipeFromImage(imageData);

      if (!extractedData) {
        return ResponseHandler.sendError(res, 400, "Could not extract recipe from image. Please ensure the image contains a clear recipe with ingredients and instructions.");
      }

      // Prepare recipe data for database
      const recipeData = {
        title: extractedData.title,
        description: extractedData.description || null,
        ingredients: JSON.stringify(extractedData.ingredients),
        directions: JSON.stringify(extractedData.instructions),
        source: "Screenshot Upload",
        imageUrl: imageData, // Store the base64 image
        prepTimeMinutes: extractedData.prepTime || null,
        cookTimeMinutes: extractedData.cookTime || null,
        totalTimeMinutes: extractedData.totalTime || null,
        servings: extractedData.servings || null,
        isAutoScraped: 0, // User-uploaded
        moderationStatus: "approved"
      };

      const validatedRecipe = insertRecipeSchema.parse(recipeData);
      const recipe = await storage.createRecipe(validatedRecipe);

      ResponseHandler.sendSuccess(res, { recipe }, "Recipe successfully extracted from screenshot");
    } catch (error) {
      console.error("Screenshot processing error:", error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to process screenshot";
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for API key errors
        if (error.message.includes('API_KEY') || error.message.includes('API key')) {
          return ResponseHandler.sendError(res, 500, errorMessage + " Please configure GEMINI_API_KEY in your environment variables.");
        }
        
        // Check for quota/authentication errors
        if (error.message.includes('quota') || error.message.includes('authentication') || error.message.includes('permission')) {
          return ResponseHandler.sendError(res, 500, errorMessage + " Please check your Gemini API key and quota.");
        }
      }
      
      ResponseHandler.sendError(res, 500, errorMessage);
    }
  }));

  // Manual recipe creation (blocked)
  app.post("/api/recipes", ResponseHandler.asyncHandler(async (req: Request, res: Response) => {
    return ResponseHandler.sendError(res, 405, "Manual recipe creation not allowed. Please provide a recipe URL instead.", {
      useEndpoint: "/api/recipes/scrape"
    });
  }));

  // Delete recipe
  app.delete("/api/recipes/:id", ResponseHandler.asyncHandler(async (req: Request, res: Response) => {
    const deleted = await storage.deleteRecipe(req.params.id);
    if (!deleted) {
      return ResponseHandler.sendError(res, 404, "Recipe not found");
    }
    ResponseHandler.sendSuccess(res, {}, "Recipe deleted successfully");
  }));

  // Test ultimate bypass endpoint
  app.post("/api/test-bypass", ResponseHandler.asyncHandler(async (req: Request, res: Response) => {
    const { url } = req.body;

    if (!url) {
      return ResponseHandler.sendError(res, 400, "URL is required");
    }

    try {
      console.log('Testing ultimate bypass system...');
      const htmlContent = await UltimateBypass.executeUltimateBypass(url);

      if (!htmlContent) {
        return ResponseHandler.sendError(res, 403, "All bypass strategies failed");
      }

      ResponseHandler.sendSuccess(res, {
        success: true,
        contentLength: htmlContent.length,
        preview: htmlContent.substring(0, 500) + '...'
      }, "Ultimate bypass successful");
    } catch (error) {
      console.error("Bypass test error:", error);
      ResponseHandler.sendError(res, 500, error instanceof Error ? error.message : "Bypass test failed");
    }
  }));

  const httpServer = createServer(app);
  return httpServer;
}