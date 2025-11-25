import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { scrapeRecipeSchema, type ScrapeRecipeRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useScreenshotUpload } from "@/hooks/useScreenshotUpload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { ScreenshotUploader } from "./ScreenshotUploader";
import { Download, LinkIcon, ImageIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AddRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddRecipeModal({ isOpen, onClose }: AddRecipeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("url");
  const { uploadScreenshot, isUploading: isScreenshotUploading } = useScreenshotUpload();

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

      if (result.existingRecipe && result.existingRecipe.id) {
        return result.existingRecipe;
      }

      if (result.success && result.recipe) {
        return result.recipe;
      }

      if (result.id) {
        return result;
      }

      if (result.message && (!result.success && !result.id && !result.recipe)) {
        throw new Error(result.message);
      }

      return result;
    },
    onSuccess: (recipe: any) => {
      toast({
        title: "Recipe Added!",
        description: "Successfully extracted recipe details.",
        className: "bg-green-50 border-green-200 text-green-800",
      });

      form.reset();
      onClose();

      if (recipe?.id) {
        setTimeout(() => {
          setLocation(`/recipe/${recipe.id}`);
        }, 300);
      }

      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
        queryClient.invalidateQueries({ queryKey: ['/api/recipes/paginated'] });
        queryClient.invalidateQueries({ queryKey: ['/api/recipes/stats'] });
      }, 200);
    },
    onError: (error: Error) => {
      toast({
        title: "Extraction Failed",
        description: error.message || "Could not extract recipe. Try another URL.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ScrapeRecipeRequest) => {
    scrapeMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] p-0 overflow-hidden bg-white rounded-2xl shadow-2xl border-0">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-white">
              <span className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                {activeTab === 'url' ? <LinkIcon className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
              </span>
              Add New Recipe
            </DialogTitle>
            <DialogDescription className="text-blue-100 text-base mt-2">
              Import recipes from your favorite websites or upload a screenshot.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <Tabs defaultValue="url" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 p-1 rounded-xl">
              <TabsTrigger
                value="url"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-200"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                URL Import
              </TabsTrigger>
              <TabsTrigger
                value="screenshot"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm transition-all duration-200"
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Screenshot
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              {activeTab === 'url' && (
                <TabsContent key="url-tab" value="url" className="mt-0 focus-visible:outline-none">
                  <motion.div
                    key="url-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-700 font-semibold">Recipe URL</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  placeholder="Paste URL here (e.g., AllRecipes, NYT Cooking, YouTube)"
                                  className="pl-4 pr-10 py-6 text-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl shadow-sm transition-all"
                                  disabled={scrapeMutation.isPending}
                                />
                                {scrapeMutation.isPending && (
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600 space-y-2">
                        <div className="flex items-center gap-2 font-medium text-slate-800">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Supported Sources
                        </div>
                        <ul className="grid grid-cols-2 gap-2 pl-6 list-disc">
                          {[
                            'AllRecipes & Food Network',
                            'NY Times Cooking',
                            'Bon Appétit & Epicurious',
                            'YouTube Videos & Shorts',
                            'Most Food Blogs',
                            'BBC Good Food'
                          ].map((source) => (
                            <li key={source}>{source}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          type="submit"
                          disabled={scrapeMutation.isPending || !form.watch('url')}
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-xl font-semibold text-lg shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all duration-200"
                        >
                          {scrapeMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Analyzing Recipe...
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-5 w-5" />
                              Import Recipe
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                  </motion.div>
                </TabsContent>
              )}

              {activeTab === 'screenshot' && (
                <TabsContent key="screenshot-tab" value="screenshot" className="mt-0 focus-visible:outline-none">
                  <motion.div
                    key="screenshot-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                  <ScreenshotUploader
                    onSubmit={async (data) => {
                      try {
                        await uploadScreenshot(data);
                        form.reset();
                        onClose();
                      } catch (error) {
                        // Error already handled in hook
                      }
                    }}
                    isLoading={isScreenshotUploading}
                  />
                  </motion.div>
                </TabsContent>
              )}
            </AnimatePresence>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}