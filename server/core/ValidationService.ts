/**
 * Validation Service - SOLID Single Responsibility
 * Centralized validation logic
 */

import { BaseService } from './BaseService';

export interface ValidationRule<T> {
  field: keyof T;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
}

export class ValidationService extends BaseService {
  constructor() {
    super('ValidationService');
  }
  
  validate<T>(obj: T, rules: ValidationRule<T>[]): ValidationResult {
    const errors: string[] = [];
    
    for (const rule of rules) {
      const value = obj[rule.field];
      const fieldName = String(rule.field);
      
      // Required field check
      if (rule.required && (value === null || value === undefined || value === '')) {
        errors.push(`${fieldName} is required`);
        continue;
      }
      
      // Skip further validation if field is empty and not required
      if (!value && !rule.required) continue;
      
      // Type validation
      if (rule.type) {
        if (!this.validateType(value, rule.type)) {
          errors.push(`${fieldName} must be of type ${rule.type}`);
          continue;
        }
      }
      
      // String validations
      if (rule.type === 'string' && typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${fieldName} must be at least ${rule.minLength} characters`);
        }
        
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${fieldName} must be at most ${rule.maxLength} characters`);
        }
        
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${fieldName} format is invalid`);
        }
      }
      
      // Custom validation
      if (rule.custom && !rule.custom(value)) {
        errors.push(`${fieldName} failed custom validation`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
  
  validateRecipeData(recipe: any): ValidationResult {
    const rules: ValidationRule<any>[] = [
      { field: 'title', required: true, type: 'string', minLength: 1, maxLength: 500 },
      { field: 'ingredients', required: true, type: 'string', custom: this.isValidJsonArray },
      { field: 'directions', required: true, type: 'string', custom: this.isValidJsonArray },
      { field: 'source', required: true, type: 'string', minLength: 1 }
    ];
    
    return this.validate(recipe, rules);
  }
  
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number' && !isNaN(value);
      case 'boolean': return typeof value === 'boolean';
      case 'array': return Array.isArray(value);
      case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
      default: return true;
    }
  }
  
  private isValidJsonArray(value: any): boolean {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}