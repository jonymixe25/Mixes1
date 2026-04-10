import React from 'react';
import { Share2, MessageCircle, Facebook } from 'lucide-react';

interface ShareButtonProps {
  url: string;
  title: string;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ url, title }) => {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      alert('Tu navegador no soporta la API de compartir. Copia el enlace manualmente.');
    }
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${title} - ${url}`)}`, '_blank');
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  return (
    <div className="flex gap-2">
      <button onClick={handleShare} className="p-2 rounded-full hover:bg-neutral-100" title="Compartir">
        <Share2 size={20} />
      </button>
      <button onClick={shareWhatsApp} className="p-2 rounded-full text-emerald-600 hover:bg-emerald-50" title="Compartir en WhatsApp">
        <MessageCircle size={20} />
      </button>
      <button onClick={shareFacebook} className="p-2 rounded-full text-blue-600 hover:bg-blue-50" title="Compartir en Facebook">
        <Facebook size={20} />
      </button>
    </div>
  );
};
