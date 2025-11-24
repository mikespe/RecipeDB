/**
 * Standardized API Response Types - SOLID principle
 * Single Responsibility: Handle API response formatting
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: boolean;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  recipes: T[];
  total: number;
  hasMore: boolean;
}

export class ApiResponseBuilder {
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    };
  }
  
  static error(message: string, statusCode?: number): ApiResponse {
    return {
      success: false,
      error: true,
      message,
      timestamp: new Date().toISOString()
    };
  }
  
  static paginated<T>(
    recipes: T[], 
    total: number, 
    page: number, 
    limit: number
  ): ApiResponse<PaginatedResponse<T>> {
    const hasMore = (page * limit) < total;
    
    return this.success({
      recipes,
      total,
      hasMore
    });
  }
}