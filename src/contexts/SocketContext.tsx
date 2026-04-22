import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

import { getSocketUrl } from "../utils/socket";

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    console.log("Iniciando conexión de Socket.io...");
    const url = getSocketUrl();
    console.log("URL de Socket:", url || "Host actual");
    
    // Configuración más robusta para evitar "server error"
    const s = io(url, {
      transports: ["polling", "websocket"], // Intentar polling primero suele ser más estable en handshakes
      withCredentials: true,
      reconnectionAttempts: 5,
      timeout: 10000
    });
    
    setSocket(s);

    s.on("connect", () => {
      console.log("Socket.io conectado con ID:", s.id);
      setConnected(true);
    });

    s.on("connect_error", (error) => {
      console.error("Error de conexión Socket.io detallado:", {
        message: error.message,
        type: error.name,
        // @ts-ignore - acceder a datos de error internos si existen
        context: error.description || error.context
      });
    });

    s.on("disconnect", (reason) => {
      console.log("Socket.io desconectado:", reason);
      setConnected(false);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
