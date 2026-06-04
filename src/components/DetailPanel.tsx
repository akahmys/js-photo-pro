import React from 'react';
import { Photo } from '../types';
import { PHOTO_CATEGORIES, WORK_MASTER } from '../constants/workMaster';
import { STANDARDS } from '../constants/standards';
import { validatePhoto } from '../utils/validation';
import { Ic } from './Icons';

interface DetailPanelProps {
  selectedIds: Set<string>;
  photos: Photo[];
  onDelete: () => void;
  getDraftVal: (field: keyof Photo) => any;
  handleDraftChange: (field: keyof Photo, val: any) => void;
  applyDraft: (field: keyof Photo) => void;
  onUpdateField: (field: keyof Photo, value: any) => void;
  onSelectReferenceFile: () => void;
  selectedStandard: string;
  onCloseProject: () => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  selectedIds,
  photos,
  onDelete,
  getDraftVal,
  handleDraftChange,
  applyDraft,
  onUpdateField,
  onSelectReferenceFile,
  selectedStandard,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  if (selectedIds.size === 0) {
    return (
      <aside className="w-[340px] bg-white border-l border-slate-200 flex flex-col overflow-hidden flex-shrink-0 no-print">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Ic k="edit" size={16} cls="text-blue-600" />
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">属性編集</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 text-center py-12">
          <Ic k="cursor" size={40} cls="mb-4 opacity-40" />
          <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">
            写真をクリックして
            <br />
            選択してください
          </p>
        </div>
      </aside>
    );
  }

  const selDisc = getDraftVal('discipline');
  const _selCat = getDraftVal('category');
  const _isMechElec = ["機械", "電気"].includes(selDisc);
  const needsSubdiv = _isMechElec
    ? ["施工状況写真", "機器製作写真", "使用材料写真", "品質管理写真", "出来形管理写真", "着手前及び完成写真"].includes(_selCat)
    : ["施工状況写真", "品質管理写真", "出来形管理写真"].includes(_selCat);

  const selectedPhotoList = photos.filter(p => selectedIds.has(p.id));
  const currentErrs = selectedIds.size === 1 && selectedPhotoList[0] ? validatePhoto(selectedPhotoList[0]) : [];

