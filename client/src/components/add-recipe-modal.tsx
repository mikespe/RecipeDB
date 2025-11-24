import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { scrapeRecipeSchema, type ScrapeRecipeRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScreenshotUploader } from "./ScreenshotUploader";
import { Download, Link, AlertCircle, LinkIcon, ImageIcon } from "lucide-react";

interface AddRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddRecipeModal({ isOpen, onClose }: AddRecipeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const form = useForm<ScrapeRecipeRequest>({
    resolver: zodResolver(scrapeRecipeSchema),
    defaultValues: {
      url: "",
    },
  });

  // Helper function to detect YouTube URLs
  const isYouTubeUrl = (url: string): boolean => {
    return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/|www\.youtube\.com\/watch\?v=|www\.youtube\.com\/shorts\/)/.test(url);
  };

  const scrapeMutation = useMutation({
    mutationFn: async (data: ScrapeRecipeRequest) => {
      const endpoint = isYouTubeUrl(data.url) 
        ? '/api/youtube/extract-recipe' 
        : '/api/recipes/scrape';
      const response = await apiRequest('POST', endpoint, data);
      const result = await response.json();
      
      console.log('Scraping response:', result);
      
      // Check if this is a duplicate recipe response
      if (result.existingRecipe && result.existingRecipe.id) {
        // Return the existing recipe for navigation
        return result.existingRecipe;
      }
      
      // For successful scraping responses that have a recipe
      if (result.success && result.recipe) {
        return result;
      }
      
      // For responses with recipe data directly
      if (result.id) {
        return result;
      }
      
      // Check if this is an error response (e.g., "No recipe found")
      if (result.message && (!result.success && !result.id && !result.recipe)) {
        throw new Error(result.message);
      }
      
      return result;
    },
    onSuccess: (response: any) => {
      // Check if this was a duplicate detection
      const isDuplicate = response?.scrapedAt && new Date(response.scrapedAt) < new Date(Date.now() - 10000);
      
      toast({
        title: "Success!",
        description: isDuplicate 
          ? "Recipe already exists! Redirecting to existing recipe..."
          : "Recipe scraped and added successfully! Redirecting to recipe...",
      });
      
      // Handle both response formats: direct recipe or wrapped in recipe property
      const recipe = response?.recipe || response;
      
      // Close modal and navigate
      form.reset();
      onClose();
      
      // Navigate to the recipe detail page
      if (recipe?.id) {
        setTimeout(() => {
          setLocation(`/recipe/${recipe.id}`);
        }, 100); // Small delay to ensure modal is closed
      }
      
      // Invalidate queries after navigation
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
        queryClient.invalidateQueries({ queryKey: ['/api/recipes/paginated'] });
        queryClient.invalidateQueries({ queryKey: ['/api/recipes/stats'] });
      }, 200);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to scrape recipe data",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ScrapeRecipeRequest) => {
    scrapeMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Add Recipe from URL
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs defaultValue="url" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                URL Scraping
              </TabsTrigger>
              <TabsTrigger value="screenshot" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Screenshot Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Works best with: NY Times Cooking, King Arthur Baking, BBC Good Food, Recipe Tin Eats. 
                  AllRecipes and Food Network have enterprise-grade bot protection (7 bypass strategies attempted).
                </AlertDescription>
              </Alert>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipe URL</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://example.com/recipe or https://youtube.com/watch?v=..."
                            type="url"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700">
                    <p className="font-medium mb-1">Supported sources:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Most cooking blogs with structured recipe data</li>
                      <li>YouTube videos and YouTube Shorts</li>
                      <li>King Arthur Baking, NY Times Cooking, BBC Good Food</li>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={scrapeMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={scrapeMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {scrapeMutation.isPending ? (
                        <>
                          <Download className="h-4 w-4 animate-spin" />
                          Scraping...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Scrape Recipe
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="screenshot" className="space-y-4">
              <ScreenshotUploader 
                onSubmit={async (data) => {
                  try {
                    // Convert file to base64
                    const fileReader = new FileReader();
                    fileReader.onloadend = async () => {
                      const base64String = fileReader.result as string;
                      
                      // Submit to screenshot endpoint
                      const response = await apiRequest('POST', '/api/recipes/screenshot', {
                        imageData: base64String,
                        url: data.url
                      });
                      
                      const result = await response.json();
                      
                      if (result.success) {
                        toast({
                          title: "Success!",
                          description: "Recipe extracted from screenshot! Redirecting to recipe...",
                        });
                        
                        // Navigate to the recipe
                        form.reset();
                        onClose();
                        setLocation(`/recipe/${result.recipe.id}`);
                      } else {
                        throw new Error(result.message || 'Screenshot processing failed');
                      }
                    };
                    
                    fileReader.readAsDataURL(data.screenshot);
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to process screenshot",
                      variant: "destructive",
                    });
                  }
                }}
                isLoading={scrapeMutation.isPending}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}