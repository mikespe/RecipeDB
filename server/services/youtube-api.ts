/**
 * YouTube API service for official data access
 * Uses YouTube Data API v3 for reliable video metadata and transcript access
 */

import { google } from 'googleapis';

export interface YouTubeVideoData {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  thumbnails: {
    default: string;
    medium: string;
    high: string;
    maxres?: string;
  };
  tags?: string[];
  categoryId: string;
  defaultLanguage?: string;
  captions?: boolean;
}

export interface YouTubeTranscript {
  text: string;
  start: number;
  duration: number;
}

export class YouTubeAPIService {
  private youtube: any;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || '';
    if (this.apiKey) {
      this.youtube = google.youtube({
        version: 'v3',
        auth: this.apiKey
      });
    }
  }

  /**
   * Check if YouTube API is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && !!this.youtube;
  }

  /**
   * Extract video ID from various YouTube URL formats
   */
  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Get video metadata using YouTube Data API v3
   */
  async getVideoData(videoId: string): Promise<YouTubeVideoData | null> {
    if (!this.isConfigured()) {
      console.log('YouTube API not configured');
      return null;
    }

    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [videoId]
      });

      if (!response.data.items || response.data.items.length === 0) {
        console.log(`No video found for ID: ${videoId}`);
        return null;
      }

      const video = response.data.items[0];
      const snippet = video.snippet;
      const statistics = video.statistics;
      const contentDetails = video.contentDetails;

      return {
        id: videoId,
        title: snippet.title || '',
        description: snippet.description || '',
        channelTitle: snippet.channelTitle || '',
        publishedAt: snippet.publishedAt || '',
        duration: contentDetails.duration || '',
        viewCount: parseInt(statistics.viewCount || '0'),
        thumbnails: {
          default: snippet.thumbnails?.default?.url || '',
          medium: snippet.thumbnails?.medium?.url || '',
          high: snippet.thumbnails?.high?.url || '',
          maxres: snippet.thumbnails?.maxres?.url
        },
        tags: snippet.tags || [],
        categoryId: snippet.categoryId || '',
        defaultLanguage: snippet.defaultLanguage,
        captions: contentDetails.caption === 'true'
      };

    } catch (error) {
      console.error('Error fetching video data from YouTube API:', error);
      return null;
    }
  }

  /**
   * Get available caption tracks for a video
   */
  async getCaptionTracks(videoId: string): Promise<any[]> {
    if (!this.isConfigured()) {
      console.log('YouTube API not configured');
      return [];
    }

    try {
      const response = await this.youtube.captions.list({
        part: ['snippet'],
        videoId: videoId
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching caption tracks:', error);
      return [];
    }
  }

  /**
   * Download transcript using caption ID
   * Note: This requires OAuth authentication for most videos
   */
  async downloadTranscript(captionId: string, authenticatedClient?: any): Promise<string | null> {
    // Use authenticated client if provided, otherwise fall back to API key
    const client = authenticatedClient || this.youtube;
    
    if (!client) {
      console.log('No YouTube API client available');
      return null;
    }

    try {
      const response = await client.captions.download({
        id: captionId,
        tfmt: 'srt' // Can be 'srt', 'vtt', or 'ttml'
      });

      return response.data;
    } catch (error) {
      console.error('Error downloading transcript:', error);
      return null;
    }
  }

  /**
   * Parse duration from YouTube API format (PT4M13S) to seconds
   */
  parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Format view count for display
   */
  formatViewCount(count: number): string {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M views`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K views`;
    }
    return `${count} views`;
  }
}

export const youtubeAPI = new YouTubeAPIService();