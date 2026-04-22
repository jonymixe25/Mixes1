import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { AccessToken } from "livekit-server-sdk";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  
  const allowedOrigins = [
    "https://sexmixe.lat",
    "https://www.sexmixe.lat",
    "https://vidamixe.mx", 
    "https://www.vidamixe.mx", 
    "https://app-new-production-1af2.up.railway.app",
    "http://localhost:3000",
    process.env.APP_URL
  ].filter(Boolean) as string[];
  
  // Enable CORS for all routes
  app.use(cors({
    origin: (origin, callback) => {
      console.log(">>> [CORS Request]:", origin || "Mismo origen");
      if (!origin || 
          origin.includes("sexmixe.lat") ||
          origin.includes("vidamixe.mx") ||
          origin.includes("railway.app") ||
          origin.includes("ais-dev-") || 
          origin.includes("ais-pre-")) {
        callback(null, true);
      } else {
        console.warn(">>> [CORS Potential Block]:", origin);
        callback(null, true); // Permitimos todo para depurar el "No conecta"
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true
  }));
  
  app.use(express.json({ limit: '10mb' })); // Increased limit for base64 images
  const PORT = 3000;
  const httpServer = createServer(app);
  
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 30000, // Bajamos el timeout para detectar desconexiones más rápido
    pingInterval: 10000, // Pings más frecuentes para mantener viva la conexión
    allowEIO3: true,
    transports: ["polling", "websocket"]
  });

  // Almacenar broadcasters: socket.id -> { id, name, viewers }
  const activeBroadcasters = new Map<string, { id: string, name: string, viewers: number }>();
  const chatHistory: any[] = [];
  // Almacenar usuarios conectados: socket.id -> { username, id }
  const users: { [id: string]: { username: string; id: string } } = {};

  const emitUserList = () => {
    const userList = Object.values(users);
    io.emit("user_list", userList);
  };

  io.on("connection", (socket) => {
    console.log(">>> [SERVER] Nuevo cliente conectado:", socket.id);
    console.log(">>> [SERVER] Query:", socket.handshake.query);
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
        // Emitir conteo específico al broadcaster
        io.to(broadcasterId).emit("viewers_count", b.viewers);
      }
      socket.emit("chat_history", chatHistory);
    });

    // Registro de usuario para el chat y lista de espectadores
    socket.on("register_user", (username: string) => {
      users[socket.id] = { username, id: socket.id };
      emitUserList();
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

    socket.on("chat_message", (message) => {
      chatHistory.push(message);
      if (chatHistory.length > 100) chatHistory.shift(); // Keep last 100 messages
      io.emit("chat_message", message);
    });

    socket.on("delete_message", (messageId) => {
      // Solo el broadcaster de la sala actual o un admin podría borrar
      // Por simplicidad, permitimos si el socket.id está en activeBroadcasters
      if (activeBroadcasters.has(socket.id)) {
        const index = chatHistory.findIndex(m => m.id === messageId);
        if (index !== -1) {
          chatHistory.splice(index, 1);
        }
        io.emit("message_deleted", messageId);
      }
    });

    socket.on("stop_broadcasting", () => {
      if (activeBroadcasters.has(socket.id)) {
        activeBroadcasters.delete(socket.id);
        io.emit("broadcaster_list", Array.from(activeBroadcasters.values()));
      }
    });

    socket.on("disconnect", () => {
      // Eliminar usuario de la lista
      if (users[socket.id]) {
        delete users[socket.id];
        emitUserList();
      }

      if (activeBroadcasters.has(socket.id)) {
        activeBroadcasters.delete(socket.id);
        socket.broadcast.emit("disconnectPeer", socket.id);
        io.emit("broadcaster_list", Array.from(activeBroadcasters.values()));
      } else {
        // Reducir viewers de todos los broadcasters donde este socket estaba mirando
        activeBroadcasters.forEach(b => {
          socket.to(b.id).emit("disconnectPeer", socket.id);
          // Opcional: decrementar viewers si sabemos que estaba mirando
          // Por simplicidad, el cliente debería avisar al salir de una sala
        });
      }
    });
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    console.log("GET /api/health");
    res.json({ status: "ok" });
  });

  app.get("/api/config", (req, res) => {
    res.json({
      liveKitUrl: process.env.VITE_LIVEKIT_URL || process.env.LIVEKIT_URL || "",
      envStatus: {
        GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
        LIVEKIT_API_KEY: !!process.env.LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET: !!process.env.LIVEKIT_API_SECRET,
        VITE_LIVEKIT_URL: !!(process.env.VITE_LIVEKIT_URL || process.env.LIVEKIT_URL)
      }
    });
  });

  app.post("/api/livekit/token", async (req, res) => {
    console.log("POST /api/livekit/token received");
    try {
      const { roomName, participantName, isBroadcaster } = req.body;
      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;
      
      console.log("Request body:", req.body);
      console.log("API Key present:", !!apiKey);
      console.log("API Secret present:", !!apiSecret);

      if (!apiKey || !apiSecret) {
        throw new Error("LiveKit API Key or Secret not configured");
      }

      console.log("Generating AccessToken...");
      console.log("API Key:", apiKey?.slice(0, 5) + "...");
      console.log("Identity:", participantName || `user-${Math.floor(Math.random() * 10000)}`);
      
      const at = new AccessToken(apiKey, apiSecret, {
        identity: participantName || `user-${Math.floor(Math.random() * 10000)}`,
      });

      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: isBroadcaster,
        canSubscribe: true,
      });

      const token = await at.toJwt();
      console.log("Token generated successfully");
      res.json({ token });
    } catch (error) {
      console.error("Error generating token:", error);
      res.status(500).json({ error: "Failed to generate token" });
    }
  });

  app.post("/api/translate", async (req, res) => {
    try {
      const { text, variant } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
      }

      const ai = new GoogleGenAI(apiKey);
      const model = ai.getGenerativeModel({ 
        model: "gemini-3-flash-preview",
        systemInstruction: "Eres un lingüista experto en lenguas mixe-zoqueanas, específicamente en el Ayuujk de Oaxaca. Tu objetivo es preservar la riqueza lingüística y proporcionar traducciones precisas y respetuosas.",
      });

      const prompt = `Traduce el siguiente texto del español a la lengua Ayuujk (Mixe).
      Variante solicitada: ${variant}
      
      Texto a traducir: "${text}"
      
      Por favor, responde con este formato exacto:
      **Traducción:** [Texto traducido]
      
      **Pronunciación aproximada:** [Guía fonética básica]
      
      **Notas culturales/gramaticales:** [Breve explicación sobre la variante o el uso de la palabra]`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      res.json({ text: responseText });
    } catch (error) {
      console.error("Translation server error:", error);
      res.status(500).json({ error: "Failed to translate" });
    }
  });

  app.post("/api/moderate", async (req, res) => {
    try {
      const { text, context } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({ isAppropriate: true }); // Default pass if no key
      }

      const ai = new GoogleGenAI(apiKey);
      const model = ai.getGenerativeModel({ model: "gemini-3-flash-preview" });

      const prompt = `
        You are a content moderator for a community platform called Vida Mixe TV.
        Review the following ${context} content and determine if it is appropriate.
        Content should be blocked if it contains hate speech, harassment, explicit content, or extreme spam.
        
        Content to review:
        "${text}"
        
        Respond with a JSON object containing two fields:
        - isAppropriate (boolean): true if the content is safe, false otherwise.
        - reason (string): If isAppropriate is false, provide a brief, polite reason in Spanish. If true, this can be omitted.
      `;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        }
      });
      
      const responseText = result.response.text();
      const moderationResult = JSON.parse(responseText);

      res.json(moderationResult);
    } catch (error) {
      console.error("Moderation server error:", error);
      res.json({ isAppropriate: true }); // Fail safe
    }
  });

  // Catch-all for API routes to prevent falling through to Vite
  app.all("/api/*", (req, res) => {
    console.log(`404 API: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Ruta de API no encontrada: ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("build"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "build", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on port ${PORT}`);
  });
}

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer().catch(err => {
  console.error("Critical failure during server startup:", err);
  process.exit(1);
});
