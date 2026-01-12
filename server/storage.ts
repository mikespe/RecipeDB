import { recipes, users, crawledUrls, type Recipe, type InsertRecipe, type User, type UpsertUser, type SearchRecipeRequest, type CrawledUrl, type InsertCrawledUrl } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, and, sql, lte, gte } from "drizzle-orm";

export interface IStorage {
  getRecipe(id: string): Promise<Recipe | undefined>;
  getAllRecipes(): Promise<Recipe[]>;
  getRecipesPaginated(page: number, limit: number): Promise<{ recipes: Recipe[], total: number, hasMore: boolean }>;
  getRecipeStats(): Promise<{ total: number, autoScraped: number, userAdded: number }>;
  updateFavoriteCount(id: string, increment: number): Promise<Recipe | undefined>;
  searchRecipes(query: string): Promise<Recipe[]>;
  searchRecipesAdvanced(filters: SearchRecipeRequest): Promise<Recipe[]>;
  getRecipeBySource(sourceUrl: string): Promise<Recipe | undefined>;
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe | undefined>;
  deleteRecipe(id: string): Promise<boolean>;
  // User operations for authentication
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  // Crawled URL tracking
  isUrlCrawled(url: string): Promise<boolean>;
  markUrlCrawled(url: string, domain: string, success: boolean, recipeId?: string, errorMessage?: string): Promise<void>;
  getCrawledUrlStats(): Promise<{ total: number; successful: number; failed: number }>;
}

