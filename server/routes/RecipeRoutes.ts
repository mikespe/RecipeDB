/**
 * Recipe Routes - Clean Architecture
 * Simplified, focused route handlers using dependency injection
 */

import { Router, Request, Response } from 'express';
import { RecipeService } from '../services/RecipeServiceRefactored';
import { ErrorHandler } from '../core/ErrorHandler';
import { ApiResponseBuilder } from '../core/ApiResponse';

export class RecipeRoutes {
  private router = Router();
  
  constructor(private recipeService: RecipeService) {
    this.setupRoutes();
  }
  
  private setupRoutes() {
    // Get recipe statistics
    this.router.get('/stats', ErrorHandler.handleAsync(
      async (req: Request, res: Response) => {
        const stats = await this.recipeService.getStats();
        res.json(ApiResponseBuilder.success(stats));
      }
    ));
    
    // Get paginated recipes
    this.router.get('/paginated', ErrorHandler.handleAsync(
      async (req: Request, res: Response) => {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        
        const result = await this.recipeService.getPaginated(page, limit);
        const response = ApiResponseBuilder.paginated(
          result.recipes, 
          result.total, 
          page, 
          limit
        );
        
        res.json(response);
      }
    ));
    
    // Search recipes
    this.router.get('/search', ErrorHandler.handleAsync(
      async (req: Request, res: Response) => {
        const query = req.query.q as string || '';
        const recipes = await this.recipeService.search(query);
        res.json(ApiResponseBuilder.success({ recipes }));
      }
    ));
    
    // Get single recipe
    this.router.get('/:id', ErrorHandler.handleAsync(
      async (req: Request, res: Response) => {
        const recipe = await this.recipeService.getById(req.params.id);
        res.json(ApiResponseBuilder.success({ recipe }));
      }
    ));
    
    // Scrape and create recipe
    this.router.post('/scrape', ErrorHandler.handleAsync(
      async (req: Request, res: Response) => {
        const { url } = req.body;
        if (!url) {
          throw ErrorHandler.validation('URL is required');
        }
        
        const recipe = await this.recipeService.scrapeAndCreate(url);
        res.status(201).json(ApiResponseBuilder.success({ recipe }));
      }
    ));
  }
  
  getRouter(): Router {
    return this.router;
  }
}

// Helper function for legacy compatibility
export function createRecipeRoutes(recipeService: RecipeService): Router {
  return new RecipeRoutes(recipeService).getRouter();
}