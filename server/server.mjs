import express from "express";
import { createServer } from "http";
import apiRoutes from "./apiRoutes.mjs";
import GameManager from "./gameManager.mjs";
import ConnectionManager from "./connectionManager.mjs";

const startServer = async (port = 3000) => {
  const app = express();
  const httpServer = createServer(app); 
  const connectionManager = new ConnectionManager(gameManager);
  const gameManager = new GameManager(connectionManager)

  // Read LOG_LEVEL environment variable
  // If logLevel is undefined, default to "info"
  const logLevel = process.env.LOG_LEVEL || "info";

  switch (logLevel) {
    case "debug":
      console.debug("Starting server in debug mode");
      break;
    case "error":
      console.error("Starting server in error mode");
      break;
    default:
      console.info("Starting server in info mode");
      break;
  } 

  // Serve static files from the 'public' directory
  app.use(express.static("public"));

  // Use API routes
  apiRoutes(app, gameManager, connectionManager);

  httpServer.listen(port, () => {
    if (logLevel === 'debug') {
      console.debug(`Server listening on port ${port}`);
    }
    console.log(`Server started successfully on port ${port}`);
  });

  return httpServer; 
}

export default startServer;
startServer(3000); 