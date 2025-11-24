import { Link } from "wouter";
import { Recipe } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, ExternalLink, Globe, User, Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const ingredients = JSON.parse(recipe.ingredients || '[]');
  const displayIngredients = ingredients.slice(0, 4);
  const hasMoreIngredients = ingredients.length > 4;
  const { toggleFavorite, isFavorite } = useFavorites();
  const isLiked = isFavorite(recipe.id);
  
  // Handle image loading with fallback
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
    const fallback = target.nextElementSibling as HTMLElement;
    if (fallback) fallback.style.display = 'flex';
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative">
        {recipe.imageUrl ? (
          <>
            <img 
              src={recipe.imageUrl} 
              alt={recipe.title}
              className="w-full h-48 object-cover"
              onError={handleImageError}
              loading="lazy"
            />
            <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center" style={{display: 'none'}}>
              <span className="text-slate-600 text-lg font-medium">🍳</span>
            </div>
          </>
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center">
            <span className="text-slate-600 text-lg font-medium">🍳</span>
          </div>
        )}
        
        <div className="absolute bottom-3 left-3 flex space-x-2">
          <Badge className="bg-white bg-opacity-90 text-slate-700 hover:bg-white">
            <Clock className="h-3 w-3 mr-1" />
            Recipe
          </Badge>
        </div>
        
        <div className="absolute top-3 left-3">
          <Badge 
            className={`${
              recipe.isAutoScraped === 1 
                ? "bg-blue-100 text-blue-700 border-blue-300" 
                : "bg-green-100 text-green-700 border-green-300"
            } bg-opacity-90 hover:bg-opacity-100`}
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
        </div>
        
        <div className="absolute top-3 right-3 flex items-center space-x-2">
          {(recipe.favoriteCount || 0) > 0 && (
            <Badge className="bg-white bg-opacity-90 text-slate-700 hover:bg-white text-xs">
              {recipe.favoriteCount} ❤️
            </Badge>
          )}
          <Button
            variant="secondary"
            size="sm"
            className={`${
              isLiked 
                ? "bg-red-100 text-red-700 border-red-300 hover:bg-red-200" 
                : "bg-white bg-opacity-90 text-slate-600 hover:bg-red-50 hover:text-red-600"
            } w-8 h-8 p-0`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(recipe.id);
            }}
          >
            <Heart 
              className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`}
            />
          </Button>
        </div>
      </div>
      
      <CardContent className="p-5">
        <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">
          {recipe.title}
        </h3>
        
        {recipe.source && (
          <div className="flex items-center text-xs text-slate-500 mb-3">
            <ExternalLink className="h-3 w-3 mr-1" />
            <a 
              href={recipe.source} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-600 transition-colors truncate"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                try {
                  return new URL(recipe.source).hostname;
                } catch (error) {
                  return recipe.source.length > 30 ? recipe.source.substring(0, 30) + '...' : recipe.source;
                }
              })()}
            </a>
          </div>
        )}

        <div className="space-y-3">
          {displayIngredients.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Key Ingredients</h4>
              <div className="flex flex-wrap gap-1">
                {displayIngredients.map((ingredient: string, index: number) => (
                  <Badge 
                    key={index}
                    variant="secondary" 
                    className="bg-slate-100 text-slate-700 text-xs"
                  >
                    {ingredient.length > 15 ? ingredient.substring(0, 15) + '...' : ingredient}
                  </Badge>
                ))}
                {hasMoreIngredients && (
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-xs">
                    +{ingredients.length - 4} more
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          <div className="flex justify-center text-sm">
            <span className="text-slate-600">
              {ingredients.length} ingredients
            </span>
          </div>
        </div>

        <Link href={`/recipe/${recipe.id}`}>
          <Button 
            className="w-full mt-4 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors text-sm font-medium"
            variant="secondary"
          >
            View Full Recipe
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
