/**
 * Custom hook for screenshot upload - SOLID Single Responsibility
 * Encapsulates screenshot upload logic
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { fileToBase64 } from '@/utils/imageUtils';

interface ScreenshotUploadData {
  screenshot: File;
  url?: string;
}

export function useScreenshotUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const uploadScreenshot = async (data: ScreenshotUploadData) => {
    if (isUploading) return;

    setIsUploading(true);
    try {
      // Convert file to base64
      const base64String = await fileToBase64(data.screenshot);

      // Upload to API
      const response = await apiRequest('POST', '/api/recipes/screenshot', {
        imageData: base64String,
        url: data.url || 'Screenshot Upload',
      });

      const result = await response.json();

      if (result.success && result.recipe?.id) {
        toast({
          title: 'Success!',
          description: 'Recipe extracted from screenshot!',
          className: 'bg-green-50 border-green-200 text-green-800',
        });
        
        // Navigate to recipe page
        setLocation(`/recipe/${result.recipe.id}`);
        return result.recipe;
      } else {
        throw new Error(result.message || 'Screenshot processing failed');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process screenshot',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadScreenshot, isUploading };
}

