import React from 'react';
import { Photo, Standard } from '../types';
import { LazyImage } from './LazyImage';

interface PrintLedgerProps {
  photos: Photo[];
  std: Standard;
}

export const PrintLedger: React.FC<PrintLedgerProps> = ({ photos, std }) => {
  return (
    <>
      <div className="print-cover font-sans">
        <div className="border-b-[3px] border-[#002d6e] pb-[8mm] mb-[10mm]">
          <h1 className="text-[22pt] font-black text-[#002d6e]">工事写真台帳</h1>
        </div>
        <table className="border-collapse text-[10pt] w-full">
          <tbody>
            {[
              ['適用基準', std?.versionTag || ''],
              ['DTD', std?.dtdName || ''],
              ['写真フォルダ', std ? `${std.photoFolder}/${std.picFolder}` : ''],
              ['総枚数', `${photos.length} 枚`],
              ['出力日', new Date().toLocaleDateString('ja-JP')],
            ].map(([k, v]) => (
              <tr key={k}>
                <td className="p-[4mm_6mm] font-bold bg-[#f0f4f8] w-[40mm] border-b border-[#dde3ec]">
                  {k}
                </td>
                <td className="p-[4mm_6mm] border-b border-[#dde3ec]">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {Array.from({ length: Math.ceil(photos.length / 2) }).map((_, pageIdx) => (
        <div key={pageIdx} className="ledger-page">
          <div className="flex justify-between items-baseline border-b-2 border-[#002d6e] pb-[2mm] mb-[4mm] font-sans">
            <span className="font-black text-[9pt] text-[#002d6e]">工事写真台帳</span>
            <span className="text-[8pt] text-[#94a3b8] font-mono">Page {pageIdx + 1}</span>
          </div>
          {photos.slice(pageIdx * 2, pageIdx * 2 + 2).map((p) => (
            <div key={p.id} className="ledger-item">
              <div className="ledger-photo">
                <LazyImage file={p.file} forceLoad={true} />
              </div>
              <div className="ledger-meta">
                <div className="meta-row">
                  <div className="meta-key">シリアル番号</div>
                  <div className="meta-serial">{p.serialNo}</div>
                </div>
                <div className="meta-row">
                  <div className="meta-key">写真区分</div>
                  <div className="meta-val">{p.category}</div>
                </div>
                <div className="meta-row">
                  <div className="meta-key">写真タイトル</div>
                  <div className="meta-val text-[10pt]">{p.title || '（未入力）'}</div>
                </div>
                <div className="meta-row">
                  <div className="meta-key">工種 / 種別 / 細別</div>
                  <div className="meta-val">
                    {[p.workType, p.type, p.subdivision].filter(Boolean).join(' / ') || '—'}
                  </div>
                </div>
                <div className="meta-row border-b-0">
                  <div className="meta-key">撮影年月日</div>
                  <div className="meta-val font-mono">{p.shootingDate}</div>
                </div>
                <div className="mt-auto flex gap-[4mm] pt-[2mm]">
                  {p.isRepresentative && (
                    <span className="bg-[#dbeafe] text-[#1d4ed8] p-[1mm_3mm] rounded-[3px] text-[7.5pt] font-bold">
                      代表写真
                    </span>
                  )}
                  {p.isFrequency && (
                    <span className="bg-[#d1fae5] text-[#065f46] p-[1mm_3mm] rounded-[3px] text-[7.5pt] font-bold">
                      提出頻度
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
};
