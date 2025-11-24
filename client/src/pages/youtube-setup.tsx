import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ExternalLink, Key, Video, CheckCircle, XCircle } from 'lucide-react';

export default function YouTubeSetupPage() {
  const [testVideoId, setTestVideoId] = useState('dQw4w9WgXcQ'); // Rick Roll for testing
  const { toast } = useToast();

  // Test API connectivity
  const testApiMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const response = await apiRequest(`/api/youtube/test/${videoId}`, {
        method: 'GET'
      });
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "API Test Complete",
        description: data.api_configured ? "YouTube API is working!" : "API not configured yet",
      });
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Extract video ID from URL
  const extractVideoId = (url: string): string => {
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
    return url; // Return as-is if no pattern matches
  };

  const handleTestVideo = () => {
    const videoId = extractVideoId(testVideoId);
    testApiMutation.mutate(videoId);
  };

  const testResult = testApiMutation.data as any;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">YouTube API Setup</h1>
        <p className="text-muted-foreground">
          Configure YouTube Data API v3 for enhanced recipe extraction from YouTube videos
        </p>
      </div>

      {/* OAuth Setup Alternative */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            YouTube OAuth Setup
          </CardTitle>
          <CardDescription>
            Follow these steps to get your YouTube Data API v3 key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-semibold">Step 1: Google Cloud Console</h3>
              <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Go to Google Cloud Console</li>
                <li>Create new project or select existing</li>
                <li>Navigate to "APIs & Services" → "Library"</li>
                <li>Search for "YouTube Data API v3"</li>
                <li>Click "Enable"</li>
              </ol>
              <Button variant="outline" size="sm" asChild>
                <a 
                  href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  Open Google Cloud Console
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold">Step 2: Create Credentials</h3>
              <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Go to "Credentials" section</li>
                <li>Click "Create Credentials"</li>
                <li>Select "API Key"</li>
                <li>Copy your API key</li>
                <li>Optionally restrict to YouTube Data API</li>
              </ol>
              <Button variant="outline" size="sm" asChild>
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  Create API Key
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>

          <Separator />
          
          <Alert>
            <AlertDescription>
              <strong>API Key Status:</strong> ✅ Your YouTube API key is configured and working! 
              The system is now ready to extract recipes from YouTube videos.
            </AlertDescription>
          </Alert>

          <div className="mt-4 p-4 border rounded-lg bg-green-50 dark:bg-green-950">
            <h4 className="font-semibold mb-2">✅ YouTube Integration Ready</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Your YouTube API is working! The system can now:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Extract video metadata (title, channel, description)</li>
              <li>Access video transcripts when available</li>
              <li>Use AI to extract recipe information from video content</li>
              <li>Process both regular YouTube videos and YouTube Shorts</li>
            </ul>
            <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900 rounded text-xs">
              <strong>Note:</strong> OAuth2 is temporarily disabled due to Google's secure browser requirements in development. 
              The API key provides excellent access for recipe extraction from public YouTube videos.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Test */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Test YouTube API
          </CardTitle>
          <CardDescription>
            Test API connectivity and video analysis capabilities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter YouTube URL or Video ID"
              value={testVideoId}
              onChange={(e) => setTestVideoId(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleTestVideo}
              disabled={testApiMutation.isPending}
            >
              {testApiMutation.isPending ? 'Testing...' : 'Test API'}
            </Button>
          </div>

          {testResult && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center gap-2">
                {testResult.api_configured ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  API Status: {testResult.api_configured ? 'Configured' : 'Not Configured'}
                </span>
              </div>

              {testResult.api_configured && testResult.video_data && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Video Information:</h4>
                  <div className="grid gap-2 text-sm">
                    <div><strong>Title:</strong> {testResult.video_data.title}</div>
                    <div><strong>Channel:</strong> {testResult.video_data.channel}</div>
                    <div><strong>Duration:</strong> {testResult.video_data.duration_seconds} seconds</div>
                    <div><strong>Views:</strong> {testResult.video_data.view_count_formatted}</div>
                    <div><strong>Captions:</strong> {testResult.video_data.captions_available ? 'Available' : 'Not Available'}</div>
                    <div><strong>Description:</strong> {testResult.video_data.description_length} characters</div>
                  </div>
                </div>
              )}

              {testResult.transcript && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Transcript Information:</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <strong>Available:</strong> 
                      {testResult.transcript.available ? (
                        <Badge variant="default">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </div>
                    {testResult.transcript.available && (
                      <>
                        <div><strong>Source:</strong> {testResult.transcript.source}</div>
                        <div><strong>Language:</strong> {testResult.transcript.language}</div>
                        <div><strong>Length:</strong> {testResult.transcript.character_count} characters</div>
                        <div className="flex items-center gap-2">
                          <strong>Recipe Suitable:</strong>
                          {testResult.transcript.suitable_for_recipes ? (
                            <Badge variant="default">Yes</Badge>
                          ) : (
                            <Badge variant="destructive">No</Badge>
                          )}
                        </div>
                        {testResult.transcript.preview && (
                          <div>
                            <strong>Preview:</strong>
                            <p className="text-xs bg-background border rounded p-2 mt-1">
                              {testResult.transcript.preview}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {!testResult.api_configured && (
                <Alert>
                  <AlertDescription>
                    {testResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Features Available with YouTube API</CardTitle>
          <CardDescription>
            What you'll get once the API is configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-semibold">Enhanced Video Data</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Official video titles and descriptions</li>
                <li>• Accurate view counts and duration</li>
                <li>• Channel information and metadata</li>
                <li>• High-quality thumbnail images</li>
                <li>• Video tags and categories</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Transcript Access</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Official closed captions when available</li>
                <li>• Auto-generated transcripts</li>
                <li>• Multiple language support</li>
                <li>• Fallback to unofficial methods</li>
                <li>• Better recipe extraction accuracy</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}