import { useRef, useState } from 'react';
import type { Photo } from '../types';

interface UsePhotoSelectionParams {
  photos: Photo[];
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  filteredPhotos: Photo[];
  paginatedPhotos: Photo[];
  currentPage: number;
  totalPages: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
}

export function usePhotoSelection({
  photos,
  setPhotos,
  paginatedPhotos,
  currentPage,
  totalPages,
  setCurrentPage,
}: UsePhotoSelectionParams) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const pageChangeTimerRef = useRef<number | null>(null);

  const handlePhotoClick = (e: React.MouseEvent, id: string) => {
    const next = new Set(selectedIds);
    if (e.shiftKey && lastSelectedId) {
      const a = paginatedPhotos.findIndex((p) => p.id === lastSelectedId);
      const b = paginatedPhotos.findIndex((p) => p.id === id);
      if (a !== -1 && b !== -1) {
        const [s, end] = a < b ? [a, b] : [b, a];
        for (const p of paginatedPhotos.slice(s, end + 1)) {
          next.add(p.id);
        }
      } else {
        next.add(id);
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setLastSelectedId(id);
    } else {
      next.clear();
      next.add(id);
      setLastSelectedId(id);
    }
    setSelectedIds(next);
  };

  const handleCardDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
    if (!selectedIds.has(id)) {
      setSelectedIds(new Set([id]));
      setLastSelectedId(id);
    }
  };

  const handleCardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCardDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedId;
    setDraggedId(null);
    if (!sourceId || sourceId === targetId) return;

    const movingIds = selectedIds.has(sourceId) ? Array.from(selectedIds) : [sourceId];
    const movingSet = new Set(movingIds);
    const movingItems = photos.filter((p) => movingSet.has(p.id));
    const remain = photos.filter((p) => !movingSet.has(p.id));

    const targetIdx = remain.findIndex((p) => p.id === targetId);
    if (targetIdx === -1) return;

    remain.splice(targetIdx, 0, ...movingItems);
    setPhotos(remain);
  };

  const handlePageDragOver = (_e?: React.DragEvent | 'prev' | 'next', dir?: 'prev' | 'next') => {
    const targetDir = typeof _e === 'string' ? _e : dir;
    if (!targetDir || pageChangeTimerRef.current) return;
    pageChangeTimerRef.current = window.setTimeout(() => {
      if (targetDir === 'prev' && currentPage > 1) {
        setCurrentPage((c) => c - 1);
      }
      if (targetDir === 'next' && currentPage < totalPages) {
        setCurrentPage((c) => c + 1);
      }
      pageChangeTimerRef.current = null;
    }, 600);
  };

  const handlePageDragLeave = () => {
    if (pageChangeTimerRef.current) {
      clearTimeout(pageChangeTimerRef.current);
      pageChangeTimerRef.current = null;
    }
  };

  return {
    selectedIds,
    setSelectedIds,
    lastSelectedId,
    setLastSelectedId,
    draggedId,
    setDraggedId,
    handlePhotoClick,
    handleCardDragStart,
    handleCardDragOver,
    handleCardDrop,
    handlePageDragOver,
    handlePageDragLeave,
  };
}
