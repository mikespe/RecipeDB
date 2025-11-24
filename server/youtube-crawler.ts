import axios from "axios";
import * as cheerio from "cheerio";
import { YoutubeTranscript } from "youtube-transcript";
import { Innertube } from "youtubei.js";
import { storage } from "./storage";
import { insertRecipeSchema } from "@shared/schema";
import { extractRecipeWithGemini, testGeminiConnection } from "./gemini";

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  url: string;
  channelName?: string;
  viewCount?: number;
  duration?: string;
}

interface TranscriptItem {
  text: string;
  offset: number;
  duration: number;
}

// Using Gemini instead of OpenAI for better cost efficiency

class YouTubeCrawler {
  private rateLimitDelay = 2000; // 2 seconds between requests
  private innertube: any = null;

  async initializeYouTubeAPI(): Promise<void> {
    if (!this.innertube) {
      try {
        this.innertube = await Innertube.create();
        console.log('YouTube API initialized successfully');
      } catch (error) {
        console.error('Failed to initialize YouTube API:', error);
        this.innertube = null;
      }
    }
  }

  // Curated list of high-quality cooking channels and recent recipes
  private getPopularCookingVideos(): string[] {
    return [
      // More recent and accessible cooking videos
      "https://www.youtube.com/watch?v=CGCR3DF2I_U", // Recent Tasty Recipe
      "https://www.youtube.com/watch?v=VQGrpBk6axk", // Food Network Recipe
      "https://www.youtube.com/watch?v=8Qn_spdM5Zg", // Easy Cooking Tutorial
      "https://www.youtube.com/watch?v=v7ADezKjGxE", // Binging with Babish Recent
      "https://www.youtube.com/watch?v=t6gSGPNEk2Q", // Joshua Weissman Recent
      "https://www.youtube.com/watch?v=4c8vPs1b-BU", // Food Wishes Recent
      "https://www.youtube.com/watch?v=MESuOHxNs-4", // Pro Home Cooks Recent
      "https://www.youtube.com/watch?v=4rTkGSPfgGU", // Gordon Ramsay Recent
    ];
  }

  async discoverCookingVideos(maxVideos: number = 10): Promise<YouTubeVideo[]> {
    const videos: YouTubeVideo[] = [];
    
    try {
      // Initialize YouTube API
      await this.initializeYouTubeAPI();
      
      // Start with curated popular cooking videos
      const popularVideos = this.getPopularCookingVideos().slice(0, maxVideos);
      
      for (const videoUrl of popularVideos) {
        try {
          const videoId = this.extractVideoId(videoUrl);
          if (videoId) {
            const videoInfo = await this.getVideoInfo(videoId);
            if (videoInfo) {
              videos.push(videoInfo);
            }
          }
          await this.delay(this.rateLimitDelay);
        } catch (error) {
          console.error(`Error processing video ${videoUrl}:`, error);
        }
      }

      // Search for additional cooking videos using reliable search terms
      if (videos.length < maxVideos) {
        const searchTerms = [
          "easy chicken recipe tutorial",
          "simple pasta recipe cooking",
          "homemade bread recipe step by step",
          "chocolate chip cookies recipe"
        ];

        for (const term of searchTerms.slice(0, 2)) {
          try {
            const searchVideos = await this.searchCookingVideos(term, 3);
            videos.push(...searchVideos);
            await this.delay(this.rateLimitDelay);
            
            if (videos.length >= maxVideos) break;
          } catch (error) {
            console.error(`Error searching for "${term}":`, error);
          }
        }
      }
      
    } catch (error) {
      console.error('Error discovering YouTube cooking videos:', error);
    }

    return videos.slice(0, maxVideos);
  }

