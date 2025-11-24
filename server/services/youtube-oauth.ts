/**
 * YouTube OAuth2 service for authenticated transcript access
 * Handles OAuth flow and stores/retrieves access tokens for YouTube API calls
 */

import { google } from 'googleapis';

export interface YouTubeOAuthToken {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

export class YouTubeOAuthService {
  private oauth2Client: any;

  constructor() {
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/api/auth/youtube/callback`
      );
    }
  }

  /**
   * Check if OAuth2 is properly configured
   */
  isConfigured(): boolean {
    return !!this.oauth2Client && !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
  }

  /**
   * Generate OAuth2 authorization URL
   */
  getAuthUrl(): string {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not configured');
    }

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl'
      ],
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<YouTubeOAuthToken> {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not configured');
    }

    const { tokens } = await this.oauth2Client.getAccessToken(code);
    return tokens as YouTubeOAuthToken;
  }

  /**
   * Get authenticated YouTube API client
   */
  getAuthenticatedYouTubeClient(tokens: YouTubeOAuthToken) {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not configured');
    }

    this.oauth2Client.setCredentials(tokens);
    
    return google.youtube({
      version: 'v3',
      auth: this.oauth2Client
    });
  }

  /**
   * Refresh access token if needed
   */
  async refreshTokenIfNeeded(tokens: YouTubeOAuthToken): Promise<YouTubeOAuthToken> {
    if (!this.oauth2Client || !tokens.refresh_token) {
      return tokens;
    }

    // Check if token is expired (with 5 minute buffer)
    const now = Date.now();
    if (tokens.expiry_date && now >= (tokens.expiry_date - 300000)) {
      this.oauth2Client.setCredentials(tokens);
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials as YouTubeOAuthToken;
    }

    return tokens;
  }
}

// Global instance
export const youTubeOAuthService = new YouTubeOAuthService();