import express from "express";
import { createServer } from "http";
import apiRoutes from "./apiRoutes.mjs";
import GameManager from "./gameManager.mjs";
import ConnectionManager from "./connectionManager.mjs";
import pino from 'pino';
import path from 'path';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level (label) {
      return { level: label }
    }
  }
});

export { logger };

const startServer = async (port = 3000) => {
  const app = express();
  const httpServer = createServer(app); 

  // Configure Pino logger

  // Initialize gameManager and connectionManager after logger is configured
  const gameManager = new GameManager(logger);
  const connectionManager = new ConnectionManager(gameManager, logger);

  logger.info({ module: 'server', function: 'startServer' }, 'Server starting...');

  // Serve static files from the 'ui' and 'overlay' directories
  const __dirname = path.resolve(); // Get current directory
  logger.info({ module: 'server', function: 'startServer' }, `Resolved path: ${__dirname}`);
  app.use(express.static(path.join(__dirname, '../ui')));
  app.use(express.static(path.join(__dirname, '../overlay')));

  // Use API routes
  apiRoutes(app, gameManager, connectionManager);

  httpServer.listen(port, () => {
    logger.info({ module: 'server', function: 'startServer' }, `Server listening on port ${port}...`);
  });

  return httpServer; 
}

export { startServer };
startServer(3000); 