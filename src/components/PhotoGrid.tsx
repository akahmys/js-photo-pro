import type React from 'react';
import type { Photo } from '../types';
import { Ic } from './Icons';
import { PhotoCard } from './PhotoCard';

interface PhotoGridProps {
  photos: Photo[];
  paginatedPhotos: Photo[];
  selectedIds: Set<string>;
  draggedId: string | null;
  setDraggedId: (id: string | null) => void;
  handlePageDragOver: (e: React.DragEvent, dir: 'prev' | 'next') => void;
  handlePageDragLeave: () => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  handlePhotoClick: (e: React.MouseEvent, id: string) => void;
  setPreviewPhoto: (p: Photo | null) => void;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  paginatedPhotos,
  selectedIds,
  draggedId,
  setDraggedId,
  handlePageDragOver,
  handlePageDragLeave,
  currentPage,
  setCurrentPage,
  totalPages,
  setPhotos,
  handlePhotoClick,
  setPreviewPhoto,
}) => {
  const renderPaginationControls = (extraClass = '') => {
    if (totalPages <= 1) return null;
    return (
      <div className={`flex items-center justify-center gap-4 w-full no-print ${extraClass}`}>
        <button
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg shadow-sm transition-all hover:bg-slate-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed text-slate-300' : 'text-slate-600 hover:border-slate-300'}`}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          onDragOver={(e) => handlePageDragOver(e, 'prev')}
          onDragLeave={handlePageDragLeave}
          onDrop={handlePageDragLeave}
        >
          <Ic k="chevronLeft" size={14} /> 前の100件
        </button>
        <div className="text-xs font-black text-slate-600 bg-white px-4 py-2.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-1 font-mono">
          {currentPage} <span className="text-slate-300 font-normal">/</span> {totalPages} ページ
        </div>
        <button
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg shadow-sm transition-all hover:bg-slate-50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed text-slate-300' : 'text-slate-600 hover:border-slate-300'}`}
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          onDragOver={(e) => handlePageDragOver(e, 'next')}
          onDragLeave={handlePageDragLeave}
          onDrop={handlePageDragLeave}
        >
          次の100件 <Ic k="chevronRight" size={14} />
        </button>
      </div>
    );
  };

  if (photos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-center bg-slate-50 select-none">
        <div className="w-24 h-24 bg-blue-50/70 border border-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm shadow-blue-200/50 transform hover:scale-105 transition-transform duration-300">
          <Ic k="camera" size={40} cls="text-blue-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 mb-1">写真が登録されていません</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          ドラッグ＆ドロップでJPEGファイルを追加するか、フォルダを選択してください。
        </p>
      </div>
    );
  }

  if (paginatedPhotos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-50">
        <Ic k="filter" size={40} cls="mb-4 opacity-30 animate-pulse" />
        <p className="text-sm font-bold">フィルタ条件に一致する写真がありません</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
      {renderPaginationControls('mb-6')}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {paginatedPhotos.map((p) => (
          <PhotoCard
            key={p.id}
            p={p}
            isSelected={selectedIds.has(p.id)}
            draggedId={draggedId}
            setDraggedId={setDraggedId}
            handlePageDragLeave={handlePageDragLeave}
            photos={photos}
            setPhotos={setPhotos}
            onClick={(e) => handlePhotoClick(e, p.id)}
            onDoubleClick={() => setPreviewPhoto(p)}
          />
        ))}
      </div>

      {renderPaginationControls('mt-8 pt-4 pb-4 border-t border-slate-100')}
    </div>
  );
};
