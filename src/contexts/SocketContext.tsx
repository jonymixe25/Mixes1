import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

import { getSocketUrl } from "../utils/socket";

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  connecting: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false, connecting: true });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    console.log("Iniciando conexión de Socket.io...");
    setConnecting(true);
    const url = getSocketUrl();
    
    // Usamos pooling primero para handshake inicial rápido y upgrade a websocket
    // Esto es más compatible con proxies y firewalls mientras mantiene la velocidad
    const s = io(url, {
      transports: ["polling", "websocket"],
      upgrade: true,
      withCredentials: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 10000, // Timeout más agresivo para fallar rápido y reintentar
      forceNew: false,
      autoConnect: true
    });
    
    setSocket(s);

    s.on("connect", () => {
      console.log("Socket.io conectado con ID:", s.id);
      setConnected(true);
      setConnecting(false);
    });

    s.on("connect_error", (error) => {
      console.warn("Retraso en conexión Socket.io:", error.message);
      // No seteamos connecting a false porque seguirá intentando
    });

    s.on("disconnect", (reason) => {
      console.log("Socket.io desconectado:", reason);
      setConnected(false);
      if (reason === "io server disconnect" || reason === "transport close") {
        setConnecting(true);
      }
    });

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, connecting }}>
      {children}
    </SocketContext.Provider>
  );
};
