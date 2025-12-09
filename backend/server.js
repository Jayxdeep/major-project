import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";
import { Server } from "socket.io";
import http from "http";

const PORT = process.env.PORT || 3000;

// Create HTTP server wrapper
const server = http.createServer(app);

// Create Socket.IO server
export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  // Reduce reconnection spam in development
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Track active connections
let activeConnections = new Set();

const startServer = async () => {
  try {
    await connectDB();
    
    // Load MQTT after socket.io is initialized
    await import("./utils/mqttClient.js");
    
    // Socket.IO connection handling
    io.on("connection", (socket) => {
      activeConnections.add(socket.id);
      console.log(`🔗 Client connected (Total: ${activeConnections.size})`);
      
      socket.on("disconnect", (reason) => {
        activeConnections.delete(socket.id);
        
        // Only log unexpected disconnections
        if (reason !== "client namespace disconnect" && reason !== "transport close") {
          console.log(`❌ Client disconnected: ${reason} (Remaining: ${activeConnections.size})`);
        }
      });
    });
    
    // Start server
    server.listen(PORT, () => {
      console.log(`✅ Server + WebSocket running at http://localhost:${PORT}`);
    });
    
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

startServer();