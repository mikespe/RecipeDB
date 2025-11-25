import { Recipe } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, ChefHat, ArrowRight, Heart } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useFavorites } from "@/hooks/useFavorites";

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(recipe.id);

  // Parse tags if they're stored as a string
  const tags = Array.isArray(recipe.tags)
    ? recipe.tags
    : typeof recipe.tags === 'string'
      ? JSON.parse(recipe.tags)
      : [];

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(recipe.id);
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Link href={`/recipe/${recipe.id}`}>
        <Card className="h-full overflow-hidden border-0 bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-300 group rounded-2xl cursor-pointer">
          <div className="relative aspect-[4/3] overflow-hidden">
            {recipe.imageUrl ? (
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <ChefHat className="h-16 w-16 text-slate-300" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Floating badges */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
              {recipe.cuisine && (
                <Badge variant="secondary" className="bg-white/90 backdrop-blur text-slate-800 font-medium shadow-sm">
                  {recipe.cuisine}
                </Badge>
              )}
            </div>

            <div className="absolute top-3 right-3">
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 rounded-full bg-white/90 backdrop-blur shadow-sm hover:bg-white transition-all ${
                  favorite ? 'text-red-500' : 'text-slate-600'
                }`}
                onClick={handleFavoriteClick}
                aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`h-4 w-4 ${favorite ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>

          <CardHeader className="pb-3">
            <h3 className="text-xl font-bold text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {recipe.title}
            </h3>
            {recipe.description && (
              <p className="text-sm text-slate-600 line-clamp-2 mt-2">
                {recipe.description}
              </p>
            )}
          </CardHeader>

          <CardContent className="pb-4">
            <div className="flex items-center gap-4 text-sm text-slate-600">
              {recipe.prepTimeMinutes && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">{recipe.prepTimeMinutes}m</span>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-green-500" />
                  <span className="font-medium">{recipe.servings}</span>
                </div>
              )}
            </div>

            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {tags
                  .filter((tag: string) => tag && tag.trim().length > 0)
                  .slice(0, 3)
                  .map((tag: string, index: number) => (
                    <Badge
                      key={`tag-${index}-${tag}`}
                      variant="outline"
                      className="text-xs bg-slate-50 text-slate-600 border-slate-200"
                    >
                      {tag}
                    </Badge>
                  ))}
              </div>
            )}
          </CardContent>

          <CardFooter className="p-5 pt-0 border-t border-slate-100 mt-auto bg-slate-50/50">
            <div className="w-full flex items-center justify-between mt-4">
              <div className="flex items-center gap-1 text-xs text-slate-400 font-medium uppercase tracking-wider">
                {recipe.source && (recipe.source.startsWith('http://') || recipe.source.startsWith('https://'))
                  ? new URL(recipe.source).hostname.replace('www.', '')
                  : recipe.source || 'Manual'}
              </div>
              <div className="flex items-center text-blue-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                View Recipe <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </div>
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  );
}
