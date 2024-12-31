import express from "express";
import { createServer } from "http";
import apiRoutes from "./apiRoutes.mjs";
import GameManager from "./gameManager.mjs";
import ConnectionManager from "./connectionManager.mjs";
import pino from 'pino';

const startServer = async (port = 3000) => {
  const app = express();
  const httpServer = createServer(app); 

  // Configure Pino logger
  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level (label) {
        return { level: label }
      }
    }
  });

  // Initialize gameManager and connectionManager after logger is configured
  const gameManager = new GameManager(logger);
  const connectionManager = new ConnectionManager(gameManager, logger);

  logger.info({ module: 'server', function: 'startServer' }, 'Starting server');

  // Serve static files from the 'public' directory
  app.use(express.static("public"));

  // Use API routes
  apiRoutes(app, gameManager, connectionManager);

  httpServer.listen(port, () => {
    logger.info({ module: 'server', function: 'startServer' }, `Server listening on port ${port}`);
  });

  return httpServer; 
}

export default startServer;
startServer(3000); 