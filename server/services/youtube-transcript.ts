/**
 * YouTube transcript service using multiple methods
 * Combines official API and unofficial transcript extraction
 */

import { YoutubeTranscript } from 'youtube-transcript';
import { youtubeAPI, YouTubeVideoData } from './youtube-api';
import { youTubeOAuthService, YouTubeOAuthToken } from './youtube-oauth';

export interface TranscriptEntry {
  text: string;
  start: number;
  duration: number;
}

export interface TranscriptResult {
  transcript: string;
  entries: TranscriptEntry[];
  source: 'api' | 'unofficial' | 'none';
  language: string;
}

export class YouTubeTranscriptService {
  
  /**
   * Get transcript using multiple methods with optional OAuth tokens
   */
  async getTranscript(videoId: string, oauthTokens?: YouTubeOAuthToken): Promise<TranscriptResult> {
    console.log(`Attempting to get transcript for video: ${videoId}`);

    // First try unofficial method (more reliable for auto-generated captions)
    const unofficialResult = await this.getUnofficialTranscript(videoId);
    if (unofficialResult.transcript) {
      return unofficialResult;
    }

    // If unofficial fails and we have API access, try official method
    if (youtubeAPI.isConfigured() || oauthTokens) {
      const officialResult = await this.getOfficialTranscript(videoId, oauthTokens);
      if (officialResult.transcript) {
        return officialResult;
      }
    }

    // No transcript available
    return {
      transcript: '',
      entries: [],
      source: 'none',
      language: 'en'
    };
  }

  /**
   * Get transcript using unofficial youtube-transcript library
   */
  private async getUnofficialTranscript(videoId: string): Promise<TranscriptResult> {
    try {
      console.log(`Trying unofficial transcript for ${videoId}...`);
      
      // Try multiple languages, prioritizing English
      const languages = ['en', 'en-US', 'en-GB', 'auto'];
      
      for (const lang of languages) {
        try {
          const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
            lang: lang === 'auto' ? undefined : lang
          });

          if (transcript && transcript.length > 0) {
            const fullText = transcript.map(entry => entry.text).join(' ');
            
            console.log(`Successfully got unofficial transcript (${lang}): ${fullText.length} characters`);
            
            return {
              transcript: fullText,
              entries: transcript.map(entry => ({
                text: entry.text,
                start: entry.offset,
                duration: entry.duration || 0
              })),
              source: 'unofficial',
              language: lang
            };
          }
        } catch (langError) {
          console.log(`Failed to get transcript in ${lang}:`, langError);
          continue;
        }
      }

      console.log('No transcript available through unofficial method');
      return { transcript: '', entries: [], source: 'none', language: 'en' };

    } catch (error) {
      console.error('Error getting unofficial transcript:', error);
      return { transcript: '', entries: [], source: 'none', language: 'en' };
    }
  }

  /**
   * Get transcript using official YouTube Data API
   */
  private async getOfficialTranscript(videoId: string, oauthTokens?: YouTubeOAuthToken): Promise<TranscriptResult> {
    try {
      console.log(`Trying official API transcript for ${videoId}...`);
      
      // Get available caption tracks
      const captionTracks = await youtubeAPI.getCaptionTracks(videoId);
      
      if (captionTracks.length === 0) {
        console.log('No caption tracks available');
        return { transcript: '', entries: [], source: 'none', language: 'en' };
      }

      // Prefer English captions
      let selectedTrack = captionTracks.find(track => 
        track.snippet.language === 'en' || track.snippet.language === 'en-US'
      );

      // Fallback to first available track
      if (!selectedTrack) {
        selectedTrack = captionTracks[0];
      }

      // Download transcript with OAuth client if available
      let authenticatedClient = null;
      if (oauthTokens && youTubeOAuthService.isConfigured()) {
        try {
          const refreshedTokens = await youTubeOAuthService.refreshTokenIfNeeded(oauthTokens);
          authenticatedClient = youTubeOAuthService.getAuthenticatedYouTubeClient(refreshedTokens);
        } catch (error) {
          console.log('OAuth authentication failed, falling back to API key');
        }
      }
      
      const transcriptData = await youtubeAPI.downloadTranscript(selectedTrack.id, authenticatedClient);
      
      if (transcriptData) {
        // Parse SRT format to plain text
        const plainText = this.parseSrtToText(transcriptData);
        
        console.log(`Successfully got official transcript: ${plainText.length} characters`);
        
        return {
          transcript: plainText,
          entries: [], // SRT parsing for entries would require more complex parsing
          source: 'api',
          language: selectedTrack.snippet.language
        };
      }

      return { transcript: '', entries: [], source: 'none', language: 'en' };

    } catch (error) {
      console.error('Error getting official transcript:', error);
      return { transcript: '', entries: [], source: 'none', language: 'en' };
    }
  }

  /**
   * Parse SRT format to plain text
   */
  private parseSrtToText(srtData: string): string {
    const lines = srtData.split('\n');
    const textLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip sequence numbers and timestamps
      if (line && !line.match(/^\d+$/) && !line.match(/\d{2}:\d{2}:\d{2}/)) {
        textLines.push(line);
      }
    }
    
    return textLines.join(' ').replace(/<[^>]*>/g, ''); // Remove HTML tags
  }

  /**
   * Get video metadata and transcript together
   */
  async getVideoWithTranscript(videoId: string): Promise<{
    video: YouTubeVideoData | null;
    transcript: TranscriptResult;
  }> {
    const [video, transcript] = await Promise.all([
      youtubeAPI.getVideoData(videoId),
      this.getTranscript(videoId)
    ]);

    return { video, transcript };
  }

  /**
   * Check if transcript is substantial enough for recipe extraction
   */
  isTranscriptSuitable(transcript: TranscriptResult): boolean {
    if (!transcript.transcript) return false;
    
    // Require at least 100 characters
    if (transcript.transcript.length < 100) return false;
    
    // Check for cooking-related keywords
    const cookingKeywords = [
      'recipe', 'cooking', 'cook', 'bake', 'ingredients', 'mix', 'stir',
      'heat', 'oven', 'pan', 'dish', 'food', 'kitchen', 'prepare',
      'minutes', 'tablespoon', 'cup', 'salt', 'pepper', 'oil'
    ];
    
    const text = transcript.transcript.toLowerCase();
    const matchedKeywords = cookingKeywords.filter(keyword => text.includes(keyword));
    
    // Require at least 3 cooking-related keywords
    return matchedKeywords.length >= 3;
  }
}

export const youtubeTranscript = new YouTubeTranscriptService();