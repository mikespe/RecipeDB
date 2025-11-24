/**
 * Base Service Class - DRY principle
 * Common functionality for all services
 */

export abstract class BaseService {
  protected readonly serviceName: string;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }
  
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.serviceName}] ${message}`;
    
    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }
  
  protected validateRequired<T>(obj: T, fields: (keyof T)[]): void {
    for (const field of fields) {
      if (!obj[field]) {
        throw new Error(`Required field ${String(field)} is missing`);
      }
    }
  }
  
  protected async withErrorHandling<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.log(`${errorMessage}: ${error.message}`, 'error');
      throw error;
    }
  }
}