  // Extract video ID from YouTube URL (including Shorts)
  private extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  // Get video information using YouTube API
  async getVideoInfo(videoId: string): Promise<YouTubeVideo | null> {
    try {
      if (!this.innertube) {
        await this.initializeYouTubeAPI();
      }

      if (!this.innertube) {
        console.log('YouTube API not available, skipping video info');
        return null;
      }

      const info = await this.innertube.getInfo(videoId);
      console.log(`Raw video info available: ${!!info}`);
      console.log(`Basic info available: ${!!info?.basic_info}`);
      
      if (!info || !info.basic_info) {
        console.log(`Could not get info for video ${videoId}`);
        return null;
      }
      
      console.log(`Video title from API: "${info.basic_info.title}"`);
      console.log(`Video description length: ${info.basic_info.short_description?.length || 0}`);
      console.log(`Video description preview: "${info.basic_info.short_description?.substring(0, 100)}..."`);
      console.log(`Channel name: "${info.basic_info.channel?.name}"`);
      console.log(`View count: ${info.basic_info.view_count}`);
      console.log(`Duration: ${info.basic_info.duration?.text}`);
      console.log(`Captions available: ${!!info.captions}`);
      console.log(`Transcript available: ${!!info.captions?.caption_tracks?.length}`);
      console.log(`Player response available: ${!!info.player_response}`);
      console.log(`Streaming data available: ${!!info.streaming_data}`);
      console.log(`Playability status: ${info.playability_status?.status}`);
      console.log(`Video tags: ${info.basic_info.tags?.slice(0, 5).join(', ') || 'None'}`);
      console.log(`Video keywords: ${info.basic_info.keywords?.slice(0, 5).join(', ') || 'None'}`);
      console.log(`Full basic_info keys: ${Object.keys(info.basic_info).join(', ')}`);
      
      // Also check if there's a longer description
      if (info.basic_info.long_description) {
        console.log(`Long description length: ${info.basic_info.long_description.length}`);
        console.log(`Long description preview: "${info.basic_info.long_description.substring(0, 200)}..."`);
      }

      return {
        id: videoId,
        title: info.basic_info.title || `YouTube Video ${videoId}`,
        description: info.basic_info.short_description || info.basic_info.long_description || '',
        url: `https://www.youtube.com/watch?v=${videoId}`,
        channelName: info.basic_info.channel?.name || 'Unknown Channel',
        viewCount: info.basic_info.view_count || 0,
        duration: info.basic_info.duration?.text || ''
      };
    } catch (error) {
      console.error(`Error getting video info for ${videoId}:`, error);
      return null;
    }
  }

  // Search for cooking videos using YouTube API  
  private async searchCookingVideos(searchTerm: string, limit: number): Promise<YouTubeVideo[]> {
    const videos: YouTubeVideo[] = [];
    
    try {
      if (!this.innertube) {
        await this.initializeYouTubeAPI();
      }

      if (!this.innertube) {
        console.log('YouTube API not available for search');
        return videos;
      }

      const search = await this.innertube.search(searchTerm + ' recipe cooking');
      
      if (!search || !search.results) {
        console.log(`No search results for: ${searchTerm}`);
        return videos;
      }

      for (const result of search.results) {
        if (videos.length >= limit) break;
        
        if (result.type === 'Video' && result.id) {
          const videoInfo: YouTubeVideo = {
            id: result.id,
            title: result.title?.text || '',
            description: result.description?.text || '',
            url: `https://www.youtube.com/watch?v=${result.id}`,
            channelName: result.author?.name || '',
            viewCount: result.view_count || 0,
            duration: result.duration?.text || ''
          };
          
          // Filter for recipe-related content
          if (this.isRecipeVideo(videoInfo)) {
            videos.push(videoInfo);
          }
        }
      }
    } catch (error) {
      console.error(`Error searching YouTube for "${searchTerm}":`, error);
    }
    
    return videos;
  }

  // Check if video is likely a recipe video
  private isRecipeVideo(video: YouTubeVideo): boolean {
    const recipeKeywords = [
      'recipe', 'cooking', 'how to make', 'baking', 'cook',
      'ingredients', 'tutorial', 'easy', 'homemade', 'step by step'
    ];
    
    const content = (video.title + ' ' + video.description).toLowerCase();
    return recipeKeywords.some(keyword => content.includes(keyword));
  }

