import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import apiRoutes from "./apiRoutes.mjs";
import GameManager from "./gameManager.mjs";
import { configureRoutes } from "./apiRoutes.mjs";
import ClientManager from "./clientManager.mjs";
import SseManager from "./sseManager.mjs";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Adjust this to your specific needs for security
        methods: ["GET", "POST"],
    },
});

const PORT = process.env.PORT || 3000;

// Initialize managers
const gameManager = new GameManager();
const clientManager = new ClientManager(io); // Pass io to ClientManager
// Initialize SSE Manager, passing dependencies
const sseManager = new SseManager(io, gameManager, clientManager);


// Serve static files from the 'public' directory
app.use(express.static("public"));

// Use API routes
app.use("/api", apiRoutes(gameManager, sseManager)); // Pass gameManager and sseManager to API routes

// Configure API routes
configureRoutes(app, gameManager, clientManager, sseManager); 

// Route all socket.io events through the SSE manager
io.on("connection", sseManager.handleConnection.bind(sseManager));

httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});