export class DatabaseStorage implements IStorage {
  async getRecipe(id: string): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe || undefined;
  }

  async getAllRecipes(): Promise<Recipe[]> {
    return await db.select().from(recipes)
      .where(eq(recipes.moderationStatus, 'approved'))
      .orderBy(recipes.title);
  }

  async getRecipesPaginated(page: number = 1, limit: number = 10): Promise<{ recipes: Recipe[], total: number, hasMore: boolean }> {
    // Validate and sanitize pagination parameters - SOLID principle: Input validation
    const safePage = Math.max(1, isNaN(page) ? 1 : Math.floor(page));
    const safeLimit = Math.max(1, Math.min(100, isNaN(limit) ? 10 : Math.floor(limit)));
    const offset = (safePage - 1) * safeLimit;

    // Get total count
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(recipes)
      .where(eq(recipes.moderationStatus, 'approved'));
    const total = countResult.count;

    // Get paginated recipes (most recent first)
    const paginatedRecipes = await db.select().from(recipes)
      .where(eq(recipes.moderationStatus, 'approved'))
      .orderBy(sql`${recipes.scrapedAt} DESC`)
      .limit(safeLimit)
      .offset(offset);

    const hasMore = offset + safeLimit < total;

    return {
      recipes: paginatedRecipes,
      total,
      hasMore
    };
  }

  async getRecipeStats(): Promise<{ total: number, autoScraped: number, userAdded: number }> {
    const [totalResult] = await db.select({ count: sql<number>`count(*)` }).from(recipes);
    const [autoScrapedResult] = await db.select({ count: sql<number>`count(*)` }).from(recipes).where(eq(recipes.isAutoScraped, 1));
    const [userAddedResult] = await db.select({ count: sql<number>`count(*)` }).from(recipes).where(eq(recipes.isAutoScraped, 0));

    return {
      total: Number(totalResult?.count || 0),
      autoScraped: Number(autoScrapedResult?.count || 0),
      userAdded: Number(userAddedResult?.count || 0)
    };
  }

  async updateFavoriteCount(id: string, increment: number): Promise<Recipe | undefined> {
    const [recipe] = await db.update(recipes)
      .set({ favoriteCount: sql`${recipes.favoriteCount} + ${increment}` })
      .where(eq(recipes.id, id))
      .returning();
    return recipe || undefined;
  }

  async searchRecipes(query: string): Promise<Recipe[]> {
    if (!query.trim()) return [];

    // Split query into individual terms and clean them
    const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);

    if (searchTerms.length === 0) return [];

    // Create search conditions for each term (AND logic) with enhanced tag matching
    const searchConditions = searchTerms.map(term => {
      const searchPattern = `%${term}%`;
      const preciseTagPattern = `%"${term}"%`; // Exact tag match with quotes
      return or(
        ilike(recipes.title, searchPattern),
        ilike(recipes.ingredients, searchPattern),
        ilike(recipes.directions, searchPattern),
        // Enhanced tag search: precise JSON tag matching for exact terms
        sql`(${recipes.tags} IS NOT NULL AND ${recipes.tags} ILIKE ${preciseTagPattern})`,
        // Fallback tag search for partial matches (e.g., "chickpea" contains "chick")
        sql`(${recipes.tags} IS NOT NULL AND ${recipes.tags} ILIKE ${searchPattern})`,
        ilike(recipes.category, searchPattern),
        ilike(recipes.cuisine, searchPattern),
        ilike(recipes.source, searchPattern)
      );
    });

    return await db.select().from(recipes)
      .where(and(
        eq(recipes.moderationStatus, 'approved'),
        and(...searchConditions)
      ))
      .orderBy(sql`${recipes.scrapedAt} DESC`);
  }

  async getRecipeBySource(sourceUrl: string): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.source, sourceUrl));
    return recipe || undefined;
  }

  async searchRecipesAdvanced(filters: SearchRecipeRequest): Promise<Recipe[]> {
    const conditions = [eq(recipes.moderationStatus, 'approved')];

    // Enhanced multi-term text search with AND logic
    if (filters.query) {
      const searchTerms = filters.query.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);

      if (searchTerms.length > 0) {
        const searchConditions = searchTerms.map(term => {
          const searchPattern = `%${term}%`;
          const preciseTagPattern = `%"${term}"%`; // Exact tag match with quotes
          return or(
            ilike(recipes.title, searchPattern),
            ilike(recipes.ingredients, searchPattern),
            ilike(recipes.directions, searchPattern),
            // Enhanced tag search: precise JSON tag matching for exact terms
            sql`(${recipes.tags} IS NOT NULL AND ${recipes.tags} ILIKE ${preciseTagPattern})`,
            // Fallback tag search for partial matches
            sql`(${recipes.tags} IS NOT NULL AND ${recipes.tags} ILIKE ${searchPattern})`,
            ilike(recipes.category, searchPattern),
            ilike(recipes.cuisine, searchPattern),
            ilike(recipes.source, searchPattern)
          );
        });

        const finalCondition = and(...searchConditions);
        if (finalCondition) {
          conditions.push(finalCondition);
        }
      }
    }

    // Category filter
    if (filters.category) {
      conditions.push(eq(recipes.category, filters.category));
    }

    // Cuisine filter
    if (filters.cuisine) {
      conditions.push(eq(recipes.cuisine, filters.cuisine));
    }

    // Difficulty filter
    if (filters.difficulty) {
      conditions.push(eq(recipes.difficulty, filters.difficulty));
    }

    // Time filters
    if (filters.maxPrepTime) {
      conditions.push(lte(recipes.prepTimeMinutes, filters.maxPrepTime));
    }

    if (filters.maxCookTime) {
      conditions.push(lte(recipes.cookTimeMinutes, filters.maxCookTime));
    }

    if (filters.maxTotalTime) {
      conditions.push(lte(recipes.totalTimeMinutes, filters.maxTotalTime));
    }

    // Serving size filters
    if (filters.minServings) {
      conditions.push(gte(recipes.servings, filters.minServings));
    }

    if (filters.maxServings) {
      conditions.push(lte(recipes.servings, filters.maxServings));
    }

    // Dietary restrictions filter
    if (filters.dietaryRestrictions && filters.dietaryRestrictions.length > 0) {
      const dietaryConditions = filters.dietaryRestrictions.map(restriction =>
        ilike(recipes.dietaryRestrictions, `%"${restriction}"%`)
      );
      conditions.push(or(...dietaryConditions)!);
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map(tag =>
        ilike(recipes.tags, `%"${tag}"%`)
      );
      conditions.push(or(...tagConditions)!);
    }

    return await db.select().from(recipes)
      .where(and(...conditions))
      .orderBy(recipes.title);
  }

  async createRecipe(insertRecipe: InsertRecipe): Promise<Recipe> {
    const recipeData = {
      ...insertRecipe
    };

    const [recipe] = await db
      .insert(recipes)
      .values(recipeData)
      .returning();
    return recipe;
  }

  async updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe | undefined> {
    const [recipe] = await db
      .update(recipes)
      .set(updates)
      .where(eq(recipes.id, id))
      .returning();
    return recipe || undefined;
  }

  async deleteRecipe(id: string): Promise<boolean> {
    const result = await db.delete(recipes).where(eq(recipes.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // User operations for authentication
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Crawled URL tracking methods
  async isUrlCrawled(url: string): Promise<boolean> {
    try {
      const [existing] = await db
        .select({ id: crawledUrls.id })
        .from(crawledUrls)
        .where(eq(crawledUrls.url, url))
        .limit(1);
      return !!existing;
    } catch (error) {
      // Table might not exist yet, return false
      return false;
    }
  }

  async markUrlCrawled(
    url: string,
    domain: string,
    success: boolean,
    recipeId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await db
        .insert(crawledUrls)
        .values({
          url,
          domain,
          success: success ? 1 : 0,
          recipeId,
          errorMessage,
        })
        .onConflictDoUpdate({
          target: crawledUrls.url,
          set: {
            success: success ? 1 : 0,
            recipeId,
            errorMessage,
            crawledAt: new Date(),
          },
        });
    } catch (error) {
      // Log but don't fail if table doesn't exist
      console.error('Error marking URL as crawled:', error);
    }
  }

  async getCrawledUrlStats(): Promise<{ total: number; successful: number; failed: number }> {
    try {
      const [stats] = await db
        .select({
          total: sql<number>`COUNT(*)`,
          successful: sql<number>`SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END)`,
          failed: sql<number>`SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END)`,
        })
        .from(crawledUrls);
      return {
        total: Number(stats?.total || 0),
        successful: Number(stats?.successful || 0),
        failed: Number(stats?.failed || 0),
      };
    } catch (error) {
      return { total: 0, successful: 0, failed: 0 };
    }
  }
}

export const storage = new DatabaseStorage();
