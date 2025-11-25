import { useQuery } from "@tanstack/react-query";
import { Recipe } from "@shared/schema";
import RecipeCard from "@/components/recipe-card";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft, ChefHat } from "lucide-react";
import { Link } from "wouter";
import { useFavorites } from "@/hooks/useFavorites";
import { motion } from "framer-motion";

export default function Favorites() {
  const { favoriteIds, clearFavorites, favoriteCount } = useFavorites();

  // Fetch all favorite recipes
  const { data: favoriteRecipes, isLoading } = useQuery<Recipe[]>({
    queryKey: ['/api/recipes/favorites', favoriteIds],
    queryFn: async () => {
      if (favoriteIds.length === 0) return [];
      
      // Fetch recipes in parallel
      const promises = favoriteIds.map(async (id: string) => {
        const response = await fetch(`/api/recipes/${id}`);
        if (!response.ok) return null;
        const result = await response.json();
        return result.recipe || result;
      });
      
      const recipes = await Promise.all(promises);
      return recipes.filter((recipe): recipe is Recipe => recipe !== null);
    },
    enabled: favoriteIds.length > 0,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/">
                <Button variant="ghost" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Recipes</span>
                </Button>
              </Link>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-[400px] rounded-2xl bg-white border border-slate-100 shadow-sm animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const recipes = favoriteRecipes || [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <Button variant="ghost" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Recipes</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-red-500 fill-current" />
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Favorite Recipes</h1>
                <p className="text-slate-600 mt-1">
                  {favoriteCount === 0 
                    ? "No favorites yet. Start adding recipes you love!"
                    : `${favoriteCount} ${favoriteCount === 1 ? 'recipe' : 'recipes'} saved`
                  }
                </p>
              </div>
            </div>
            {favoriteCount > 0 && (
              <Button
                variant="outline"
                onClick={clearFavorites}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Recipes Grid */}
        {favoriteCount === 0 ? (
          <div className="text-center py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-200">
                <ChefHat className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                  No favorites yet
                </h2>
                <p className="text-slate-600 mb-6">
                  Start exploring recipes and click the heart icon to save your favorites!
                </p>
                <Link href="/">
                  <Button>Browse Recipes</Button>
                </Link>
              </div>
            </motion.div>
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-200">
                <ChefHat className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                  Loading favorites...
                </h2>
                <p className="text-slate-600">
                  Fetching your favorite recipes...
                </p>
              </div>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}

