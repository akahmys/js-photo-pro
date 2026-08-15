import { useEffect, useMemo, useState } from 'react';
import type { Photo } from '../types';
import { validatePhoto } from '../utils/validation';

export const ITEMS_PER_PAGE = 100;

export function usePhotoFilter(photos: Photo[]) {
  const [fCategory, setFCategory] = useState('');
  const [fWorkType, setFWorkType] = useState('');
  const [fType, setFType] = useState('');
  const [fSubdivision, setFSubdivision] = useState('');
  const [fErr, setFErr] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPhotos = useMemo(() => {
    const isMatch = (itemVal: string, filterVal: string): boolean => {
      if (!filterVal) return true;
      if (filterVal === '__EMPTY__') return !itemVal;
      return itemVal === filterVal;
    };

    return photos.filter((p) => {
      if (!isMatch(p.category, fCategory)) return false;
      if (!isMatch(p.workType, fWorkType)) return false;
      if (!isMatch(p.type, fType)) return false;
      if (!isMatch(p.subdivision, fSubdivision)) return false;
      if (fErr && validatePhoto(p).length === 0) return false;
      return true;
    });
  }, [photos, fCategory, fWorkType, fType, fSubdivision, fErr]);

  const errorCount = useMemo(() => {
    return photos.filter((p) => validatePhoto(p).length > 0).length;
  }, [photos]);

  const totalPages = Math.max(1, Math.ceil(filteredPhotos.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedPhotos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPhotos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPhotos, currentPage]);

  return {
    fCategory,
    setFCategory,
    fWorkType,
    setFWorkType,
    fType,
    setFType,
    fSubdivision,
    setFSubdivision,
    fErr,
    setFErr,
    currentPage,
    setCurrentPage,
    filteredPhotos,
    paginatedPhotos,
    errorCount,
    totalPages,
  };
}
