/**
 * Centralized Error Handler - SOLID Single Responsibility
 * Consistent error handling across the application
 */

import { Response } from 'express';
import { ApiResponseBuilder } from './ApiResponse';

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  SCRAPING = 'SCRAPING',
  DATABASE = 'DATABASE',
  EXTERNAL_API = 'EXTERNAL_API',
  INTERNAL = 'INTERNAL'
}

export class AppError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ErrorHandler {
  static handle(error: Error, res: Response): void {
    console.error('Error occurred:', error);
    
    if (error instanceof AppError) {
      this.handleAppError(error, res);
    } else {
      this.handleGenericError(error, res);
    }
  }
  
  static handleAsync(fn: Function) {
    return (req: any, res: any, next: any) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
  
  private static handleAppError(error: AppError, res: Response): void {
    const statusCode = error.statusCode || 500;
    const response = ApiResponseBuilder.error(error.message);
    
    res.status(statusCode).json(response);
  }
  
  private static handleGenericError(error: Error, res: Response): void {
    const statusCode = 500;
    const message = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message;
    
    const response = ApiResponseBuilder.error(message);
    res.status(statusCode).json(response);
  }
  
  // Factory methods for common errors
  static notFound(message: string = 'Resource not found'): AppError {
    return new AppError(message, ErrorType.NOT_FOUND, 404);
  }
  
  static validation(message: string): AppError {
    return new AppError(message, ErrorType.VALIDATION, 400);
  }
  
  static unauthorized(message: string = 'Unauthorized'): AppError {
    return new AppError(message, ErrorType.UNAUTHORIZED, 401);
  }
  
  static forbidden(message: string = 'Forbidden'): AppError {
    return new AppError(message, ErrorType.FORBIDDEN, 403);
  }
  
  static scraping(message: string): AppError {
    return new AppError(message, ErrorType.SCRAPING, 503);
  }
  
  static database(message: string): AppError {
    return new AppError(message, ErrorType.DATABASE, 500);
  }
  
  static externalApi(message: string): AppError {
    return new AppError(message, ErrorType.EXTERNAL_API, 502);
  }
}