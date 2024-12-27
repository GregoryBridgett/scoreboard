import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import apiRoutes from "./apiRoutes.mjs";
import GameManager from "./gameManager.mjs";
import ClientManager from "./clientManager.mjs";
import SseManager from "./sseManager.mjs";

const startServer = async (port = 3000) => {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer); // Create a Socket.IO instance

  const gameManager = new GameManager();
  const clientManager = new ClientManager(io);
  const sseManager = new SseManager(gameManager, clientManager);

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
  apiRoutes(app, gameManager, sseManager);

  io.on("connection", (socket) => {
    clientManager.handleConnection(socket);
  });

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