import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Recipe, PaginatedRecipesResponse } from "@shared/schema";
import RecipeCard from "@/components/recipe-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Search, ChefHat, ArrowUp, Heart } from "lucide-react";
import { Link } from "wouter";
import { useFavorites } from "@/hooks/useFavorites";
import AddRecipeModal from "@/components/add-recipe-modal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { favoriteCount } = useFavorites();
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Handle scroll to top visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Query for paginated recipes (initial load + load more)
  const { data: paginatedData, isLoading, error, isFetching } = useQuery<PaginatedRecipesResponse>({
    queryKey: ['/api/recipes/paginated', { page: currentPage, limit: 12 }],
    queryFn: async () => {
      const response = await fetch(`/api/recipes/paginated?page=${currentPage}&limit=12`);
      if (!response.ok) throw new Error('Failed to fetch recipes');
      const result = await response.json();
      return result.recipes || result;
    },
    enabled: !searchQuery,
  });

  // Query for search results
  const { data: searchResults, isLoading: isSearching } = useQuery<Recipe[]>({
    queryKey: ['/api/recipes/search', { q: searchQuery }],
    queryFn: async () => {
      const response = await fetch(`/api/recipes/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Failed to search recipes');
      const result = await response.json();
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
        setAllRecipes(paginatedData.recipes);
      } else {
        setAllRecipes(prev => {
          const newRecipes = paginatedData.recipes.filter(
            (newRecipe: Recipe) => !prev.some(existing => existing.id === newRecipe.id)
          );
          return [...prev, ...newRecipes];
        });
      }
    }
  }, [paginatedData, currentPage, searchQuery]);

  const recipes = searchQuery ? searchResults : allRecipes;
  const hasMoreRecipes = paginatedData?.hasMore || false;
  const totalRecipes = recipeStats?.total || 0;
  const autoScrapedCount = recipeStats?.autoScraped || 0;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setCurrentPage(1);
    }
  };

  const handleLoadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <ChefHat className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Oops! Something went wrong</h2>
        <p className="text-slate-600 mb-6 max-w-md">
          We couldn't load your recipes. Please try again later.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh Page
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Hero Section */}
      <div className="relative bg-white border-b border-slate-100 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-50" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-30" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-30" />

        <div className="container mx-auto px-4 py-16 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
                Your Personal <span className="text-blue-600">Recipe Collection</span>
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed">
                Organize, discover, and cook your favorite meals.
                <span className="hidden sm:inline"> Automatically extracted from your favorite websites.</span>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8"
            >
              <div className="relative w-full max-w-md group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  type="text"
                  placeholder="Search recipes, ingredients, or tags..."
                  className="pl-12 pr-4 h-14 rounded-2xl border-slate-200 shadow-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-lg transition-all"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <Link href="/favorites">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 px-6 rounded-2xl border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all text-lg font-semibold relative"
                  >
                    <Heart className="mr-2 h-5 w-5" />
                    Favorites
                    {favoriteCount > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {favoriteCount}
                      </span>
                    )}
                  </Button>
                </Link>
                <Button
                  size="lg"
                  onClick={() => setIsAddModalOpen(true)}
                  className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all text-lg font-semibold"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add Recipe
                </Button>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center gap-8 mt-8 text-sm font-medium text-slate-500"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                {totalRecipes} Recipes
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                {autoScrapedCount} Auto-Scraped
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {isLoading && currentPage === 1 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-[400px] rounded-2xl bg-white border border-slate-100 shadow-sm animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {recipes && recipes.length > 0 ? (
              <div className="space-y-12">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                >
                  {recipes.map((recipe, index) => (
                    <motion.div
                      key={recipe.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <RecipeCard recipe={recipe} />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Load More */}
                {!searchQuery && hasMoreRecipes && (
                  <div className="flex justify-center pt-8">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleLoadMore}
                      disabled={isFetching}
                      className="h-12 px-8 rounded-xl border-slate-200 hover:bg-white hover:border-blue-300 hover:text-blue-600 transition-all"
                    >
                      {isFetching ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading more...
                        </>
                      ) : (
                        "Load More Recipes"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200"
              >
                <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ChefHat className="h-10 w-10 text-blue-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  {searchQuery ? "No recipes found" : "Start your collection"}
                </h3>
                <p className="text-slate-500 max-w-md mx-auto mb-8">
                  {searchQuery
                    ? `We couldn't find any recipes matching "${searchQuery}". Try a different search term.`
                    : "Add your first recipe by pasting a URL from your favorite cooking site."}
                </p>
                <Button
                  size="lg"
                  onClick={() => setIsAddModalOpen(true)}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add New Recipe
                </Button>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 p-4 bg-white text-blue-600 rounded-full shadow-xl border border-slate-100 hover:bg-blue-50 transition-colors z-50"
          >
            <ArrowUp className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AddRecipeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
