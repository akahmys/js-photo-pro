import React from 'react';
import { STANDARDS } from '../constants/standards';
import { Ic } from './Icons';

interface WelcomeScreenProps {
  mode: 'welcome' | 'select_std';
  standardSelectMode: 'new' | 'existing' | null;
  onOpenFolder: () => void;
  onNewProject: () => void;
  onStandardChosen: (stdId: string) => void;
  onBack: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  mode,
  standardSelectMode,
  onOpenFolder,
  onNewProject,
  onStandardChosen,
  onBack,
}) => {
  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-tr from-[#000d26] via-[#001e54] to-[#002f87] relative overflow-hidden">
      {/* 背景の光彩エフェクト */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#0055b3]/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-10 w-full max-w-lg mx-4 border border-white/40 transition-all duration-300 hover:shadow-[0_25px_60px_rgba(0,0,0,0.35)] relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-gradient-to-tr from-[#002d6e] to-[#0055b3] rounded-2xl p-3.5 shadow-lg shadow-blue-900/20 transform hover:rotate-6 transition-transform">
            <Ic k="camera" size={32} cls="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#002d6e] tracking-tight bg-gradient-to-r from-[#002d6e] to-[#0055b3] bg-clip-text text-transparent">JS PHOTO PRO</h1>
            <p className="text-[10px] font-extrabold text-[#0055b3]/70 tracking-widest uppercase mt-0.5">v3.11.1 — 日本下水道事業団 電子納品完全準拠</p>
          </div>
        </div>

        {mode === 'welcome' && (
          <div className="animate-fadeIn">
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              日本下水道事業団（JS）の「工事記録写真電子管理要領」に完全準拠した、XML生成・写真整理管理ツールです。<br />
              データはすべてローカルフォルダへ安全に直接保存されます。
            </p>
            <div className="space-y-4">
              <button 
                className="flex items-center justify-center gap-3 w-full py-4 text-sm font-bold text-white bg-gradient-to-r from-[#003c96] to-[#0055b3] hover:from-[#002d6e] hover:to-[#00479b] rounded-xl shadow-md hover:shadow-lg active:scale-[0.99] transition-all"
                onClick={onOpenFolder}
              >
                <Ic k="folderOpen" size={20} /> 既存プロジェクトフォルダを開く
              </button>
              <button 
                className="flex items-center justify-center gap-3 w-full py-4 text-sm font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl active:scale-[0.99] transition-all"
                onClick={onNewProject}
              >
                <Ic k="plus" size={20} /> 新規プロジェクト作成
              </button>
            </div>
            
            <div className="mt-8 bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-[11px] text-blue-800 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 mb-1.5 text-blue-900">
                <Ic k="info" size={13} /> 適用基準に関する注意
              </div>
              <ul className="space-y-1 pl-4 list-disc">
                <li><strong className="text-[#0055b3]">R6年度基準:</strong> 令和6年4月1日以降の契約案件向け</li>
                <li><strong className="text-amber-700">H30年度基準:</strong> 平成30年4月1日〜令和6年3月31日契約分</li>
              </ul>
              <p className="mt-2 text-slate-400">※既存フォルダを開いた場合、XMLの内容から基準を自動検出します。</p>
            </div>
          </div>
        )}

        {mode === 'select_std' && (
          <div className="animate-fadeIn">
            <p className="text-sm font-bold text-slate-600 mb-6">
              {standardSelectMode === 'new' ? "✨ 新規プロジェクトの適用基準を選択" : "🔍 適用する電子納品基準を選択"}
            </p>
            <div className="space-y-3.5">
              {Object.values(STANDARDS).map(s => (
                <button 
                  key={s.id} 
                  className="w-full text-left p-5 border border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/40 rounded-xl shadow-sm hover:shadow transition-all group duration-200"
                  onClick={() => onStandardChosen(s.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{s.fullLabel}</div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1"><Ic k="calendar" size={10} /> {s.period}</div>
                      <div className="text-[9px] font-mono text-slate-400/80 mt-0.5">{s.versionTag}</div>
                    </div>
                    <span className={`badge ${s.color} text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded shadow-sm`}>{s.dtdName}</span>
                  </div>
                </button>
              ))}
            </div>
            <button 
              className="text-xs text-slate-400 hover:text-slate-600 font-bold mt-7 underline block mx-auto transition-colors"
              onClick={onBack}
            >
              ← メインへ戻る
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
