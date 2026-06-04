import React from 'react';
import { STANDARDS } from '../constants/standards';

interface StandardSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStandardChange: (stdId: string) => void;
}

export const StandardSelectModal: React.FC<StandardSelectModalProps> = ({
  isOpen,
  onClose,
  onStandardChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center no-print animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.3)] p-8 w-full max-w-md mx-4 border border-slate-100 animate-scaleIn">
        <h3 className="text-base font-black text-slate-700 mb-5 tracking-tight flex items-center gap-2">
          ⚙️ 適用する電子納品基準を選択
        </h3>
        
        <div className="space-y-3">
          {Object.values(STANDARDS).map(s => (
            <button 
              key={s.id} 
              className="w-full text-left p-4.5 border border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/30 rounded-xl transition-all duration-200 group flex items-center justify-between shadow-sm hover:shadow"
              onClick={() => { 
                onStandardChange(s.id); 
                onClose(); 
              }}
            >
              <div>
                <div className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors text-sm">{s.fullLabel}</div>
                <div className="text-[11px] text-slate-400 mt-1">{s.period}</div>
                <div className="text-[9px] font-mono text-slate-400/80 mt-0.5">{s.versionTag}</div>
              </div>
              <span className={`badge ${s.color} text-[10px] font-mono px-2 py-0.5 rounded shadow-sm font-bold`}>{s.dtdName}</span>
            </button>
          ))}
        </div>

        <button 
          className="text-xs text-slate-400 hover:text-slate-600 font-bold mt-6 underline block mx-auto transition-colors" 
          onClick={onClose}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
};
