import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { recipeCrawler } from "./crawler";
import { configureCORS, configureSecurityHeaders, applyRateLimiting } from "./middleware/security";
import { requestIdMiddleware } from "./middleware/request-id";
import { logger } from "./utils/logger";

const app = express();

// Security middleware - Apply early in the chain
configureSecurityHeaders(app);
configureCORS(app);
app.use(requestIdMiddleware);
applyRateLimiting(app);

// Body parsing with reasonable limits
app.use(express.json({ limit: '10mb' })); // Reduced from 50mb for security
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Enhanced request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Use enhanced logger
      logger.request(
        req.method,
        path,
        res.statusCode,
        duration,
        {
          requestId: req.id,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        }
      );

      // Log security events
      if (res.statusCode === 401 || res.statusCode === 403) {
        logger.security('Unauthorized access attempt', {
          path,
          method: req.method,
          ip: req.ip,
          requestId: req.id,
        });
      }

      // Legacy log for compatibility
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse && process.env.NODE_ENV === 'development') {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

// Global error handlers with enhanced logging
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', reason, {
    type: 'unhandledRejection',
    promise: String(promise),
  });
  // In production, consider exiting the process for critical errors
  if (process.env.NODE_ENV === 'production') {
    // Log and continue - let the app try to recover
    // For critical production apps, you might want to exit here
  }
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error, {
    type: 'uncaughtException',
  });
  // Uncaught exceptions are more serious - consider graceful shutdown
  // For now, log and continue, but monitor closely
});

(async () => {
  const server = await registerRoutes(app);

  // Enhanced error handling middleware
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error with context
    logger.error('Request error', err, {
      path: req.path,
      method: req.method,
      statusCode: status,
      requestId: req.id,
      ip: req.ip,
    });

    // Don't expose stack traces in production
    const response: any = {
      error: true,
      message: process.env.NODE_ENV === 'production' && status >= 500
        ? 'Internal Server Error'
        : message,
    };

    // Include request ID for tracking
    if (req.id) {
      response.requestId = req.id;
    }

    res.status(status).json(response);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1',

  }, () => {
    log(`serving on port ${port}`);
    logger.info('Server started', {
      port,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    });

    // Start automatic recipe crawling after server is ready
    setTimeout(() => {
      logger.info('Initializing automatic recipe crawling...');
      try {
        recipeCrawler.startAutoCrawling();
        logger.info('Recipe crawler started successfully');
      } catch (error) {
        logger.error('Error starting crawler', error);
        // Don't crash the app if crawler fails to start
      }
    }, 5000); // Wait 5 seconds after server start
  });
})();
