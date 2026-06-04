import React from 'react';
import { Photo } from '../types';
import { LazyImage } from './LazyImage';
import { Ic } from './Icons';

interface ImagePreviewModalProps {
  previewPhoto: Photo | null;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  previewPhoto,
  onClose,
}) => {
  if (!previewPhoto) return null;

  return (
    <div 
      className="fixed inset-0 z-[2000] bg-slate-950/95 backdrop-blur-md flex flex-col no-print animate-fadeIn" 
      onClick={onClose}
    >
      <div 
        className="flex items-center justify-between px-6 py-4 border-b border-white/10" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-4">
          <span className="mono badge bg-blue-600/90 text-white text-xs font-bold px-2 py-0.5 rounded shadow-sm">
            {previewPhoto.serialNo}
          </span>
          <h3 className="text-white font-black text-base truncate max-w-[500px]">
            {previewPhoto.title || "（タイトル未設定）"}
          </h3>
        </div>
        <button 
          className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/5 active:scale-95 transition-all" 
          onClick={onClose}
        >
          <Ic k="close" size={24} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <LazyImage 
          file={previewPhoto.file} 
          forceLoad={true} 
          className="max-w-full max-h-full object-contain rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 animate-scaleIn" 
        />
      </div>

      <div 
        className="px-6 py-4 border-t border-white/10 flex items-center gap-6 text-[11px] text-white/50 font-bold bg-slate-900/50" 
        onClick={e => e.stopPropagation()}
      >
        <span className="bg-white/10 px-2.5 py-1 rounded text-white/80">{previewPhoto.category}</span>
        {previewPhoto.workType && (
          <span className="text-white/70">
            {previewPhoto.workType} <span className="opacity-40">/</span> {previewPhoto.type}
          </span>
        )}
        <span className="ml-auto mono text-white/40 tracking-wider">
          {previewPhoto.name} <span className="opacity-30">·</span> {previewPhoto.shootingDate}
        </span>
      </div>
    </div>
  );
};