  // Get video transcript using youtube-transcript library
  private async getVideoTranscript(videoId: string): Promise<string | null> {
    try {
      console.log(`Fetching transcript for video: ${videoId}`);
      
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (!transcript || transcript.length === 0) {
        console.log(`No transcript available for video: ${videoId}`);
        return null;
      }

      // Combine transcript text with reasonable spacing
      const fullText = transcript
        .map((item: any) => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (fullText.length < 100) {
        console.log(`Transcript too short for video: ${videoId}`);
        return null;
      }

      console.log(`Retrieved transcript (${fullText.length} chars) for video: ${videoId}`);
      return fullText;
      
    } catch (error) {
      console.log(`Could not fetch transcript for video ${videoId}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  private async searchYouTubeVideos(searchTerm: string, limit: number): Promise<YouTubeVideo[]> {
    // This method is now replaced by searchCookingVideos but kept for compatibility
    return this.searchCookingVideos(searchTerm, limit);
  }

  // Enhanced recipe extraction using video transcript (make public)
  async extractRecipeFromVideo(video: YouTubeVideo): Promise<any | null> {
    try {
      console.log(`Extracting recipe from: ${video.title || video.id}`);

      // For manual user requests, skip recipe video validation
      // User-provided URLs are assumed to be recipe videos
      console.log('Manual URL request - proceeding with recipe extraction...');

      // Try to get the video transcript
      const transcript = await this.getVideoTranscript(video.id);
      console.log(`Transcript length: ${transcript?.length || 0} characters`);
      
      // For manual requests, try extraction even with minimal content
      let contentToAnalyze = '';
      if (transcript) {
        contentToAnalyze = transcript;
      } else if (video.title || video.description) {
        contentToAnalyze = `${video.title || ''}\n\n${video.description || ''}`;
      }
      
      // If no transcript or meaningful content available, return null
      if (!contentToAnalyze || contentToAnalyze.trim().length < 100) {
        console.log(`Insufficient content for recipe extraction - video ID: ${video.id}`);
        console.log(`Available content: "${contentToAnalyze}"`);
        console.log('YouTube video content is not accessible - cannot extract recipe');
        return null;
      }

      console.log(`Analyzing ${contentToAnalyze.length} characters of content`);
      
      // Use Gemini to extract structured recipe data from transcript/content
      const recipeData = await this.extractRecipeFromTranscript(
        video.title || `YouTube Video ${video.id}`, 
        contentToAnalyze, 
        !!transcript
      );
      
      if (!recipeData) {
        console.log(`Could not extract recipe from: ${video.title}`);
        return null;
      }

      return {
        title: recipeData.title || video.title.replace(' - YouTube', '').trim(),
        ingredients: recipeData.ingredients || [],
        instructions: recipeData.instructions || [],
        source: video.url,
        imageUrl: `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`, // YouTube thumbnail
        prepTimeMinutes: recipeData.prepTime || null,
        cookTimeMinutes: recipeData.cookTime || null,
        totalTimeMinutes: recipeData.totalTime || null,
        servings: recipeData.servings || null
      };
      
    } catch (error) {
      console.error(`Error extracting recipe from video ${video.url}:`, error);
      return null;
    }
  }

  // Enhanced AI recipe extraction using Gemini (cost-effective alternative to OpenAI)
  private async extractRecipeFromTranscript(title: string, content: string, hasTranscript: boolean): Promise<any | null> {
    try {
      console.log(`Using Gemini AI to extract recipe from ${hasTranscript ? 'transcript' : 'content'}`);
      
      // Use the new Gemini extraction function
      const recipeData = await extractRecipeWithGemini(title, content, hasTranscript);
      
      if (recipeData) {
        console.log(`Successfully extracted recipe with Gemini: ${recipeData.title}`);
      }
      
      return recipeData;

    } catch (error) {
      console.error('Error using Gemini to extract recipe from transcript:', error);
      return null;
    }
  }

  async processVideosForRecipes(videos: YouTubeVideo[]): Promise<number> {
    let recipesAdded = 0;
    
    for (const video of videos) {
      try {
        // Check if we already have this video
        const existingRecipes = await storage.searchRecipes(video.url);
        if (existingRecipes.length > 0) {
          continue;
        }

        const recipeData = await this.extractRecipeFromVideo(video);
        if (recipeData) {
          // Convert to database format
          const dbRecipe = {
            title: recipeData.title,
            ingredients: JSON.stringify(recipeData.ingredients),
            directions: JSON.stringify(recipeData.instructions), 
            source: recipeData.source,
            isAutoScraped: 1
          };

          const validatedRecipe = insertRecipeSchema.parse(dbRecipe);
          await storage.createRecipe(validatedRecipe);
          
          recipesAdded++;
          console.log(`Added recipe from YouTube: ${recipeData.title}`);
        }
        
        await this.delay(this.rateLimitDelay);
        
      } catch (error) {
        console.error(`Error processing video ${video.url}:`, error);
      }
    }
    
    return recipesAdded;
  }

  // Utility function to shuffle array for random channel selection
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export the class as default
export default YouTubeCrawler;

export const youtubeCrawler = new YouTubeCrawler();

// Test function to manually test YouTube crawling
export async function testYouTubeCrawling(): Promise<void> {
  console.log('Testing YouTube crawling with transcript extraction...');
  
  try {
    const videos = await youtubeCrawler.discoverCookingVideos(3);
    console.log(`Discovered ${videos.length} videos for testing`);
    
    if (videos.length > 0) {
      const recipesAdded = await youtubeCrawler.processVideosForRecipes(videos);
      console.log(`Successfully added ${recipesAdded} recipes from YouTube videos`);
    }
  } catch (error) {
    console.error('Error during YouTube crawling test:', error);
  }
}