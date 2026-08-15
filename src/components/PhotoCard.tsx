import type React from 'react';
import type { Photo } from '../types';
import { toSerial } from '../utils/fileSystem';
import { validatePhoto } from '../utils/validation';
import { Ic } from './Icons';
import { LazyImage } from './LazyImage';

interface PhotoCardProps {
  p: Photo;
  isSelected: boolean;
  draggedId: string | null;
  setDraggedId: (id: string | null) => void;
  handlePageDragLeave: () => void;
  photos: Photo[];
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({
  p,
  isSelected,
  draggedId,
  setDraggedId,
  handlePageDragLeave,
  photos,
  setPhotos,
  onClick,
  onDoubleClick,
}) => {
  const errs = validatePhoto(p);
  const isErr = errs.length > 0;

  return (
    <div
      draggable
      onDragStart={(e) => {
        setDraggedId(p.id);
        e.dataTransfer.setData('text/plain', p.id);
      }}
      onDragEnd={() => {
        setDraggedId(null);
        handlePageDragLeave();
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (!draggedId || draggedId === p.id) return;
        const items = [...photos];
        const di = items.findIndex((i) => i.id === draggedId);
        const ti = items.findIndex((i) => i.id === p.id);
        const [di2] = items.splice(di, 1);
        items.splice(ti, 0, di2);
        setPhotos(items.map((it, i) => ({ ...it, serialNo: toSerial(i + 1) })));
        setDraggedId(null);
        handlePageDragLeave();
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`group relative flex flex-col bg-white rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden ${isSelected ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20 scale-[0.98]' : 'border-slate-200 hover:border-slate-300 hover:shadow-lg hover:scale-[1.02]'} ${isErr && !isSelected ? 'border-orange-300 hover:border-orange-400 bg-orange-50/20' : ''}`}
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-slate-100 rounded-t-xl">
        <LazyImage
          file={p.file}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {isErr && (
          <div className="absolute top-2 left-2 badge bg-orange-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
            <Ic k="alertCircle" size={10} /> 要修正
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-1 z-10">
          {p.referenceFileName && (
            <div
              className="w-5 h-5 bg-purple-600 rounded-md flex items-center justify-center shadow-md"
              title="参考図あり"
            >
              <Ic k="list" size={10} cls="text-white" />
            </div>
          )}
          {p.isRepresentative && (
            <div
              className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center shadow-md"
              title="代表写真"
            >
              <Ic k="star" size={10} cls="text-white" fill="white" />
            </div>
          )}
          {p.isFrequency && (
            <div
              className="w-5 h-5 bg-emerald-600 rounded-md flex items-center justify-center shadow-md"
              title="提出頻度"
            >
              <Ic k="checkCircle" size={10} cls="text-white" />
            </div>
          )}
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between bg-white">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="mono text-[10px] font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100/60 shadow-sm">
              {p.serialNo}
            </span>
            <span className="mono text-[9px] text-slate-400 font-bold">{p.shootingDate}</span>
          </div>
          <p
            className={`text-xs font-bold line-clamp-2 leading-snug ${!p.title ? 'text-orange-500 italic' : 'text-slate-700'}`}
          >
            {p.title || '（タイトル未入力）'}
          </p>
        </div>

        {p.category && (
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="badge badge-slate text-[9px] font-bold px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-500">
              {p.category}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
