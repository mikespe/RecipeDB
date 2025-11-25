import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Recipe } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TranslationControls from "@/components/translation-controls";
import { ArrowLeft, Clock, Users, ExternalLink, Globe, User, ChefHat, Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useToast } from "@/hooks/use-toast";

export default function RecipeDetail() {
  const { id } = useParams();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { toast } = useToast();

  const { data: recipe, isLoading, error } = useQuery<Recipe>({
    queryKey: ['/api/recipes', id],
    queryFn: async () => {
      const response = await fetch(`/api/recipes/${id}`);
      if (!response.ok) throw new Error('Failed to fetch recipe');
      const result = await response.json();
      // Handle nested response structure: {success: true, recipe: {...}}
      return result.recipe || result;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/">
                <Button variant="ghost" className="flex items-center space-x-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Recipes</span>
                </Button>
              </Link>
              {/* TranslationControls - Hidden for now */}
              {/* <TranslationControls /> */}
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded mb-4"></div>
            <div className="h-64 bg-slate-200 rounded mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">Recipe Not Found</h2>
            <p className="text-slate-600 mb-4">The recipe you're looking for doesn't exist.</p>
            <Link href="/">
              <Button>Browse All Recipes</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const ingredients = (JSON.parse(recipe.ingredients || '[]') as string[]).filter(ing => ing && ing.trim().length > 0);
  const directions = (JSON.parse(recipe.directions || '[]') as string[]).filter(dir => dir && dir.trim().length > 0);
  const favorite = isFavorite(recipe.id);

  const handleFavoriteClick = () => {
    toggleFavorite(recipe.id);
    toast({
      title: favorite ? "Removed from favorites" : "Added to favorites",
      description: favorite 
        ? `${recipe.title} has been removed from your favorites.`
        : `${recipe.title} has been added to your favorites.`,
    });
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
    const fallback = target.nextElementSibling as HTMLElement;
    if (fallback) fallback.style.display = 'flex';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <Button variant="ghost" className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Recipes</span>
              </Button>
            </Link>
            {/* TranslationControls - Hidden for now */}
            {/* <TranslationControls /> */}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Recipe Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                {recipe.title}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                className={`h-10 w-10 rounded-full ${
                  favorite ? 'text-red-500 hover:text-red-600' : 'text-slate-400 hover:text-red-500'
                }`}
                onClick={handleFavoriteClick}
                aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`h-6 w-6 ${favorite ? 'fill-current' : ''}`} />
              </Button>
            </div>
            
            <div className="flex justify-center items-center space-x-4 mb-6">
              <Badge 
                className={`${
                  recipe.isAutoScraped === 1 
                    ? "bg-blue-100 text-blue-700 border-blue-300" 
                    : "bg-green-100 text-green-700 border-green-300"
                }`}
              >
                {recipe.isAutoScraped === 1 ? (
                  <>
                    <Globe className="h-3 w-3 mr-1" />
                    Auto-scraped
                  </>
                ) : (
                  <>
                    <User className="h-3 w-3 mr-1" />
                    User-added
                  </>
                )}
              </Badge>
              
              {recipe.source && recipe.source !== "Manual Entry" && (
                <a 
                  href={recipe.source} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-slate-600 hover:text-blue-600 transition-colors"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Original
                </a>
              )}
            </div>
          </div>

          {/* Recipe Image */}
          {recipe.imageUrl && (
            <div className="relative">
              <img 
                src={recipe.imageUrl} 
                alt={recipe.title}
                className="w-full h-80 object-cover rounded-xl shadow-lg"
                onError={handleImageError}
                loading="lazy"
              />
              <div 
                className="w-full h-80 bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center rounded-xl shadow-lg" 
                style={{display: 'none'}}
              >
                <ChefHat className="h-16 w-16 text-slate-400" />
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Ingredients */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>🥘</span>
                  <span>Ingredients</span>
                  <Badge variant="secondary" className="ml-auto">
                    {ingredients.length} items
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {ingredients.map((ingredient: string, index: number) => (
                    <li 
                      key={`ingredient-${index}-${ingredient.slice(0, 10)}`} 
                      className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <span className="text-blue-600 font-medium text-sm mt-0.5">
                        {index + 1}.
                      </span>
                      <span className="text-slate-700 leading-relaxed">{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Directions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>👨‍🍳</span>
                  <span>Directions</span>
                  <Badge variant="secondary" className="ml-auto">
                    {directions.length} steps
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {directions.map((direction: string, index: number) => (
                    <li 
                      key={`direction-${index}-${direction.slice(0, 10)}`} 
                      className="flex items-start space-x-3 p-4 bg-slate-50 rounded-lg"
                    >
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <p className="text-slate-700 leading-relaxed">{direction}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}