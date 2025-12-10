import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import connectDB from "./config/db.js";
import { Server } from "socket.io";
import http from "http";
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});
let activeConnections = new Set();
const startServer = async () => {
  try {
    await connectDB();
    await import("./utils/mqttClient.js");
    io.on("connection", (socket) => {
      activeConnections.add(socket.id);
      console.log(`Client connected (Total: ${activeConnections.size})`);
      socket.on("disconnect", (reason) => {
        activeConnections.delete(socket.id);
        if (reason !== "client namespace disconnect" && reason !== "transport close") {
          console.log(` Client disconnected: ${reason} (Remaining: ${activeConnections.size})`);
        }
      });
    });
    server.listen(PORT, () => {
      console.log(`Server + WebSocket running at http://localhost:${PORT}`);
    });
    
  } catch (error) {
    console.error(" Server startup failed:", error);
    process.exit(1);
  }
};
startServer();