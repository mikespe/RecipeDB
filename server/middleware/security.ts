/**
 * Security Middleware
 * Centralized security configuration following SOLID principles
 */

import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Express } from 'express';

/**
 * Configure CORS
 * Only allow requests from trusted origins
 */
export function configureCORS(app: Express) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : process.env.NODE_ENV === 'production'
    ? [] // Must be set in production
    : ['http://localhost:3001', 'http://localhost:5000', 'http://localhost:5001', 'http://127.0.0.1:3001', 'http://127.0.0.1:5000', 'http://127.0.0.1:5001', 'http://[::1]:3001', 'http://[::1]:5000', 'http://[::1]:5001'];

  app.use((req, res, next) => {
    // Skip CORS for static assets, HTML files, and Vite dev server paths
    // These are served from the same origin and don't need CORS checks
    if (req.path === '/' ||
        req.path.startsWith('/assets/') ||
        req.path.startsWith('/src/') ||
        req.path.startsWith('/@vite/') ||
        req.path.startsWith('/@react-refresh') ||
        req.path.startsWith('/@fs/') ||
        req.path.startsWith('/node_modules/') ||
        req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|html|map|mjs)$/)) {
      return next();
    }

    // Apply CORS to API and other routes
    cors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (mobile apps, Postman, etc.) in development
        if (!origin && process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }

        // Allow same-origin requests (no origin header means same origin)
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-Request-ID'],
    })(req, res, next);
  });
}

/**
 * Configure Security Headers with Helmet
 */
export function configureSecurityHeaders(app: Express) {
  const isDev = process.env.NODE_ENV === 'development';

  app.use(helmet({
    // Disable CSP in development for Vite HMR compatibility
    contentSecurityPolicy: isDev ? false : {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        connectSrc: ["'self'", 'https://*.googleapis.com', 'https://*.google.com'],
        fontSrc: ["'self'", 'data:'],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for Vite compatibility
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow recipe images
  }));
}

/**
 * General API Rate Limiter
 * Prevents abuse of all endpoints
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
});

/**
 * Strict Rate Limiter for Expensive Operations
 * For screenshot extraction, scraping, etc.
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 expensive requests per hour
  message: 'Too many resource-intensive requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Apply rate limiting to routes
 */
export function applyRateLimiting(app: Express) {
  // Apply general limiter to all API routes
  app.use('/api/', generalLimiter);

  // Apply strict limiter to expensive operations
  app.use('/api/recipes/screenshot', strictLimiter);
  app.use('/api/recipes/scrape', strictLimiter);
}

