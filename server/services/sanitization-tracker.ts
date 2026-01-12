/**
 * Sanitization Tracker
 * Ensures sanitization only runs once on startup
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

interface SanitizationRunRecord {
  id: string;
  lastRun: Date;
  recipesChecked: number;
  recipesFixed: number;
}

export class SanitizationTracker {
  private static readonly TABLE_NAME = 'sanitization_runs';

  /**
   * Initialize the sanitization_runs table if it doesn't exist
   */
  static async initializeTable(): Promise<void> {
    try {
      // Try to create the table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS ${sql.identifier(this.TABLE_NAME)} (
          id TEXT PRIMARY KEY,
          last_run DATETIME DEFAULT CURRENT_TIMESTAMP,
          recipes_checked INTEGER DEFAULT 0,
          recipes_fixed INTEGER DEFAULT 0
        )
      `);
      console.log('[SanitizationTracker] Table initialized');
    } catch (error) {
      // Table might already exist, that's fine
      console.log('[SanitizationTracker] Table initialization skipped (may already exist)');
    }
  }

  /**
   * Check if sanitization has already run
   */
  static async hasRun(): Promise<boolean> {
    try {
      await this.initializeTable();
      const result = await db.execute(
        sql`SELECT COUNT(*) as count FROM ${sql.identifier(this.TABLE_NAME)}`
      );
      const rows = (result as unknown) as any[];
      const count = rows?.[0]?.count || 0;
      return count > 0;
    } catch (error) {
      console.log('[SanitizationTracker] Error checking run status:', error);
      return false;
    }
  }

  /**
   * Record that sanitization has run
   */
  static async recordRun(recipesChecked: number, recipesFixed: number): Promise<void> {
    try {
      await this.initializeTable();
      await db.execute(
        sql`INSERT INTO ${sql.identifier(this.TABLE_NAME)} (id, last_run, recipes_checked, recipes_fixed)
            VALUES ('sanitization_run_1', CURRENT_TIMESTAMP, ${recipesChecked}, ${recipesFixed})`
      );
      console.log(`[SanitizationTracker] Recorded sanitization run: ${recipesChecked} checked, ${recipesFixed} fixed`);
    } catch (error) {
      console.log('[SanitizationTracker] Error recording run:', error);
    }
  }

  /**
   * Get the last sanitization run details
   */
  static async getLastRun(): Promise<SanitizationRunRecord | null> {
    try {
      await this.initializeTable();
      const result = await db.execute(
        sql`SELECT id, last_run, recipes_checked, recipes_fixed FROM ${sql.identifier(this.TABLE_NAME)} LIMIT 1`
      );
      const rows = (result as unknown) as any[];
      if (!rows || rows.length === 0) return null;

      const row = rows[0];
      return {
        id: row.id,
        lastRun: new Date(row.last_run),
        recipesChecked: row.recipes_checked,
        recipesFixed: row.recipes_fixed,
      };
    } catch (error) {
      console.log('[SanitizationTracker] Error getting last run:', error);
      return null;
    }
  }
}
