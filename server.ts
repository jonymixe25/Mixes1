import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { AccessToken } from "livekit-server-sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  
  // 1. Basic Middleware
  app.use(cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));

  // 2. Logging Middleware
  app.all("*", (req, res, next) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/socket.io')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
  });

  // 3. Socket.io
  const io = new Server(httpServer, {
    cors: { origin: true, methods: ["GET", "POST"], credentials: true },
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    path: "/socket.io/"
  });

  const activeBroadcasters = new Map<string, { id: string, name: string, viewers: number }>();
  const chatHistory: any[] = [];
  const users: { [id: string]: { username: string; id: string } } = {};

  const emitUserList = () => {
    io.emit("user_list", Object.values(users));
  };

  io.on("connection", (socket) => {
    console.log("Socket client connected:", socket.id);
    
    socket.on("broadcaster", (streamName: string) => {
      activeBroadcasters.set(socket.id, { 
        id: socket.id, 
        name: streamName || `Transmisión de ${socket.id.slice(0, 4)}`,
        viewers: 0 
      });
      io.emit("broadcaster_list", Array.from(activeBroadcasters.values()));
    });

    socket.on("get_broadcasters", () => {
      socket.emit("broadcaster_list", Array.from(activeBroadcasters.values()));
    });

    socket.on("watcher", (broadcasterId: string) => {
      const b = activeBroadcasters.get(broadcasterId);
      if (b) {
        socket.to(broadcasterId).emit("watcher", socket.id);
        b.viewers++;
        io.emit("broadcaster_list", Array.from(activeBroadcasters.values()));
        io.to(broadcasterId).emit("viewers_count", b.viewers);
      }
      socket.emit("chat_history", chatHistory);
    });

    socket.on("register_user", (username: string) => {
      users[socket.id] = { username, id: socket.id };
      emitUserList();
    });

    socket.on("chat_message", (message) => {
      chatHistory.push(message);
      if (chatHistory.length > 100) chatHistory.shift();
      io.emit("chat_message", message);
    });

    socket.on("stop_broadcasting", () => {
      activeBroadcasters.delete(socket.id);
      io.emit("broadcaster_list", Array.from(activeBroadcasters.values()));
    });

    socket.on("disconnect", () => {
      delete users[socket.id];
      emitUserList();
      if (activeBroadcasters.has(socket.id)) {
        activeBroadcasters.delete(socket.id);
        socket.broadcast.emit("disconnectPeer", socket.id);
        io.emit("broadcaster_list", Array.from(activeBroadcasters.values()));
      }
    });
    
    // Signaling for 1v1 Calls
    socket.on("call_user", ({ to, fromName }) => {
      io.to(to).emit("incoming_call", { from: socket.id, fromName });
    });
    socket.on("accept_call", ({ to, roomName }) => {
      io.to(to).emit("call_accepted", { from: socket.id, roomName });
    });
    socket.on("reject_call", ({ to }) => {
      io.to(to).emit("call_rejected", { from: socket.id });
    });
    socket.on("end_call", ({ to }) => {
      io.to(to).emit("call_ended", { from: socket.id });
    });
  });

  // 4. API Routes
  const api = express.Router();

  api.get("/health", (req, res) => {
    res.json({ status: "ok", version: "1.1.1", env: process.env.NODE_ENV });
  });

  api.post("/livekit/token", async (req, res) => {
    try {
      const { roomName, participantName, isBroadcaster } = req.body;
      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;

      if (!apiKey || !apiSecret) {
        return res.status(500).json({ error: "Credenciales de LiveKit no configuradas en el servidor." });
      }

      const at = new AccessToken(apiKey, apiSecret, {
        identity: participantName || `user-${Math.floor(Math.random() * 10000)}`,
      });

      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: !!isBroadcaster,
        canSubscribe: true,
      });

      const token = await at.toJwt();
      res.json({ 
        token, 
        serverUrl: process.env.LIVEKIT_URL || 'wss://vidamixe-kxkfgn4j.livekit.cloud' 
      });
    } catch (error: any) {
      console.error("Token API Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.use("/api", api);

  // 5. Client Serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (req.url.startsWith('/api')) {
        return res.status(404).json({ error: "Ruta de API no encontrada" });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[READY] Server running on port ${PORT} in ${process.env.NODE_ENV || 'dev'} mode`);
  });
}

startServer().catch(err => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
