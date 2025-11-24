import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Recipe } from "@shared/schema";
import RecipeCard from "@/components/recipe-card";
import AddRecipeModal from "@/components/add-recipe-modal";
import SearchFilters from "@/components/search-filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import TranslationControls from "@/components/translation-controls";
import { useToast } from "@/hooks/use-toast";
import { Utensils, Plus, Search, Database, ImageIcon } from "lucide-react";
import UserMenu from "@/components/user-menu";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";

interface PaginatedRecipesResponse {
  recipes: Recipe[];
  total: number;
  hasMore: boolean;
}

export default function Home() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Query for paginated recipes (initial load + load more)
  const { data: paginatedData, isLoading, error, isFetching } = useQuery<PaginatedRecipesResponse>({
    queryKey: ['/api/recipes/paginated', { page: currentPage, limit: 10 }],
    queryFn: async () => {
      const response = await fetch(`/api/recipes/paginated?page=${currentPage}&limit=10`);
      if (!response.ok) throw new Error('Failed to fetch recipes');
      const result = await response.json();
      // Handle nested response structure: {success: true, recipes: {recipes: [...], total, hasMore}}
      return result.recipes || result;
    },
    enabled: !searchQuery, // Only fetch paginated data when not searching
  });

  // Query for search results
  const { data: searchResults, isLoading: isSearching } = useQuery<Recipe[]>({
    queryKey: ['/api/recipes/search', { q: searchQuery }],
    queryFn: async () => {
      const response = await fetch(`/api/recipes/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Failed to search recipes');
      const result = await response.json();
      // Handle potential nested response structure
      return result.recipes || result;
    },
    enabled: !!searchQuery,
  });

  // Query for recipe statistics
  const { data: recipeStats } = useQuery<{ total: number, autoScraped: number, userAdded: number }>({
    queryKey: ['/api/recipes/stats'],
    queryFn: async () => {
      const response = await fetch('/api/recipes/stats');
      if (!response.ok) throw new Error('Failed to fetch recipe stats');
      return response.json();
    },
  });

  // Update allRecipes when paginated data changes
  useEffect(() => {
    if (paginatedData && !searchQuery) {
      if (currentPage === 1) {
        // First page - replace all recipes
        setAllRecipes(paginatedData.recipes);
      } else {
        // Subsequent pages - append to existing recipes
        setAllRecipes(prev => [...prev, ...paginatedData.recipes]);
      }
    }
  }, [paginatedData, currentPage, searchQuery]);

  const recipes = searchQuery ? searchResults : allRecipes;
  const hasMoreRecipes = paginatedData?.hasMore || false;
  const totalRecipes = recipeStats?.total || 0;
  const autoScrapedCount = recipeStats?.autoScraped || 0;
  const userAddedCount = recipeStats?.userAdded || 0;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query) {
      // Reset to first page when clearing search
      setCurrentPage(1);
    }
  };

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const rescrapeImagesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/rescrape-images', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to rescrape images');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Image Rescraping Complete",
        description: `Processed ${data.processed} recipes, updated ${data.updated} with new images.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recipes/stats'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to rescrape images. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center h-16">
              <div className="flex items-center space-x-3">
                <Utensils className="text-blue-600 text-2xl" />
                <h1 className="text-xl font-semibold text-slate-900">Recipe Database</h1>
              </div>
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md mx-auto">
              <div className="text-red-600 text-3xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Recipes</h3>
              <p className="text-red-700 text-sm">Unable to load recipes. Please try again later.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main header row */}
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Utensils className="text-blue-600 text-2xl" />
              <h1 className="text-xl font-semibold text-slate-900">Recipe Database</h1>
            </div>
            
            {/* Mobile: Only show add button, translation, and user menu */}
            <div className="flex items-center space-x-2 md:hidden">
              <TranslationControls />
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <UserMenu />
            </div>
            
            {/* Desktop: Show everything */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="text-slate-700 border-slate-300 bg-slate-50">
                  <Database className="mr-1 h-3 w-3" />
                  Total: {totalRecipes}
                </Badge>
                <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
                  <Database className="mr-1 h-3 w-3" />
                  Auto: {autoScrapedCount}
                </Badge>
                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                  <Plus className="mr-1 h-3 w-3" />
                  User: {userAddedCount}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <TranslationControls />
                <Button 
                  onClick={() => rescrapeImagesMutation.mutate()}
                  disabled={rescrapeImagesMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {rescrapeImagesMutation.isPending ? "Rescaping..." : "Find Images"}
                </Button>
                <UserMenu />
                <Button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Recipe
                </Button>
              </div>
            </div>
          </div>
          
          {/* Mobile stats row - below main header */}
          <div className="md:hidden pb-3 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-center space-x-4">
              <Badge variant="outline" className="text-slate-700 border-slate-300 bg-slate-50 text-xs">
                <Database className="mr-1 h-3 w-3" />
                Total: {totalRecipes}
              </Badge>
              <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 text-xs">
                <Database className="mr-1 h-3 w-3" />
                Auto: {autoScrapedCount}
              </Badge>
              <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-xs">
                <Plus className="mr-1 h-3 w-3" />
                User: {userAddedCount}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <SearchFilters onSearch={handleSearch} />

        {/* Loading State */}
        {(isLoading || isSearching) && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600">
              {searchQuery ? "Searching recipes..." : "Loading recipes..."}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isSearching && recipes?.length === 0 && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <Search className="text-slate-300 text-6xl mb-4 mx-auto" size={96} />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {searchQuery ? "No recipes found" : "No recipes yet"}
              </h3>
              <p className="text-slate-600 mb-4">
                {searchQuery 
                  ? "Try adjusting your search criteria or add some new recipes." 
                  : "Add some recipes to get started with your collection."
                }
              </p>
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Recipe
              </Button>
            </div>
          </div>
        )}

        {/* Recipe Grid */}
        {!isLoading && !isSearching && recipes && recipes.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
            
            {/* Load More Button */}
            {!searchQuery && hasMoreRecipes && (
              <div className="flex justify-center mt-8">
                <Button
                  onClick={handleLoadMore}
                  disabled={isFetching}
                  variant="outline"
                  size="lg"
                  className="px-8 py-3"
                >
                  {isFetching ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Loading...
                    </div>
                  ) : (
                    "Load More Recipes"
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Loading Skeleton */}
        {(isLoading || isSearching) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <Skeleton className="w-full h-48" />
                <div className="p-5">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <Skeleton className="h-10 w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AddRecipeModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
