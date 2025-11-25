import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, ImageIcon, AlertCircle, X, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isValidImageFile } from "@/utils/imageUtils";

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
    if (file && isValidImageFile(file)) {
      setScreenshot(file);
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (screenshot) {
      onSubmit({ url: url || "Screenshot Upload", screenshot });
    }
  };

  const clearImage = () => {
    setScreenshot(null);
    setPreviewUrl(null);
  };

  return (
    <div className="space-y-4">
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Upload a screenshot of a recipe and we'll extract the details using AI vision.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="screenshot" className="text-slate-700 font-semibold">Recipe Screenshot</Label>
          <div className="mt-2">
            <input
              id="screenshot"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              required
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('screenshot')?.click()}
              disabled={isLoading}
              className="w-full h-12 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-5 w-5 mr-2" />
              {screenshot ? 'Change Screenshot' : 'Choose Image'}
            </Button>
          </div>
        </div>

        {previewUrl && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-slate-700 font-semibold">Preview</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearImage}
                className="h-8 text-slate-500 hover:text-red-600"
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
            <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
              <img
                src={previewUrl}
                alt="Recipe screenshot preview"
                className="w-full max-h-48 object-contain bg-slate-50"
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="recipe-url" className="text-slate-700 font-semibold">
            Source URL <span className="text-slate-400 font-normal">(optional)</span>
          </Label>
          <Input
            id="recipe-url"
            type="url"
            placeholder="https://example.com/recipe (optional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            className="mt-2 border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <Button
          type="submit"
          disabled={!screenshot || isLoading}
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Extracting Recipe...
            </>
          ) : (
            'Extract Recipe'
          )}
        </Button>
      </form>
    </div>
  );
}