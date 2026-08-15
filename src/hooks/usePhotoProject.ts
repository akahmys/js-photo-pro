import Encoding from 'encoding-japanese';
import { useCallback, useEffect, useRef, useState } from 'react';
import { STANDARDS } from '../constants/standards';
import type { Photo } from '../types';
import {
  buildXmlMapFromNodes,
  findDiscipline,
  getPhotoDir,
  readExifDate,
  readPhotoXmlNodes,
  saveDtdToFolder,
  saveXmlToDir,
  toSerial,
} from '../utils/fileSystem';
import { usePhotoBatchOperations } from './usePhotoBatchOperations';
import { usePhotoFilter } from './usePhotoFilter';
import { usePhotoSelection } from './usePhotoSelection';

export function usePhotoProject() {
  const [mode, setMode] = useState<'welcome' | 'select_std' | 'main'>('welcome');
  const [selectedStandard, setSelectedStandard] = useState<string | null>(null);
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [tempHandle, setTempHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [standardSelectMode, setStandardSelectMode] = useState<'new' | 'existing' | null>(null);
  const [isChangeStdModalOpen, setIsChangeStdModalOpen] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);

  // テキスト入力の一時保管 (型安全化)
  const [editDraft, setEditDraft] = useState<Partial<Photo>>({});

  const [isProcessing, setIsProcessing] = useState(false);
  const [processMsg, setProcessMsg] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const isSavingRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  // 1. フィルタ & ページネーション管理 Hook
  const filterState = usePhotoFilter(photos);

  // 2. 選択 & D&D並び替え Hook
  const selectionState = usePhotoSelection({
    photos,
    setPhotos,
    filteredPhotos: filterState.filteredPhotos,
    paginatedPhotos: filterState.paginatedPhotos,
    currentPage: filterState.currentPage,
    totalPages: filterState.totalPages,
    setCurrentPage: filterState.setCurrentPage,
  });

  // 3. バッチ操作 Hook (リネーム, 結合, 削除, D&D取り込み)
  const batchOps = usePhotoBatchOperations({
    photos,
    setPhotos,
    selectedIds: selectionState.selectedIds,
    setSelectedIds: selectionState.setSelectedIds,
    rootHandle,
    selectedStandard,
    setIsProcessing,
    setProcessMsg,
    showToast,
  });

  // オートセーブ処理
  const autoSave = useCallback(
    (currentPhotos: Photo[], handle: FileSystemDirectoryHandle, stdId: string) => {
      if (!handle || !stdId) return;
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        while (isSavingRef.current) await new Promise((r) => setTimeout(r, 80));
        isSavingRef.current = true;
        try {
          await saveXmlToDir(currentPhotos, handle, stdId);
        } catch (e) {
          console.error('AutoSave failed:', e);
        } finally {
          isSavingRef.current = false;
        }
      });
    },
    [],
  );

  useEffect(() => {
    if (rootHandle && selectedStandard && photos.length >= 0) {
      const t = setTimeout(() => autoSave(photos, rootHandle, selectedStandard), 1200);
      return () => clearTimeout(t);
    }
  }, [photos, rootHandle, selectedStandard, autoSave]);

  useEffect(() => {
    setEditDraft({});
  }, []);

  const loadFolder = async (handle: FileSystemDirectoryHandle, stdId: string) => {
    setIsProcessing(true);
    setProcessMsg('フォルダを読み込み中...');
    selectionState.setSelectedIds(new Set());
    selectionState.setLastSelectedId(null);
    try {
      const std = STANDARDS[stdId];
      const photoDir =
        handle.name === std.photoFolder
          ? handle
          : await handle.getDirectoryHandle(std.photoFolder, { create: false }).catch(() => handle);

      await saveDtdToFolder(photoDir, stdId);
      const picDir = await photoDir.getDirectoryHandle(std.picFolder, { create: true });
      await photoDir.getDirectoryHandle(std.drawfFolder, { create: true });

      let xmlMap: Record<string, Partial<Photo>> = {};
      let legacyFormatDetected = false;
      try {
        const { decoded, nodes } = await readPhotoXmlNodes(photoDir);
        if (/<photo[\s>]/i.test(decoded) && !/<photodata/i.test(decoded)) {
          legacyFormatDetected = true;
        }
        if (
          decoded.includes('下水道工事200603') ||
          decoded.includes('下水道工事R06') ||
          (decoded.includes('土木201603') && decoded.includes('P000'))
        ) {
          legacyFormatDetected = true;
        }
        if (/><シリアル番号>P\d{7}<\/シリアル番号>/.test(decoded)) legacyFormatDetected = true;
        if (/><撮影年月日>\d{8}<\/撮影年月日>/.test(decoded)) legacyFormatDetected = true;
        xmlMap = buildXmlMapFromNodes(nodes) as Record<string, Partial<Photo>>;
      } catch (e) {
        console.warn('PHOTO.XML read failed or not found, using empty map:', e);
      }

      const found: Photo[] = [];
      for await (const entry of picDir.values()) {
        if (entry.kind !== 'file' || !std.acceptExt.test(entry.name)) continue;
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        const x = xmlMap[entry.name.toUpperCase()] || {};

        const sDate = x.shootingDate || (await readExifDate(file));

        found.push({
          id: `${entry.name}_${file.size}`,
          name: entry.name,
          handle: fileHandle,
          file,
          size: file.size,
          serialNo: x.serialNo || toSerial(found.length + 1),
          category: x.category || '施工状況写真',
          workType: x.workType || '',
          type: x.type || '',
          subdivision: x.subdivision || '',
          discipline: findDiscipline(x.workType || ''),
          title: x.title || '',
          shootingDate: sDate,
          isRepresentative: x.isRepresentative || false,
          isFrequency: x.isFrequency || false,
          referenceFileName: x.referenceFileName || '',
          referenceTitle: x.referenceTitle || '',
        });
      }
      found.sort((a, b) => (parseInt(a.serialNo, 10) || 0) - (parseInt(b.serialNo, 10) || 0));
      setPhotos(found);
      setRootHandle(handle);
      setSelectedStandard(stdId);
      filterState.setCurrentPage(1);
      setMode('main');
      showToast(
        legacyFormatDetected
          ? `${found.length}枚を読み込みました（次回保存時に正式形式へ変換）`
          : `${found.length}枚の写真を読み込みました`,
        'success',
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`読み込みに失敗しました: ${msg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenFolder = async () => {
    try {
      const h = await window.showDirectoryPicker({ mode: 'readwrite' });
      let autoStd: string | null = null;
      try {
        const pDir = h.name === 'PHOTO' ? h : await h.getDirectoryHandle('PHOTO');
        const f = await (await pDir.getFileHandle('PHOTO.XML')).getFile();
        const buf = await f.arrayBuffer();
        const d = Encoding.codeToString(Encoding.convert(new Uint8Array(buf), 'UNICODE', 'AUTO'));
        if (d.includes('202303')) autoStd = 'R06';
        else if (d.includes('201603') || d.includes('202003') || d.includes('PHOTO05')) {
          autoStd = 'H30';
        }
      } catch {
        // XMLがない場合等は手動選択へ
      }
      if (autoStd) {
        await loadFolder(h, autoStd);
      } else {
        setTempHandle(h);
        setStandardSelectMode('existing');
        setMode('select_std');
      }
    } catch {
      // ユーザーキャンセル等
    }
  };

  const handleNewProject = async () => {
    try {
      const h = await window.showDirectoryPicker({ mode: 'readwrite' });
      setTempHandle(h);
      setStandardSelectMode('new');
      setMode('select_std');
    } catch {
      // ユーザーキャンセル等
    }
  };

  const handleStandardChosen = async (stdId: string) => {
    if (!tempHandle) return;
    if (standardSelectMode === 'new') {
      setIsProcessing(true);
      setProcessMsg('プロジェクト構造を作成中...');
      try {
        const std = STANDARDS[stdId];
        const pDir = await tempHandle.getDirectoryHandle(std.photoFolder, { create: true });
        await pDir.getDirectoryHandle(std.picFolder, { create: true });
        await pDir.getDirectoryHandle(std.drawfFolder, { create: true });
        await saveDtdToFolder(pDir, stdId);
        setPhotos([]);
        setRootHandle(tempHandle);
        setSelectedStandard(stdId);
        filterState.setCurrentPage(1);
        setMode('main');
        await saveXmlToDir([], tempHandle, stdId);
        showToast('新規プロジェクトを作成しました', 'success');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        showToast(`作成に失敗: ${msg}`, 'error');
      } finally {
        setIsProcessing(false);
      }
    } else {
      await loadFolder(tempHandle, stdId);
    }
  };

  const handleStandardChange = async (newStdId: string) => {
    if (!rootHandle) return;
    setIsProcessing(true);
    setProcessMsg('基準を切り替え中...');
    try {
      setSelectedStandard(newStdId);
      const std = STANDARDS[newStdId];
      const photoDir = await getPhotoDir(rootHandle, std);
      await saveDtdToFolder(photoDir, newStdId);
      await saveXmlToDir(photos, rootHandle, newStdId);
      showToast(`基準を ${std.label} に変更しました`, 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`基準の変更に失敗: ${msg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseProject = () => {
    if (confirm('プロジェクトを閉じますか？\n未保存の変更がある場合は自動的に保存されています。')) {
      setMode('welcome');
      setRootHandle(null);
      setSelectedStandard(null);
      setPhotos([]);
      selectionState.setSelectedIds(new Set());
      setEditDraft({});
    }
  };

  const handleSelectReferenceFile = async () => {
    if (!selectedStandard || !rootHandle || !selectionState.selectedIds.size) return;
    try {
      const [fh] = await window.showOpenFilePicker({
        types: [
          {
            description: '参考図ファイル',
            accept: {
              'application/pdf': ['.pdf'],
              'image/jpeg': ['.jpg', '.jpeg'],
              'image/png': ['.png'],
            },
          },
        ],
      });
      if (!fh) return;
      setIsProcessing(true);
      setProcessMsg('参考図をコピー中...');
      const std = STANDARDS[selectedStandard];
      const photoDir = await getPhotoDir(rootHandle, std);
      const drawfDir = await photoDir.getDirectoryHandle(std.drawfFolder, { create: true });
      const f = await fh.getFile();

      const existingRefNames = new Set(photos.map((p) => p.referenceFileName).filter(Boolean));
      let targetName = fh.name;
      if (!existingRefNames.has(targetName)) {
        let maxRefNum = 0;
        existingRefNames.forEach((n) => {
          const m = n.match(/^D(\d{7})\./i);
          if (m) maxRefNum = Math.max(maxRefNum, parseInt(m[1], 10));
        });
        const ext = fh.name.includes('.') ? fh.name.substring(fh.name.lastIndexOf('.')) : '';
        targetName = `D${String(maxRefNum + 1).padStart(7, '0')}${ext.toUpperCase()}`;
      }

      const dfh = await drawfDir.getFileHandle(targetName, { create: true });
      const w = await dfh.createWritable();
      await w.write(f);
      await w.close();

      setPhotos((prev) =>
        prev.map((p) =>
          selectionState.selectedIds.has(p.id)
            ? {
                ...p,
                referenceFileName: targetName,
                referenceTitle: p.referenceTitle || fh.name.replace(/\.[^/.]+$/, ''),
              }
            : p,
        ),
      );
      showToast(`参考図 ${targetName} を設定しました`, 'success');
    } catch {
      // キャンセル等
    } finally {
      setIsProcessing(false);
    }
  };

  const updateField = <K extends keyof Photo>(field: K, value: Photo[K]) => {
    setPhotos((prev) =>
      prev.map((p) => (selectionState.selectedIds.has(p.id) ? { ...p, [field]: value } : p)),
    );
  };

  const getDraftVal = <K extends keyof Photo>(field: K): Photo[K] | undefined => {
    if (field in editDraft) return editDraft[field];
    const firstSelected = photos.find((p) => selectionState.selectedIds.has(p.id));
    return firstSelected ? firstSelected[field] : undefined;
  };

  const handleDraftChange = <K extends keyof Photo>(field: K, val: Photo[K]) => {
    setEditDraft((prev) => ({ ...prev, [field]: val }));
  };

  const applyDraft = <K extends keyof Photo>(field: K) => {
    if (field in editDraft) {
      updateField(field, editDraft[field] as Photo[K]);
      setEditDraft((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return {
    mode,
    setMode,
    selectedStandard,
    rootHandle,
    tempHandle,
    standardSelectMode,
    isChangeStdModalOpen,
    setIsChangeStdModalOpen,
    photos,
    setPhotos,
    selectedIds: selectionState.selectedIds,
    setSelectedIds: selectionState.setSelectedIds,
    lastSelectedId: selectionState.lastSelectedId,
    setLastSelectedId: selectionState.setLastSelectedId,
    editDraft,
    setEditDraft,
    isProcessing,
    processMsg,
    toast,
    previewPhoto,
    setPreviewPhoto,
    isDragOver,
    setIsDragOver,
    draggedId: selectionState.draggedId,
    setDraggedId: selectionState.setDraggedId,
    fCategory: filterState.fCategory,
    setFCategory: filterState.setFCategory,
    fWorkType: filterState.fWorkType,
    setFWorkType: filterState.setFWorkType,
    fType: filterState.fType,
    setFType: filterState.setFType,
    fSubdivision: filterState.fSubdivision,
    setFSubdivision: filterState.setFSubdivision,
    fErr: filterState.fErr,
    setFErr: filterState.setFErr,
    currentPage: filterState.currentPage,
    setCurrentPage: filterState.setCurrentPage,
    filteredPhotos: filterState.filteredPhotos,
    paginatedPhotos: filterState.paginatedPhotos,
    errorCount: filterState.errorCount,
    totalPages: filterState.totalPages,
    showToast,
    loadFolder,
    handleOpenFolder,
    handleNewProject,
    handleStandardChosen,
    handleStandardChange,
    handleCloseProject,
    processDropFiles: batchOps.processDropFiles,
    handleDelete: batchOps.handleDelete,
    handleRename: batchOps.handleRename,
    handleMerge: batchOps.handleMerge,
    handleSelectReferenceFile,
    handlePhotoClick: selectionState.handlePhotoClick,
    handleCardDragStart: selectionState.handleCardDragStart,
    handleCardDragOver: selectionState.handleCardDragOver,
    handleCardDrop: selectionState.handleCardDrop,
    handlePageDragOver: selectionState.handlePageDragOver,
    handlePageDragLeave: selectionState.handlePageDragLeave,
    updateField,
    getDraftVal,
    handleDraftChange,
    applyDraft,
  };
}
