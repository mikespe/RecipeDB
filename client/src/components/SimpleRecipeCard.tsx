/**
 * Simplified Recipe Card Component - KISS & DRY principles
 * Clean, maintainable component with focused responsibility
 */

import { Recipe } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Users, ChefHat } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";

interface SimpleRecipeCardProps {
  recipe: Recipe;
  onClick?: () => void;
}

export default function SimpleRecipeCard({ recipe, onClick }: SimpleRecipeCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();

  // DRY: Parse JSON once and handle errors gracefully  
  const parseJsonSafely = (jsonString: string): any[] => {
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const ingredients = parseJsonSafely(recipe.ingredients);
  const directions = parseJsonSafely(recipe.directions);

  // KISS: Simple display logic
  const displayIngredients = ingredients.slice(0, 3);
  const hasMoreIngredients = ingredients.length > 3;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500"
      onClick={onClick}
      data-testid={`card-recipe-${recipe.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg font-semibold text-slate-800 line-clamp-2">
            {recipe.title}
          </CardTitle>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(recipe.id);
            }}
            className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
            data-testid={`button-favorite-${recipe.id}`}
          >
            {isFavorite(recipe.id) ? '❤️' : '🤍'}
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          {recipe.category && (
            <Badge variant="outline" className="text-xs">
              <ChefHat className="w-3 h-3 mr-1" />
              {recipe.category}
            </Badge>
          )}
          {recipe.totalTimeMinutes && (
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {recipe.totalTimeMinutes}min
            </Badge>
          )}
          {recipe.servings && (
            <Badge variant="outline" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              {recipe.servings} servings
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Ingredients Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {ingredients.length} ingredients
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {directions.length} steps
            </Badge>
          </div>
          
          {displayIngredients.length > 0 && (
            <div className="text-sm text-slate-600">
              <div className="space-y-1">
                {displayIngredients
                  .filter(ing => ing && ing.trim().length > 0)
                  .map((ingredient, index) => (
                    <div key={`ing-${index}-${ingredient.slice(0, 10)}`} className="flex items-center text-xs">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 flex-shrink-0"></span>
                      <span className="line-clamp-1">{ingredient}</span>
                    </div>
                  ))}
                {hasMoreIngredients && (
                  <div className="text-xs text-slate-500 italic">
                    +{ingredients.length - 3} more ingredients...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Source */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="truncate">{recipe.source}</span>
            {recipe.favoriteCount > 0 && (
              <span className="flex-shrink-0 ml-2">
                ❤️ {recipe.favoriteCount}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}