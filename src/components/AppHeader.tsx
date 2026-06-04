import React from 'react';
import { Standard } from '../types';
import { Ic } from './Icons';

interface AppHeaderProps {
  activeStd: Standard | null;
  onChangeStdClick: () => void;
  onRename: () => void;
  onMerge: () => void;
  onCloseProject: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeStd,
  onChangeStdClick,
  onRename,
  onMerge,
  onCloseProject,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white px-6 py-4 flex items-center justify-between no-print shadow-md flex-shrink-0 z-20">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-tr from-[#0055b3] to-blue-400 rounded-lg p-1.5 shadow-md shadow-blue-500/20">
          <Ic k="camera" size={20} cls="text-white" />
        </div>
        <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">JS PHOTO PRO</span>
        
        {activeStd && (
          <button 
            onClick={onChangeStdClick} 
            className={`badge ${activeStd.color} text-[11px] px-3 py-1 hover:opacity-90 active:scale-95 transition-all ml-3 cursor-pointer border-none shadow-sm flex items-center gap-1 font-bold`}
            title="電子納品基準を切り替え"
          >
            {activeStd.label} <span className="text-[9px] opacity-75">▼</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button 
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          onClick={onRename}
          title="現在の表示順で写真ファイル名を一括連番化してリネームします"
        >
          <Ic k="sortNum" size={14} /> 一括リネーム
        </button>

        <button 
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          onClick={onMerge}
          title="別フォルダの電子納品データから写真を取り込んで結合します"
        >
          <Ic k="merge" size={14} /> プロジェクト結合
        </button>

        <button 
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          onClick={() => window.print()}
          title="写真台帳の印刷・PDF出力を実行します"
        >
          <Ic k="printer" size={14} /> 台帳印刷
        </button>

        <div className="w-px h-6 bg-slate-800 mx-1" />

        <button 
          className="flex items-center justify-center p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors active:scale-95" 
          onClick={onCloseProject}
          title="プロジェクトを閉じる"
        >
          <Ic k="logOut" size={16} />
        </button>
      </div>
    </header>
  );
};
