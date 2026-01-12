/**
 * Database cleanup script to sanitize existing recipes with HTML markup
 * Run with: npm run db:sanitize
 *
 * For production: DATABASE_URL=your_production_url npm run db:sanitize
 */

import * as dotenv from 'dotenv';
// Load .env file before any other imports
dotenv.config();

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

// HTML Sanitization (same as html-sanitizer.ts)
function stripHtml(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // Remove script and style tags and their content
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove all HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&deg;': '°',
    '&frac14;': '¼',
    '&frac12;': '½',
    '&frac34;': '¾',
  };

  for (const [entity, char] of Object.entries(entities)) {
    cleaned = cleaned.split(entity).join(char);
  }

  // Replace numeric entities
  cleaned = cleaned.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)));
  cleaned = cleaned.replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Clean up excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

function hasHtmlTags(text: string): boolean {
  if (!text) return false;
  return /<[^>]+>/g.test(text);
}

async function sanitizeRecipes() {
  // Check for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set.');
    console.error('');
    console.error('For local database:');
    console.error('  Make sure .env file exists with DATABASE_URL=postgresql://localhost:5432/recipe_db');
    console.error('');
    console.error('For production database:');
    console.error('  DATABASE_URL=your_production_url npm run db:sanitize');
    process.exit(1);
  }

  console.log('Connecting to database...');
  console.log(`Database: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log('');

  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('railway') || process.env.DATABASE_URL.includes('neon')
      ? { rejectUnauthorized: false }
      : false,
  });

  const db = drizzle({ client: pool, schema });

  console.log('Starting recipe sanitization...\n');

  // Get all recipes
  const allRecipes = await db.select().from(schema.recipes);
  console.log(`Found ${allRecipes.length} recipes to check\n`);

  let sanitizedCount = 0;
  let errorCount = 0;

  for (const recipe of allRecipes) {
    try {
      let needsUpdate = false;
      let updatedDirections: string[] = [];
      let updatedIngredients: string[] = [];

      // Parse and check directions
      if (recipe.directions) {
        try {
          const directions = JSON.parse(recipe.directions);
          if (Array.isArray(directions)) {
            const hasHtml = directions.some(d => hasHtmlTags(d));
            if (hasHtml) {
              updatedDirections = directions.map(d => stripHtml(d)).filter(Boolean);
              needsUpdate = true;
              console.log(`[HTML FOUND] Recipe: "${recipe.title}" - Directions contain HTML`);
            }
          }
        } catch (e) {
          // Not JSON, check as string
          if (hasHtmlTags(recipe.directions)) {
            const cleaned = stripHtml(recipe.directions);
            updatedDirections = [cleaned];
            needsUpdate = true;
            console.log(`[HTML FOUND] Recipe: "${recipe.title}" - Directions string contains HTML`);
          }
        }
      }

      // Parse and check ingredients
      if (recipe.ingredients) {
        try {
          const ingredients = JSON.parse(recipe.ingredients);
          if (Array.isArray(ingredients)) {
            const hasHtml = ingredients.some(i => hasHtmlTags(i));
            if (hasHtml) {
              updatedIngredients = ingredients.map(i => stripHtml(i)).filter(Boolean);
              needsUpdate = true;
              console.log(`[HTML FOUND] Recipe: "${recipe.title}" - Ingredients contain HTML`);
            }
          }
        } catch (e) {
          // Not JSON, check as string
          if (hasHtmlTags(recipe.ingredients)) {
            const cleaned = stripHtml(recipe.ingredients);
            updatedIngredients = [cleaned];
            needsUpdate = true;
            console.log(`[HTML FOUND] Recipe: "${recipe.title}" - Ingredients string contains HTML`);
          }
        }
      }

      // Update recipe if needed
      if (needsUpdate) {
        const updateData: any = {};

        if (updatedDirections.length > 0) {
          updateData.directions = JSON.stringify(updatedDirections);
        }

        if (updatedIngredients.length > 0) {
          updateData.ingredients = JSON.stringify(updatedIngredients);
        }

        await db.update(schema.recipes)
          .set(updateData)
          .where(eq(schema.recipes.id, recipe.id));

        sanitizedCount++;
        console.log(`  ✓ Sanitized: "${recipe.title}"\n`);
      }

    } catch (error) {
      errorCount++;
      console.error(`  ✗ Error processing recipe "${recipe.title}":`, error);
    }
  }

  console.log('\n========================================');
  console.log('Sanitization Complete!');
  console.log('========================================');
  console.log(`Total recipes checked: ${allRecipes.length}`);
  console.log(`Recipes sanitized: ${sanitizedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('========================================\n');

  await pool.end();
  process.exit(0);
}

// Run the sanitization
sanitizeRecipes().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
