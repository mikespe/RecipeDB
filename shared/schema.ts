import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const recipes = pgTable("recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  ingredients: text("ingredients").notNull(), // JSON string
  directions: text("directions").notNull(), // JSON string  
  source: text("source").notNull(), // URL string
  imageUrl: text("image_url"), // Recipe photo URL
  isAutoScraped: integer("is_auto_scraped").notNull().default(0), // 0 = user-added, 1 = auto-scraped
  moderationStatus: text("moderation_status").notNull().default("approved"), // approved, pending, rejected

  // Enhanced tagging system
  category: text("category"), // Main course, appetizer, dessert, etc.
  cuisine: text("cuisine"), // Italian, Chinese, Mexican, etc.
  dietaryRestrictions: text("dietary_restrictions"), // JSON array: vegetarian, vegan, gluten-free, etc.
  difficulty: text("difficulty"), // easy, medium, hard
  prepTimeMinutes: integer("prep_time_minutes"),
  cookTimeMinutes: integer("cook_time_minutes"),
  totalTimeMinutes: integer("total_time_minutes"),
  servings: integer("servings"),
  tags: text("tags"), // JSON array of custom tags
  favoriteCount: integer("favorite_count").notNull().default(0), // Track global favorites

  scrapedAt: text("scraped_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
});

export const scrapeRecipeSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

// Schema for captcha validation
export const captchaSchema = z.object({
  answer: z.number().min(0, "Please solve the math problem"),
  challenge: z.string().min(1, "Captcha challenge is required"),
});

// Enhanced search schema
export const searchRecipeSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  cuisine: z.string().optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  difficulty: z.string().optional(),
  maxPrepTime: z.number().optional(),
  maxCookTime: z.number().optional(),
  maxTotalTime: z.number().optional(),
  maxServings: z.number().optional(),
  minServings: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

// Schema for manual recipe with captcha and enhanced fields
export const manualRecipeWithCaptchaSchema = insertRecipeSchema.extend({
  captchaAnswer: z.number().min(0, "Please solve the math problem"),
  captchaChallenge: z.string().min(1, "Captcha challenge is required"),

  // Enhanced tagging fields
  category: z.string().optional(),
  cuisine: z.string().optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  difficulty: z.string().optional(),
  prepTimeMinutes: z.number().min(0).optional(),
  cookTimeMinutes: z.number().min(0).optional(),
  servings: z.number().min(1).optional(),
  tags: z.array(z.string()).optional(),
}).omit({
  moderationStatus: true, // Will be set server-side
  scrapedAt: true,
  totalTimeMinutes: true, // Will be calculated
});

// Recipe categories
export const RECIPE_CATEGORIES = [
  'appetizer', 'main-course', 'side-dish', 'dessert', 'beverage',
  'breakfast', 'lunch', 'dinner', 'snack', 'soup', 'salad', 'bread'
] as const;

// Cuisine types
export const CUISINE_TYPES = [
  'american', 'italian', 'mexican', 'chinese', 'japanese', 'indian',
  'french', 'thai', 'greek', 'mediterranean', 'korean', 'vietnamese',
  'spanish', 'middle-eastern', 'african', 'caribbean', 'british',
  'german', 'russian', 'brazilian', 'fusion', 'other'
] as const;

// Dietary restrictions
export const DIETARY_RESTRICTIONS = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free',
  'egg-free', 'soy-free', 'keto', 'paleo', 'low-carb', 'low-fat',
  'low-sodium', 'sugar-free', 'halal', 'kosher'
] as const;

// Difficulty levels
export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;

export type RecipeCategory = typeof RECIPE_CATEGORIES[number];
export type CuisineType = typeof CUISINE_TYPES[number];
export type DietaryRestriction = typeof DIETARY_RESTRICTIONS[number];
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];
export type SearchRecipeRequest = z.infer<typeof searchRecipeSchema>;

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Crawled URLs tracking table - persists across server restarts
export const crawledUrls = pgTable("crawled_urls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull().unique(),
  domain: text("domain").notNull(), // e.g., 'allrecipes.com'
  success: integer("success").notNull().default(0), // 0 = failed, 1 = success
  recipeId: varchar("recipe_id"), // Link to recipe if successful
  crawledAt: timestamp("crawled_at").defaultNow(),
  errorMessage: text("error_message"), // Store error for debugging
}, (table) => [
  index("idx_crawled_url").on(table.url),
  index("idx_crawled_domain").on(table.domain),
  index("idx_crawled_at").on(table.crawledAt),
]);

export type CrawledUrl = typeof crawledUrls.$inferSelect;
export type InsertCrawledUrl = typeof crawledUrls.$inferInsert;

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;
export type ScrapeRecipeRequest = z.infer<typeof scrapeRecipeSchema>;

export interface PaginatedRecipesResponse {
  recipes: Recipe[];
  total: number;
  hasMore: boolean;
}
