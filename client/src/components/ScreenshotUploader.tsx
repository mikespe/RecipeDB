import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, ImageIcon, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ScreenshotUploaderProps {
  onSubmit: (data: { url: string; screenshot: File }) => void;
  isLoading?: boolean;
}

export function ScreenshotUploader({ onSubmit, isLoading }: ScreenshotUploaderProps) {
  const [url, setUrl] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setScreenshot(file);
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && screenshot) {
      onSubmit({ url, screenshot });
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Screenshot Recipe Submission
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            For recipes from AllRecipes or Food Network that can't be automatically scraped, 
            upload a screenshot and we'll extract the recipe details using AI.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="recipe-url">Recipe URL</Label>
            <Input
              id="recipe-url"
              type="url"
              placeholder="https://www.allrecipes.com/recipe/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="screenshot">Recipe Screenshot</Label>
            <div className="mt-2">
              <input
                id="screenshot"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('screenshot')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {screenshot ? 'Change Screenshot' : 'Upload Screenshot'}
              </Button>
            </div>
          </div>

          {previewUrl && (
            <div className="mt-4">
              <Label>Preview</Label>
              <div className="mt-2 border rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Recipe screenshot preview"
                  className="w-full h-64 object-cover"
                />
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={!url || !screenshot || isLoading}
            className="w-full"
          >
            {isLoading ? 'Processing...' : 'Extract Recipe from Screenshot'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}