  return (
    <aside className="w-[340px] bg-white border-l border-slate-200 flex flex-col overflow-hidden flex-shrink-0 no-print">
      <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <Ic k="edit" size={16} cls="text-blue-600" />
          <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">属性編集</span>
          <span className="badge badge-blue text-[10px]">{selectedIds.size}枚</span>
        </div>
        <button className="btn btn-danger py-1 px-2.5 text-[11px]" onClick={onDelete}>
          <Ic k="trash" size={12} /> 削除
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedIds.size > 1 && (
          <div className="validation-banner">
            <Ic k="info" size={14} cls="text-amber-600 flex-shrink-0" />
            <span>{selectedIds.size}枚に一括適用されます</span>
          </div>
        )}
        {selectedIds.size === 1 && (
          currentErrs.length > 0 ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs font-bold text-orange-700">
              <div className="flex items-center gap-1.5 mb-1">
                <Ic k="alertTri" size={13} cls="text-orange-500" /> 未入力の必須項目
              </div>
              <div className="text-orange-600">{currentErrs.join("、")}</div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs font-bold text-green-700 flex items-center gap-1.5">
              <Ic k="checkCircle" size={13} cls="text-green-500" /> 全項目入力済み
            </div>
          )
        )}

        <Section title="基本情報">
          <div>
            <label className="field-label required">写真タイトル</label>
            <input
              type="text"
              value={getDraftVal('title') === 'MIXED' ? '' : getDraftVal('title')}
              placeholder={getDraftVal('title') === 'MIXED' ? '（複数の値）' : '撮影内容・場所・状況を入力'}
              onChange={e => handleDraftChange('title', e.target.value)}
              onBlur={() => applyDraft('title')}
              onKeyDown={handleKeyDown}
              className={`field-input text-sm ${!getDraftVal('title') && getDraftVal('title') !== 'MIXED' ? 'err' : ''}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="field-label required">撮影年月日</label>
              <input
                type="date"
                value={getDraftVal('shootingDate') === 'MIXED' ? '' : getDraftVal('shootingDate')}
                readOnly
                disabled
                className={`field-input text-sm opacity-70 cursor-not-allowed ${!getDraftVal('shootingDate') && getDraftVal('shootingDate') !== 'MIXED' ? 'err' : ''}`}
                title="撮影年月日はEXIFから自動取得されます（写真編集不可の原則）"
              />
            </div>
            <div>
              <label className="field-label required">写真区分</label>
              <select
                value={getDraftVal('category') === 'MIXED' ? '' : getDraftVal('category')}
                onChange={e => {
                  handleDraftChange('category', e.target.value);
                  // selectは即確定させるため applyDraft を呼ぶか、そのまま確定させる
                  setTimeout(() => applyDraft('category'), 0);
                }}
                className="field-input text-sm"
              >
                <option value="">選択</option>
                {PHOTO_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        <Section title="工種分類" subtitle="JS要領 5章参照">
          <div>
            <label className="field-label">工事種別</label>
            <select
              value={getDraftVal('discipline') === 'MIXED' ? '' : getDraftVal('discipline')}
              onChange={e => {
                handleDraftChange('discipline', e.target.value);
                setTimeout(() => applyDraft('discipline'), 0);
              }}
              className="field-input text-sm"
            >
              <option value="">未選択</option>
              {WORK_MASTER.map(m => (
                <option key={m.discipline} value={m.discipline}>{m.discipline}</option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <label className="field-label required">工種</label>
            <input
              type="text"
              list="wt-list"
              value={getDraftVal('workType') === 'MIXED' ? '' : getDraftVal('workType')}
              placeholder={getDraftVal('workType') === 'MIXED' ? '（複数）' : '工種を選択または入力'}
              onChange={e => handleDraftChange('workType', e.target.value)}
              onBlur={() => applyDraft('workType')}
              onKeyDown={handleKeyDown}
              className={`field-input text-sm ${!getDraftVal('workType') ? 'err' : ''}`}
            />
            <datalist id="wt-list">
              {WORK_MASTER.find(m => m.discipline === selDisc)?.workTypes?.map(w => (
                <option key={w.name} value={w.name} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="field-label required">種別</label>
              <input
                type="text"
                list="type-list"
                value={getDraftVal('type') === 'MIXED' ? '' : getDraftVal('type')}
                placeholder={getDraftVal('type') === 'MIXED' ? '（複数）' : '種別'}
                onChange={e => handleDraftChange('type', e.target.value)}
                onBlur={() => applyDraft('type')}
                onKeyDown={handleKeyDown}
                className={`field-input text-sm ${!getDraftVal('type') ? 'err' : ''}`}
              />
              <datalist id="type-list">
                {WORK_MASTER.find(m => m.discipline === selDisc)?.workTypes?.find(w => w.name === getDraftVal('workType'))?.types?.map(t => (
                  <option key={t.name} value={t.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={`field-label ${needsSubdiv ? 'required' : ''}`}>細別</label>
              <input
                type="text"
                list="sub-list"
                value={getDraftVal('subdivision') === 'MIXED' ? '' : getDraftVal('subdivision')}
                placeholder={getDraftVal('subdivision') === 'MIXED' ? '（複数）' : '細別'}
                onChange={e => handleDraftChange('subdivision', e.target.value)}
                onBlur={() => applyDraft('subdivision')}
                onKeyDown={handleKeyDown}
                className={`field-input text-sm ${needsSubdiv && !getDraftVal('subdivision') ? 'err' : ''}`}
              />
              <datalist id="sub-list">
                {WORK_MASTER.find(m => m.discipline === selDisc)?.workTypes?.find(w => w.name === getDraftVal('workType'))?.types?.find(t => t.name === getDraftVal('type'))?.subdivisions?.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>
        </Section>

        <Section title="参考図・付加情報" subtitle="ZH005-00-24-A 表5-1 条件付必須">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`field-label mb-0 ${getDraftVal('referenceTitle') ? 'required' : ''}`}>参考図ファイル名</label>
              <button
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                onClick={onSelectReferenceFile}
              >
                <Ic k="upload" size={10} /> ファイル選択
              </button>
            </div>
            <input
              type="text"
              value={getDraftVal('referenceFileName') === 'MIXED' ? '' : getDraftVal('referenceFileName')}
              readOnly
              disabled
              placeholder={getDraftVal('referenceFileName') === 'MIXED' ? '（複数の値）' : 'ボタンから追加'}
              className={`field-input text-sm opacity-70 cursor-not-allowed ${getDraftVal('referenceTitle') && !getDraftVal('referenceFileName') ? 'err' : ''}`}
            />
          </div>
          <div className="mt-3">
            <label className={`field-label ${getDraftVal('referenceFileName') ? 'required' : ''}`}>参考図タイトル</label>
            <input
              type="text"
              value={getDraftVal('referenceTitle') === 'MIXED' ? '' : getDraftVal('referenceTitle')}
              placeholder={getDraftVal('referenceTitle') === 'MIXED' ? '（複数の値）' : '例: 反応タンク配筋図'}
              onChange={e => handleDraftChange('referenceTitle', e.target.value)}
              onBlur={() => applyDraft('referenceTitle')}
              onKeyDown={handleKeyDown}
              className={`field-input text-sm ${getDraftVal('referenceFileName') && !getDraftVal('referenceTitle') ? 'err' : ''}`}
            />
          </div>
        </Section>

        <Section title="フラグ設定">
          <div className="grid grid-cols-2 gap-3">
            <FlagButton
              active={getDraftVal('isRepresentative') === true}
              onClick={() => onUpdateField('isRepresentative', !getDraftVal('isRepresentative'))}
              icon="star"
              label="代表写真"
              activeColor="bg-blue-600 text-white border-blue-600"
            />
            <FlagButton
              active={getDraftVal('isFrequency') === true}
              onClick={() => onUpdateField('isFrequency', !getDraftVal('isFrequency'))}
              icon="checkCircle"
              label="提出頻度"
              activeColor="bg-emerald-600 text-white border-emerald-600"
            />
          </div>
        </Section>

        {selectedIds.size === 1 && selectedPhotoList[0] && (
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ファイル情報</p>
            {[
              ['シリアル番号', selectedPhotoList[0].serialNo],
              ['ファイル名', selectedPhotoList[0].name],
              ['ファイルサイズ', `${(selectedPhotoList[0].size / 1024).toFixed(0)} KB`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center">
                <span className="text-xs text-slate-500">{k}</span>
                <span className="mono text-xs font-bold text-slate-700">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 px-4 py-3 flex items-center gap-2 bg-slate-50 no-print flex-shrink-0">
        <div className="autosave-dot flex-shrink-0" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">XML 自動保存: 有効</span>
        <span className="ml-auto mono text-[10px] text-slate-300">{STANDARDS[selectedStandard]?.dtdName}</span>
      </div>
    </aside>
  );
};

const Section: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</span>
      {subtitle && <span className="text-[9px] text-slate-400">{subtitle}</span>}
    </div>
    {children}
  </div>
);

const FlagButton: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string; activeColor: string }> = ({
  active,
  onClick,
  icon,
  label,
  activeColor,
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all font-bold text-[11px] ${
      active ? activeColor + ' shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
    }`}
  >
    <Ic k={icon} size={22} fill={active && icon === 'star' ? 'currentColor' : 'none'} />
    {label}
  </button>
);
