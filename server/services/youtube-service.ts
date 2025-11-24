/**
 * YouTube service - Centralized YouTube recipe extraction logic
 * Follows Single Responsibility Principle
 */
import { storage } from "../storage";
import { UrlUtils } from "./url-utils";
import { RecipeValidator, type RecipeData } from "./recipe-validator";
import { youtubeAPI, YouTubeVideoData } from './youtube-api';
import { youtubeTranscript, TranscriptResult } from './youtube-transcript';

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  url: string;
}

export class YouTubeService {
  /**
   * Extract recipe from YouTube video using official API + transcript extraction
   */
  static async extractRecipeFromVideo(url: string): Promise<RecipeData | null> {
    try {
      const videoId = UrlUtils.extractYouTubeVideoId(url);
      if (!videoId) {
        return null;
      }

      // Create video object
      const video: YouTubeVideo = {
        id: videoId,
        title: '',
        description: '',
        url: url
      };

      // Try official YouTube API first
      const officialData = await this.extractWithOfficialAPI(videoId, url);
      if (officialData) {
        console.log('Successfully extracted recipe using official YouTube API');
        return officialData;
      }

      // Fallback to existing crawler method
      console.log('Falling back to existing crawler method...');
      return await this.extractWithCrawler(video, url);

    } catch (error) {
      console.error('Error extracting recipe from YouTube video:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Extract recipe using official YouTube API
   */
  private static async extractWithOfficialAPI(videoId: string, url: string): Promise<RecipeData | null> {
    try {
      console.log('Attempting extraction with official YouTube API...');
      
      if (!youtubeAPI.isConfigured()) {
        console.log('YouTube API not configured, skipping official method');
        return null;
      }

      // Get video data and transcript
      const { video, transcript } = await youtubeTranscript.getVideoWithTranscript(videoId);
      
      if (!video) {
        console.log('Could not get video data from YouTube API');
        return null;
      }

      // First try with transcript if available
      if (youtubeTranscript.isTranscriptSuitable(transcript)) {
        console.log('Using transcript for recipe extraction');
        return await this.extractFromTranscript(video, transcript, url);
      }

      // If no suitable transcript, try description-based extraction
      console.log('No suitable transcript, trying description-based extraction');
      return await this.extractFromDescription(video, url);

    } catch (error) {
      console.error('Error with official YouTube API extraction:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Extract recipe from transcript
   */
  private static async extractFromTranscript(video: YouTubeVideoData, transcript: string, url: string): Promise<RecipeData | null> {
    const content = `Video Title: ${video.title}\nChannel: ${video.channelTitle}\nDescription: ${video.description || ''}\nTranscript: ${transcript}`;
    console.log(`Analyzing ${content.length} characters of content from transcript`);
    return await this.extractRecipeWithAI(content, video.title, url);
  }

  /**
   * Extract recipe from video description and metadata only
   */
  private static async extractFromDescription(video: YouTubeVideoData, url: string): Promise<RecipeData | null> {
    // Get full description if it's truncated
    let fullDescription = video.description || '';
    
    // Enhanced content combination for better AI extraction
    const content = `Video Title: ${video.title}
Channel: ${video.channelTitle}
Description: ${fullDescription}
Tags: ${video.tags ? video.tags.join(', ') : 'None'}
Category: ${video.categoryId || 'Unknown'}

RECIPE EXTRACTION CONTEXT:
This is a cooking video titled "${video.title}" by ${video.channelTitle}. 

INSTRUCTION FOR AI:
1. If this is a recognizable recipe (like "Classic Shepherd's Pie"), extract the standard recipe for this dish
2. Use any specific details mentioned in the description or title
3. Include typical ingredients and cooking methods for this type of dish
4. If Gordon Ramsay or other known chefs, use their typical style/ingredients
5. Extract ANY cooking hints, ingredients, or techniques mentioned
6. For famous dishes, it's acceptable to provide the standard recipe with the chef's noted variations

This video likely demonstrates cooking techniques for ${video.title}. Extract recipe information accordingly.`;

    console.log(`Analyzing ${content.length} characters from video description`);
    
    // Try knowledge-based extraction first for famous recipes
    const knowledgeBasedRecipe = await this.tryKnowledgeBasedExtraction(video.title, video.channelTitle, fullDescription);
    if (knowledgeBasedRecipe) {
      return knowledgeBasedRecipe;
    }
    
    // Fallback to standard AI extraction
    return await this.extractRecipeWithAI(content, video.title, url, true);
  }

  /**
   * Try to extract recipe using cooking knowledge for famous dishes
   */
  private static async tryKnowledgeBasedExtraction(title: string, channel: string, description: string): Promise<RecipeData | null> {
    // Check if this is a famous recipe we can provide standard information for
    const famousRecipes = [
      'shepherd\'s pie', 'shepherds pie', 'cottage pie',
      'beef wellington', 'scrambled eggs', 'carbonara',
      'bolognese', 'risotto', 'french toast', 'pancakes',
      'chocolate cake', 'cheesecake', 'pizza', 'pasta',
      'stir fry', 'fried rice', 'curry', 'soup'
    ];

    const titleLower = title.toLowerCase();
    const matchedRecipe = famousRecipes.find(recipe => titleLower.includes(recipe));
    
    if (matchedRecipe) {
      console.log(`Attempting knowledge-based extraction for: ${matchedRecipe}`);
      
      const enhancedPrompt = `Extract a detailed recipe for "${title}" as demonstrated by ${channel}.

Based on the video title "${title}" and description: "${description}"

This is a cooking demonstration of ${matchedRecipe}. Please provide:
1. Standard ingredients for this dish (with chef's typical variations if known)
2. Step-by-step cooking method
3. Typical cooking times and temperatures
4. Standard serving size

Use culinary knowledge to provide a complete, authentic recipe for this classic dish, incorporating any specific details mentioned in the title or description.`;

      try {
        const { extractRecipeWithGemini } = await import('../gemini');
        const recipe = await extractRecipeWithGemini(enhancedPrompt, title, false);
        
        if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
          console.log(`Successfully extracted knowledge-based recipe for ${matchedRecipe}`);
          return recipe;
        }
      } catch (error) {
        console.log('Knowledge-based extraction failed, falling back to standard method');
      }
    }
    
    return null;
  }

  /**
   * Extract recipe using AI with enhanced prompting
   */
  private static async extractRecipeWithAI(content: string, videoTitle: string, url: string, descriptionOnly = false): Promise<RecipeData | null> {
    try {
      const { extractRecipeWithGemini } = await import('../gemini');
      
      // Enhanced prompt for description-only extraction
      let enhancedContent = content;
      if (descriptionOnly) {
        enhancedContent = `${content}

EXTRACTION INSTRUCTIONS:
- This video likely contains a recipe for "${videoTitle}"
- Extract ingredients, quantities, and cooking steps even if they're brief
- Infer standard cooking techniques if mentioned (e.g., "sauté", "bake", "season")
- Use common recipe knowledge to fill in reasonable cooking times and temperatures
- If ingredients are mentioned without quantities, include them anyway
- Look for any cooking hints in the description or title`;
      }
      
      console.log('Using Gemini AI to extract recipe from content');
      const recipeData = await extractRecipeWithGemini(enhancedContent);
      
      if (!recipeData) {
        console.log('Gemini could not extract recipe from content');
        return null;
      }

      // Strict validation for all extractions - quality over quantity
      if (!RecipeValidator.isValidRecipe(recipeData)) {
        console.log('Recipe validation failed - incomplete or invalid recipe data');
        return null;
      }

      // Additional quality checks
      if (!recipeData.ingredients || recipeData.ingredients.length < 3) {
        console.log('Recipe rejected: insufficient ingredients (minimum 3 required)');
        return null;
      }

      if (!recipeData.instructions || recipeData.instructions.length < 2) {
        console.log('Recipe rejected: insufficient instructions (minimum 2 steps required)');
        return null;
      }

      // Check for placeholder or generic content that indicates poor extraction
      const hasPlaceholders = [
        ...recipeData.ingredients,
        ...recipeData.instructions
      ].some(item => {
        const itemLower = item.toLowerCase();
        return itemLower.includes('placeholder') ||
               itemLower.includes('season the ground meat') ||
               itemLower.includes('season the mince') ||
               (itemLower.includes('salt') && itemLower.includes('pepper') && item.length < 25) ||
               item.length < 8;
      });

      if (hasPlaceholders) {
        console.log('Recipe rejected: contains placeholder or insufficient content');
        return null;
      }

      // Ensure ingredients have some specificity (not just generic terms)
      const hasSpecificIngredients = recipeData.ingredients.some(ingredient => 
        ingredient.length > 15 || 
        /\d/.test(ingredient) || // Contains numbers (quantities)
        ingredient.includes('cup') || ingredient.includes('pound') || 
        ingredient.includes('tablespoon') || ingredient.includes('teaspoon')
      );

      if (!hasSpecificIngredients && recipeData.ingredients.length < 6) {
        console.log('Recipe rejected: ingredients lack specificity or quantities');
        return null;
      }

      const normalizedUrl = UrlUtils.normalizeYouTubeUrl(url);
      
      return {
        title: recipeData.title || videoTitle,
        ingredients: recipeData.ingredients || [],
        directions: recipeData.instructions || recipeData.directions || [],
        source: normalizedUrl || url,
        imageUrl: recipeData.imageUrl,
        prepTimeMinutes: recipeData.prepTimeMinutes,
        cookTimeMinutes: recipeData.cookTimeMinutes,
        totalTimeMinutes: recipeData.totalTimeMinutes,
        servings: recipeData.servings,
        category: recipeData.category,
        cuisine: recipeData.cuisine,
        tags: recipeData.tags
      };

    } catch (error) {
      console.error('Error in AI recipe extraction:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Extract recipe using existing crawler method
   */
  private static async extractWithCrawler(video: YouTubeVideo, url: string): Promise<RecipeData | null> {
    try {
      const { youtubeCrawler } = await import('../youtube-crawler');
      
      // Get video info first
      const videoInfo = await youtubeCrawler.getVideoInfo(video.id);
      console.log(`Video info retrieved: ${videoInfo ? 'Yes' : 'No'}`);
      if (videoInfo) {
        Object.assign(video, videoInfo);
        console.log(`Video title after info: "${video.title}"`);
      } else {
        console.log('No video info available, proceeding anyway');
      }

      console.log(`Video title: "${video.title}"`);
      console.log(`Video description preview: "${video.description?.substring(0, 200)}..."`);
      console.log('Manual URL request - bypassing recipe validation and proceeding with extraction...');

      // Extract recipe using the crawler
      const recipeData = await youtubeCrawler.extractRecipeFromVideo(video);
      if (!recipeData) {
        console.log('No recipe data extracted - video may not contain accessible recipe information');
        return null;
      }

      // Normalize URL for consistency
      const normalizedUrl = UrlUtils.normalizeYouTubeUrl(url);
      
      return {
        title: recipeData.title,
        ingredients: recipeData.ingredients || [],
        directions: recipeData.instructions || recipeData.directions || [],
        source: normalizedUrl || url,
        imageUrl: recipeData.imageUrl,
        prepTimeMinutes: recipeData.prepTimeMinutes,
        cookTimeMinutes: recipeData.cookTimeMinutes,
        totalTimeMinutes: recipeData.totalTimeMinutes,
        servings: recipeData.servings,
        category: recipeData.category,
        cuisine: recipeData.cuisine,
        tags: recipeData.tags
      };

    } catch (error) {
      console.error('Error in crawler extraction:', error);
      return null;
    }
  }

  /**
   * Check if YouTube recipe already exists by video ID
   */
  static async findExistingYouTubeRecipe(url: string): Promise<any | null> {
    const videoId = UrlUtils.extractYouTubeVideoId(url);
    if (!videoId) return null;

    const allRecipes = await storage.getAllRecipes();
    return allRecipes.find(recipe => {
      if (!recipe.source) return false;
      const existingVideoId = UrlUtils.extractYouTubeVideoId(recipe.source);
      return existingVideoId === videoId;
    }) || null;
  }
}