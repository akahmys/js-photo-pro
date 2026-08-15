import type React from 'react';
import { PHOTO_CATEGORIES } from '../constants/workMaster';
import type { Photo } from '../types';
import { Ic } from './Icons';

interface FilterBarProps {
  rootHandleName: string | undefined;
  fCategory: string;
  setFCategory: (val: string) => void;
  fWorkType: string;
  setFWorkType: (val: string) => void;
  fType: string;
  setFType: (val: string) => void;
  fSubdivision: string;
  setFSubdivision: (val: string) => void;
  fErr: boolean;
  setFErr: React.Dispatch<React.SetStateAction<boolean>>;
  photos: Photo[];
  filteredPhotosCount: number;
  errorCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  rootHandleName,
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
  photos,
  filteredPhotosCount,
  errorCount,
  onSelectAll,
  onClearSelection,
}) => {
  return (
    <div className="bg-white/80 backdrop-blur border-b border-slate-200 px-6 py-3 flex items-center gap-4 flex-shrink-0 no-print overflow-x-auto no-sb shadow-sm z-10">
      <div className="flex items-center gap-2 mr-2 flex-shrink-0">
        <Ic k="folder" size={18} cls="text-blue-500" />
        <span className="text-sm font-black text-slate-800 tracking-tight">{rootHandleName}</span>
        <span className="badge badge-blue text-[10px] ml-1.5 px-2 py-0.5 font-bold shadow-sm">
          {filteredPhotosCount} / {photos.length} 枚
        </span>
      </div>

      <div className="h-5 w-px bg-slate-200 flex-shrink-0" />

      <div className="flex items-center gap-2 flex-1 min-w-[500px]">
        <Ic k="filter" size={14} cls="text-slate-400 flex-shrink-0" />

        <select
          value={fCategory}
          onChange={(e) => setFCategory(e.target.value)}
          className="text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 outline-none cursor-pointer transition-all max-w-[150px] flex-shrink-0 select-custom"
        >
          <option value="">区分: すべて</option>
          {PHOTO_CATEGORIES.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        <select
          value={fWorkType}
          onChange={(e) => setFWorkType(e.target.value)}
          className="text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 outline-none cursor-pointer transition-all max-w-[150px] flex-shrink-0 select-custom"
        >
          <option value="">工種: すべて</option>
          {[...new Set(photos.map((p) => p.workType))]
            .filter(Boolean)
            .sort()
            .map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
        </select>

        <select
          value={fType}
          onChange={(e) => setFType(e.target.value)}
          className="text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 outline-none cursor-pointer transition-all max-w-[150px] flex-shrink-0 select-custom"
        >
          <option value="">種別: すべて</option>
          {[...new Set(photos.map((p) => p.type))]
            .filter(Boolean)
            .sort()
            .map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
        </select>

        <select
          value={fSubdivision}
          onChange={(e) => setFSubdivision(e.target.value)}
          className="text-xs font-bold bg-slate-50 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 outline-none cursor-pointer transition-all max-w-[150px] flex-shrink-0 select-custom"
        >
          <option value="">細別: すべて</option>
          {[...new Set(photos.map((p) => p.subdivision))]
            .filter(Boolean)
            .sort()
            .map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
        </select>

        <button
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${fErr ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100/70' : 'bg-slate-50 hover:bg-slate-100/70 text-slate-600 border border-slate-200 hover:border-slate-300'}`}
          onClick={() => setFErr((v) => !v)}
        >
          <Ic k="alertCircle" size={13} /> 未完了
          {errorCount > 0 && (
            <span
              className={`badge ${fErr ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'} text-[9px] px-1.5 py-0.5 rounded shadow-sm font-mono`}
            >
              {errorCount}
            </span>
          )}
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        <button
          className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
          onClick={onSelectAll}
        >
          全選択
        </button>
        <span className="text-slate-300">|</span>
        <button
          className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
          onClick={onClearSelection}
        >
          解除
        </button>
      </div>
    </div>
  );
};
