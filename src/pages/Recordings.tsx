import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft, Play, Trash2, Calendar, Clock, Video, Loader2, Search, Filter } from "lucide-react";
import { getRecordings, deleteRecording, SavedRecording } from "../utils/videoStorage";
import { motion, AnimatePresence } from "motion/react";

export default function Recordings() {
  const [recordings, setRecordings] = useState<SavedRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = () => {
    getRecordings()
      .then(setRecordings)
      .catch(err => console.error("Error loading recordings:", err))
      .finally(() => setLoading(false));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta grabación?")) return;
    try {
      await deleteRecording(id);
      setRecordings(prev => prev.filter(r => r.id !== id));
      if (selectedVideo === id) setSelectedVideo(null);
    } catch (err) {
      console.error("Error deleting recording:", err);
    }
  };

  const filteredRecordings = recordings.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-brand-bg text-neutral-50 font-sans">
      <Helmet>
        <title>Archivo de Grabaciones | Vida Mixe TV</title>
        <meta name="description" content="Explora el archivo de transmisiones pasadas de Vida Mixe TV." />
      </Helmet>

      {/* Hero Section */}
      <div className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://picsum.photos/seed/archive-bg/1920/600?blur=10" 
            alt="Fondo de archivo" 
            className="w-full h-full object-cover opacity-20"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/50 via-brand-bg to-brand-bg"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-secondary/20 border border-brand-secondary/30 text-brand-secondary backdrop-blur-sm">
            <Video className="w-4 h-4" />
            <span className="text-sm font-medium tracking-wide uppercase">Memoria Digital</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">
            Archivo de <span className="text-brand-secondary">Grabaciones</span>
          </h1>
          <p className="text-xl text-neutral-400 font-light leading-relaxed max-w-2xl mx-auto">
            Revive los momentos más importantes de nuestra comunidad. Todas las transmisiones guardadas localmente en tu navegador.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-24 space-y-12">
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-brand-surface border border-white/5 p-6 rounded-[2.5rem]">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input 
              type="text"
              placeholder="Buscar grabaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-brand-bg border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white outline-none focus:border-brand-secondary/50 transition-all"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-xs font-bold text-neutral-400">
              <Filter className="w-4 h-4" />
              <span>{filteredRecordings.length} Grabaciones</span>
            </div>
            <Link to="/" className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all border border-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-12 h-12 text-brand-secondary animate-spin" />
            <p className="text-neutral-400 font-medium">Cargando archivo...</p>
          </div>
        ) : filteredRecordings.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredRecordings.map((recording) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={recording.id}
                  className="group bg-brand-surface border border-white/5 rounded-[2rem] overflow-hidden hover:border-brand-secondary/30 transition-all duration-500 flex flex-col"
                >
                  <div className="relative aspect-video bg-black overflow-hidden">
                    {selectedVideo === recording.id ? (
                      <video 
                        src={URL.createObjectURL(recording.blob)} 
                        controls 
                        autoPlay 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                        <button 
                          onClick={() => setSelectedVideo(recording.id)}
                          className="w-16 h-16 bg-brand-secondary text-white rounded-2xl flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform z-10"
                        >
                          <Play className="w-8 h-8 fill-current ml-1" />
                        </button>
                        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white/60 text-[10px] font-bold uppercase tracking-widest">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {formatDuration(recording.duration)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            {new Date(recording.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-brand-secondary transition-colors line-clamp-2">
                        {recording.name}
                      </h3>
                      <p className="text-neutral-500 text-xs mt-2 font-medium">
                        Guardado el {new Date(recording.date).toLocaleTimeString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                      <button 
                        onClick={() => handleDelete(recording.id)}
                        className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </button>
                      <button 
                        onClick={() => setSelectedVideo(recording.id)}
                        className="text-xs font-bold text-brand-secondary hover:underline"
                      >
                        Reproducir ahora
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-32 bg-brand-surface/50 border border-dashed border-white/5 rounded-[3rem]">
            <Video className="w-16 h-16 text-neutral-700 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-white mb-2">No se encontraron grabaciones</h3>
            <p className="text-neutral-500 max-w-xs mx-auto">
              {searchTerm ? "Intenta con otros términos de búsqueda." : "Inicia una transmisión y grábala para verla aquí."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

