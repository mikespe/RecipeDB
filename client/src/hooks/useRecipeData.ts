/**
 * Custom Hook for Recipe Data Management - DRY principle
 * Centralized data fetching and state management for recipes
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Recipe } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export interface PaginatedRecipesResponse {
  recipes: Recipe[];
  total: number;
  hasMore: boolean;
}

export interface RecipeStats {
  total: string;
  autoScraped: string;
  userAdded: number;
}

export function useRecipeData() {
  const queryClient = useQueryClient();

  // DRY: Centralized API response handling
  const handleApiResponse = (response: any) => {
    // Handle nested response structure consistently
    return response.recipes || response;
  };

  // KISS: Simple, focused hooks
  const useRecipeStats = () => {
    return useQuery<RecipeStats>({
      queryKey: ['/api/recipes/stats'],
      queryFn: async () => {
        const response = await fetch('/api/recipes/stats');
        if (!response.ok) throw new Error('Failed to fetch recipe stats');
        return response.json();
      },
    });
  };

  const usePaginatedRecipes = (page: number = 1, limit: number = 10, enabled: boolean = true) => {
    return useQuery<PaginatedRecipesResponse>({
      queryKey: ['/api/recipes/paginated', { page, limit }],
      queryFn: async () => {
        const response = await fetch(`/api/recipes/paginated?page=${page}&limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch recipes');
        const result = await response.json();
        return handleApiResponse(result);
      },
      enabled,
    });
  };

  const useSearchRecipes = (query: string) => {
    return useQuery<Recipe[]>({
      queryKey: ['/api/recipes/search', { q: query }],
      queryFn: async () => {
        const response = await fetch(`/api/recipes/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to search recipes');
        const result = await response.json();
        return handleApiResponse(result);
      },
      enabled: !!query.trim(),
    });
  };

  const useRecipe = (id: string) => {
    return useQuery<Recipe>({
      queryKey: ['/api/recipes', id],
      queryFn: async () => {
        const response = await fetch(`/api/recipes/${id}`);
        if (!response.ok) throw new Error('Failed to fetch recipe');
        const result = await response.json();
        // Handle nested response: {success: true, recipe: {...}}
        return result.recipe || result;
      },
      enabled: !!id,
    });
  };

  const useCreateRecipe = () => {
    return useMutation({
      mutationFn: async (url: string) => {
        return await apiRequest('POST', '/api/recipes/scrape', { url });
      },
      onSuccess: () => {
        // Invalidate all recipe-related queries
        queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      },
    });
  };

  return {
    useRecipeStats,
    usePaginatedRecipes,
    useSearchRecipes,
    useRecipe,
    useCreateRecipe,
    handleApiResponse
  };
}