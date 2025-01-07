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

const startServer = async () => {
  // Parse command line arguments for port and host
  let port = process.env.PORT || 3000;
  let host = process.env.HOST || '0.0.0.0';

  process.argv.forEach((arg, index) => {
    if (arg === '--port' && process.argv[index + 1]) {
      port = parseInt(process.argv[index + 1], 10);
    } else if (arg === '--host' && process.argv[index + 1]) {
      host = process.argv[index + 1];
    }
  });

  logger.info({ module: 'server', function: 'startServer' }, `Using port: ${port}, host: ${host}`);

  // Create Express app and HTTP server
  const app = express();
  const httpServer = createServer(app); 

  // Configure Pino logger

  // Initialize gameManager and connectionManager after logger is configured
  const gameManager = new GameManager(logger);
  const connectionManager = new ConnectionManager(gameManager, logger);

  logger.info({ module: 'server', function: 'startServer' }, 'Server starting...');

  // Serve static files from the 'ui' and 'overlay' directories
  const rootDir = path.resolve();
  app.use('/ui', express.static(path.join(rootDir, 'ui')));
  app.use('/overlay', express.static(path.join(rootDir, 'overlay')));
  // Serve static files from the root directory
  app.use('/', express.static(rootDir)); 
  logger.info({ module: 'server', function: 'startServer' }, `Serving static files from root, ui and overlay directories`);  

  // Serve index.html for the root path
  app.get('/', (req, res) => {    
    res.sendFile(path.join(rootDir, 'index.html'));
  });

  // Use API routes
  apiRoutes(app, gameManager, connectionManager);

  httpServer.listen(port, host, () => {
    logger.info({ module: 'server', function: 'startServer' }, `Server listening on ${host}:${port}...`);
  }); 

  return httpServer; 
}

export { startServer };
startServer(); 