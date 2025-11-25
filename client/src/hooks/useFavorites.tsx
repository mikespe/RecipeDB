import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const FAVORITES_STORAGE_KEY = "recipe-favorites";

interface FavoritesContextType {
  favoriteIds: string[];
  isFavorite: (recipeId: string) => boolean;
  toggleFavorite: (recipeId: string) => void;
  addFavorite: (recipeId: string) => void;
  removeFavorite: (recipeId: string) => void;
  clearFavorites: () => void;
  favoriteCount: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

/**
 * Provider component that manages favorites state globally
 * This ensures all components share the same favorites state
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  // Load favorites from localStorage on mount
  useEffect(() => {
    const loadFavorites = () => {
      try {
        const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (stored) {
          const ids = JSON.parse(stored) as string[];
          setFavoriteIds(new Set(ids));
        }
      } catch (error) {
        console.error("Error loading favorites from localStorage:", error);
      }
    };

    loadFavorites();

    // Listen for storage changes (e.g., from other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FAVORITES_STORAGE_KEY) {
        loadFavorites();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    try {
      const idsArray = Array.from(favoriteIds);
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(idsArray));
    } catch (error) {
      console.error("Error saving favorites to localStorage:", error);
    }
  }, [favoriteIds]);

  const isFavorite = useCallback((recipeId: string): boolean => {
    return favoriteIds.has(recipeId);
  }, [favoriteIds]);

  const toggleFavorite = useCallback((recipeId: string): void => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  }, []);

  const addFavorite = useCallback((recipeId: string): void => {
    setFavoriteIds((prev) => new Set(prev).add(recipeId));
  }, []);

  const removeFavorite = useCallback((recipeId: string): void => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      next.delete(recipeId);
      return next;
    });
  }, []);

  const clearFavorites = useCallback((): void => {
    setFavoriteIds(new Set());
  }, []);

  const value: FavoritesContextType = {
    favoriteIds: Array.from(favoriteIds),
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    clearFavorites,
    favoriteCount: favoriteIds.size,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

/**
 * Custom hook for accessing favorites context
 * Must be used within a FavoritesProvider
 */
export function useFavorites(): FavoritesContextType {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
