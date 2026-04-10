import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { Upload, Loader2, X } from 'lucide-react';

interface FileUploaderProps {
  onUploadComplete: (url: string) => void;
  folder: 'images' | 'videos';
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUploadComplete, folder }) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      onUploadComplete(url);
      setFile(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error al subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-2 border-dashed border-neutral-300 rounded-lg p-4">
      {!file ? (
        <label className="flex flex-col items-center cursor-pointer">
          <Upload className="text-neutral-400 mb-2" />
          <span className="text-sm text-neutral-500">Seleccionar {folder === 'images' ? 'imagen' : 'video'}</span>
          <input type="file" className="hidden" accept={folder === 'images' ? 'image/*' : 'video/*'} onChange={handleFileChange} />
        </label>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm truncate">{file.name}</span>
          <div className="flex gap-2">
            <button onClick={() => setFile(null)} className="p-1 hover:bg-neutral-100 rounded">
              <X size={16} />
            </button>
            <button onClick={handleUpload} disabled={uploading} className="bg-brand-primary text-white px-3 py-1 rounded text-sm disabled:opacity-50">
              {uploading ? <Loader2 className="animate-spin" size={16} /> : 'Subir'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
