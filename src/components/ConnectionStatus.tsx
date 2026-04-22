import React from 'react';
import { useSocket } from '../contexts/SocketContext';
import { WifiOff, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ConnectionStatus() {
  const { connected, connecting } = useSocket();

  return (
    <AnimatePresence>
      {(!connected || connecting) && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none"
        >
          <div className={`flex items-center gap-3 px-6 py-3 rounded-full border shadow-2xl backdrop-blur-xl ${
            connecting 
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' 
              : 'bg-red-500/10 border-red-500/30 text-red-500'
          }`}>
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-bold uppercase tracking-widest">Conectando con la sierra...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Sin conexión a Vida Mixe TV</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
