/**
 * URL utility functions - follows Single Responsibility Principle
 */

export class UrlUtils {
  private static readonly YOUTUBE_PATTERNS = [
    /(?:(?:www\.)?youtube\.com\/watch\?v=|youtu\.be\/|(?:www\.)?youtube\.com\/embed\/|(?:www\.)?youtube\.com\/shorts\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];

  /**
   * Extract YouTube video ID from various URL formats
   */
  static extractYouTubeVideoId(url: string): string | null {
    for (const pattern of this.YOUTUBE_PATTERNS) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Check if URL is a YouTube URL (supports all formats including Shorts)
   */
  static isYouTubeUrl(url: string): boolean {
    return /(?:(?:www\.)?youtube\.com\/watch\?v=|youtu\.be\/|(?:www\.)?youtube\.com\/embed\/|(?:www\.)?youtube\.com\/shorts\/)/.test(url);
  }

  /**
   * Normalize YouTube URL to standard format
   */
  static normalizeYouTubeUrl(url: string): string | null {
    const videoId = this.extractYouTubeVideoId(url);
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}