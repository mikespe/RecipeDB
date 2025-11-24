/**
 * Response handling utilities - follows DRY principle
 */
import type { Response } from "express";

export class ResponseHandler {
  /**
   * Send error response with consistent format
   */
  static sendError(res: Response, status: number, message: string, details?: any): void {
    console.error(`Error ${status}: ${message}`, details ? JSON.stringify(details) : '');
    res.status(status).json({ 
      error: true,
      message,
      ...(details && { details })
    });
  }

  /**
   * Send success response with consistent format
   */
  static sendSuccess(res: Response, data: any, message?: string): void {
    res.status(200).json({
      success: true,
      ...(message && { message }),
      ...data
    });
  }

  /**
   * Send duplicate recipe response
   */
  static sendDuplicateRecipe(res: Response, existingRecipe: any): void {
    res.status(200).json({ 
      message: "Recipe from this URL already exists",
      existingRecipe,
      note: "Different URL formats for the same content are considered duplicates"
    });
  }

  /**
   * Handle async route errors consistently
   */
  static asyncHandler(fn: Function) {
    return (req: any, res: any, next: any) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}