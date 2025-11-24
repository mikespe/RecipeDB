import { useState, useEffect, useCallback } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface UseFavoritesReturn {
  favorites: Set<string>;
  toggleFavorite: (recipeId: string) => Promise<void>;
  isFavorite: (recipeId: string) => boolean;
  favoriteCount: number;
}

const FAVORITES_STORAGE_KEY = 'recipe-favorites';

export function useFavorites(): UseFavoritesReturn {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const favArray = JSON.parse(stored);
        setFavorites(new Set(favArray));
      }
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error);
    }
  }, []);

  // Save favorites to localStorage whenever favorites change
  const saveFavorites = useCallback((newFavorites: Set<string>) => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(newFavorites)));
    } catch (error) {
      console.error('Error saving favorites to localStorage:', error);
    }
  }, []);

  const toggleFavorite = useCallback(async (recipeId: string) => {
    const isFavorited = favorites.has(recipeId);
    const increment = isFavorited ? -1 : 1;

    try {
      // Update server favorite count
      const response = await fetch(`/api/recipes/${recipeId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update favorite');
      }

      // Update local state
      const newFavorites = new Set(favorites);
      if (isFavorited) {
        newFavorites.delete(recipeId);
      } else {
        newFavorites.add(recipeId);
      }
      
      setFavorites(newFavorites);
      saveFavorites(newFavorites);

      // Invalidate recipe queries to refresh favorite counts
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });

      toast({
        title: isFavorited ? "Removed from favorites" : "Added to favorites",
        description: isFavorited ? "Recipe removed from your favorites" : "Recipe added to your favorites",
      });

    } catch (error) {
      console.error('Error updating favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite. Please try again.",
        variant: "destructive",
      });
    }
  }, [favorites, saveFavorites, toast]);

  const isFavorite = useCallback((recipeId: string) => {
    return favorites.has(recipeId);
  }, [favorites]);

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    favoriteCount: favorites.size,
  };
}