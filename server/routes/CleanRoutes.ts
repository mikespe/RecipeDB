/**
 * Clean Routes - Simplified, maintainable route handlers
 * KISS: Keep It Simple, Stupid - focused on core functionality
 */

import { Router, Request, Response } from 'express';
import { CleanRecipeService } from '../services/CleanRecipeService';
import { ErrorHandler } from '../core/ErrorHandler';
import { ApiResponseBuilder } from '../core/ApiResponse';

export function createCleanRoutes(recipeService: CleanRecipeService): Router {
  const router = Router();

  // DRY: Common error handler wrapper
  const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
    return (req: Request, res: Response, next: any) => {
      Promise.resolve(fn(req, res)).catch(error => {
        ErrorHandler.handle(error, res);
      });
    };
  };

  // KISS: Simple, focused route handlers
  
  // Get recipe statistics
  router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
    const stats = await recipeService.getStats();
    res.json(ApiResponseBuilder.success(stats));
  }));

  // Get paginated recipes
  router.get('/paginated', asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const result = await recipeService.getPaginated(page, limit);
    res.json(ApiResponseBuilder.paginated(result.recipes, result.total, page, limit));
  }));

  // Search recipes
  router.get('/search', asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string || '';
    const recipes = await recipeService.search(query);
    res.json(ApiResponseBuilder.success({ recipes }));
  }));

  // Get single recipe
  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const recipe = await recipeService.getById(req.params.id);
    res.json(ApiResponseBuilder.success({ recipe }));
  }));

  // Create recipe via scraping
  router.post('/scrape', asyncHandler(async (req: Request, res: Response) => {
    const { url } = req.body;
    if (!url) {
      throw ErrorHandler.validation('URL is required');
    }
    
    const recipe = await recipeService.scrapeAndCreate(url);
    res.status(201).json(ApiResponseBuilder.success({ recipe }));
  }));

  return router;
}