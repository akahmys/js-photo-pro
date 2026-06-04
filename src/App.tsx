import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Photo } from './types';
import { STANDARDS } from './constants/standards';
import { PHOTO_CATEGORIES } from './constants/workMaster';
import { validatePhoto } from './utils/validation';
import {
  makeFileName,
  parseFileNum,
  readExifDate,
  findDiscipline,
  getPhotoDir,
  buildXmlMapFromNodes,
  readPhotoXmlNodes,
  saveXmlToDir,
  saveDtdToFolder,
  executeChunked,
  toSerial,
} from './utils/fileSystem';
import { Ic } from './components/Icons';
import { LazyImage } from './components/LazyImage';
import { DetailPanel } from './components/DetailPanel';
import { PrintLedger } from './components/LedgerPrint';
import Encoding from 'encoding-japanese';

const ITEMS_PER_PAGE = 100;

export default function App() {
  const [mode, setMode] = useState<'welcome' | 'select_std' | 'main'>('welcome');
  const [selectedStandard, setSelectedStandard] = useState<string | null>(null);
  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [tempHandle, setTempHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [standardSelectMode, setStandardSelectMode] = useState<'new' | 'existing' | null>(null);
  const [isChangeStdModalOpen, setIsChangeStdModalOpen] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // テキスト入力の一時保管
  const [editDraft, setEditDraft] = useState<Partial<Record<keyof Photo, any>>>({});

  const [isProcessing, setIsProcessing] = useState(false);
  const [processMsg, setProcessMsg] = useState("");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [fCategory, setFCategory] = useState("");
  const [fWorkType, setFWorkType] = useState("");
  const [fType, setFType] = useState("");
  const [fSubdivision, setFSubdivision] = useState("");
  const [fErr, setFErr] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const pageChangeTimerRef = useRef<number | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const isSavingRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  };

  const autoSave = useCallback((currentPhotos: Photo[], handle: FileSystemDirectoryHandle, stdId: string) => {
    if (!handle || !stdId) return;
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      while (isSavingRef.current) await new Promise(r => setTimeout(r, 80));
      isSavingRef.current = true;
      try {
        await saveXmlToDir(currentPhotos, handle, stdId);
      } catch (e) {
        console.error("AutoSave failed:", e);
      } finally {
        isSavingRef.current = false;
      }
    });
  }, []);

  useEffect(() => {
    if (rootHandle && selectedStandard && photos.length >= 0) {
      const t = setTimeout(() => autoSave(photos, rootHandle, selectedStandard), 1200);
      return () => clearTimeout(t);
    }
  }, [photos, rootHandle, selectedStandard, autoSave]);

  useEffect(() => {
    setEditDraft({});
  }, [selectedIds]);

  const loadFolder = async (handle: FileSystemDirectoryHandle, stdId: string) => {
    setIsProcessing(true);
    setProcessMsg("フォルダを読み込み中...");
    setSelectedIds(new Set());
    setLastSelectedId(null);
    try {
      const std = STANDARDS[stdId];
      let photoDir = handle.name === std.photoFolder
        ? handle
        : await handle.getDirectoryHandle(std.photoFolder, { create: false }).catch(() => handle);

      await saveDtdToFolder(photoDir, stdId);
      const picDir = await photoDir.getDirectoryHandle(std.picFolder, { create: true });
      await photoDir.getDirectoryHandle(std.drawfFolder, { create: true });

      let xmlMap: Record<string, Partial<Photo>> = {};
      let legacyFormatDetected = false;
      try {
        const { decoded, nodes } = await readPhotoXmlNodes(photoDir);
        if (/<photo[\s>]/i.test(decoded) && !/<photodata/i.test(decoded)) legacyFormatDetected = true;
        if (decoded.includes("下水道工事200603") || decoded.includes("下水道工事R06") ||
            (decoded.includes("土木201603") && decoded.includes("P000"))) legacyFormatDetected = true;
        if (/><シリアル番号>P\d{7}<\/シリアル番号>/.test(decoded)) legacyFormatDetected = true;
        if (/><撮影年月日>\d{8}<\/撮影年月日>/.test(decoded)) legacyFormatDetected = true;
        xmlMap = buildXmlMapFromNodes(nodes) as Record<string, Partial<Photo>>;
      } catch (e) {
        console.warn("PHOTO.XML read failed or not found, using empty map:", e);
      }

      const found: Photo[] = [];
      for await (const entry of picDir.values()) {
        if (entry.kind !== 'file' || !std.acceptExt.test(entry.name)) continue;
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        const x = xmlMap[entry.name.toUpperCase()] || {};

        const sDate = x.shootingDate || await readExifDate(file);

        found.push({
          id: entry.name + '_' + file.size,
          name: entry.name,
          handle: fileHandle,
          file,
          size: file.size,
          serialNo: x.serialNo || toSerial(found.length + 1),
          category: x.category || "施工状況写真",
          workType: x.workType || "",
          type: x.type || "",
          subdivision: x.subdivision || "",
          discipline: findDiscipline(x.workType || ""),
          title: x.title || "",
          shootingDate: sDate,
          isRepresentative: x.isRepresentative || false,
          isFrequency: x.isFrequency || false,
          referenceFileName: x.referenceFileName || "",
          referenceTitle: x.referenceTitle || "",
        });
      }
      found.sort((a, b) => (parseInt(a.serialNo) || 0) - (parseInt(b.serialNo) || 0));
      setPhotos(found);
      setRootHandle(handle);
      setSelectedStandard(stdId);
      setCurrentPage(1);
      setMode('main');
      showToast(
        legacyFormatDetected
          ? `${found.length}枚を読み込みました（次回保存時に正式形式へ変換）`
          : `${found.length}枚の写真を読み込みました`,
        'success'
      );
    } catch (e: any) {
      console.error(e);
      showToast("読み込みに失敗しました: " + e.message, 'error');
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
        if (d.includes("202303")) autoStd = "R06";
        else if (d.includes("201603") || d.includes("202003") || d.includes("PHOTO05")) autoStd = "H30";
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
      setProcessMsg("プロジェクト構造を作成中...");
      try {
        const std = STANDARDS[stdId];
        const pDir = await tempHandle.getDirectoryHandle(std.photoFolder, { create: true });
        await pDir.getDirectoryHandle(std.picFolder, { create: true });
        await pDir.getDirectoryHandle(std.drawfFolder, { create: true });
        await saveDtdToFolder(pDir, stdId);
        setPhotos([]);
        setRootHandle(tempHandle);
        setSelectedStandard(stdId);
        setCurrentPage(1);
        setMode('main');
        await saveXmlToDir([], tempHandle, stdId);
        showToast("新規プロジェクトを作成しました", 'success');
      } catch (e: any) {
        showToast("作成に失敗: " + e.message, 'error');
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
    setProcessMsg("基準を切り替え中...");
    try {
      setSelectedStandard(newStdId);
      const std = STANDARDS[newStdId];
      const photoDir = await getPhotoDir(rootHandle, std);
      await saveDtdToFolder(photoDir, newStdId);
      await saveXmlToDir(photos, rootHandle, newStdId);
      showToast(`基準を ${std.label} に変更しました`, 'success');
    } catch (e: any) {
      showToast("基準の変更に失敗: " + e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const processDropFiles = async (files: FileList) => {
    if (!rootHandle || !selectedStandard) return;
    setIsProcessing(true);
    setProcessMsg("写真を取り込み中...");
    try {
      const std = STANDARDS[selectedStandard];
      const photoDir = await getPhotoDir(rootHandle, std);
      const picDir = await photoDir.getDirectoryHandle(std.picFolder);
      const valid = Array.from(files).filter(f => std.acceptExt.test(f.name));
      if (!valid.length) {
        showToast("対応形式のファイルがありません", 'error');
        return;
      }

      const maxSerial = photos.length > 0 ? Math.max(...photos.map(p => parseInt(p.serialNo) || 0)) : 0;
      const maxNum = photos.length > 0 ? Math.max(...photos.map(p => parseFileNum(p.name))) : 0;
      const added: Photo[] = [];

      for (let i = 0; i < valid.length; i++) {
        const f = valid[i];
        const name = makeFileName(maxNum + i + 1, selectedStandard);
        const h = await picDir.getFileHandle(name, { create: true });
        const w = await h.createWritable();
        await w.write(f);
        await w.close();
        const nf = await h.getFile();

        const shootingDateStr = await readExifDate(f);
        added.push({
          id: name + '_' + f.size + '_' + Date.now(),
          name,
          handle: h,
          file: nf,
          size: f.size,
          serialNo: toSerial(maxSerial + i + 1),
          category: "施工状況写真",
          workType: "",
          type: "",
          subdivision: "",
          discipline: "",
          title: "",
          shootingDate: shootingDateStr,
          isRepresentative: false,
          isFrequency: false,
          referenceFileName: "",
          referenceTitle: "",
        });
      }
      setPhotos(p => [...p, ...added]);
      showToast(`${added.length}枚を追加しました`, 'success');
    } catch (e: any) {
      showToast("取込み失敗: " + e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedIds.size || !selectedStandard || !rootHandle) return;
    if (!confirm(`選択した ${selectedIds.size} 枚の写真を完全に削除しますか？\nこの操作は元に戻せません。`)) return;
    setIsProcessing(true);
    setProcessMsg("削除中...");
    try {
      const std = STANDARDS[selectedStandard];
      const photoDir = await getPhotoDir(rootHandle, std);
      const picDir = await photoDir.getDirectoryHandle(std.picFolder);
      for (const id of selectedIds) {
        const p = photos.find(x => x.id === id);
        if (p) {
          try {
            await picDir.removeEntry(p.name);
          } catch {
            // すでにない場合など
          }
        }
      }
      const next = photos.filter(x => !selectedIds.has(x.id)).map((p, i) => ({ ...p, serialNo: toSerial(i + 1) }));
      setPhotos(next);
      setSelectedIds(new Set());
      showToast(`${selectedIds.size}枚を削除しました`, 'success');
    } catch (e: any) {
      showToast("削除失敗: " + e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRename = async () => {
    if (!selectedStandard || !rootHandle) return;
    if (!confirm(`表示順に従ってファイル名を ${makeFileName(1, selectedStandard)} 形式で再構成します。\n実際のファイルが書き換えられます。続けますか？`)) return;
    setIsProcessing(true);
    setProcessMsg("リネーム中...");
    try {
      const std = STANDARDS[selectedStandard];
      const photoDir = await getPhotoDir(rootHandle, std);
      const picDir = await photoDir.getDirectoryHandle(std.picFolder);
      const drawfDir = await photoDir.getDirectoryHandle(std.drawfFolder).catch(() => null);
      const nList = [...photos];
      
      // FileSystemFileHandle の move APIが使用可能か判定
      const hasMove = 'move' in FileSystemFileHandle.prototype;

      const refFinalMap = new Map<string, string>();
      const refTasks: { oldName: string; tmpName: string; finalName: string }[] = [];
      if (drawfDir) {
        const uniqueRefs = [...new Set(nList.map(p => p.referenceFileName).filter(Boolean))];
        let refCounter = 1;
        for (let i = 0; i < uniqueRefs.length; i++) {
          const oldName = uniqueRefs[i];
          const ext = oldName.includes('.') ? oldName.substring(oldName.lastIndexOf('.')) : '';
          const finalName = `D${String(refCounter).padStart(7, '0')}${ext.toUpperCase()}`;
          refFinalMap.set(oldName, finalName);
          refCounter++;
          if (oldName !== finalName) {
            refTasks.push({
              oldName,
              tmpName: `_tmp_ref_${Date.now()}_${i}${ext}`,
              finalName,
            });
          }
        }
      }

      const photoTasks: { index: number; oldName: string; tmpName: string; finalName: string; handle: FileSystemFileHandle }[] = [];
      for (let i = 0; i < nList.length; i++) {
        if (nList[i].referenceFileName && refFinalMap.has(nList[i].referenceFileName)) {
          nList[i].referenceFileName = refFinalMap.get(nList[i].referenceFileName)!;
        }
        const finalName = makeFileName(i + 1, selectedStandard);
        if (nList[i].name !== finalName) {
          photoTasks.push({
            index: i,
            oldName: nList[i].name,
            tmpName: `_tmp_p_${Date.now()}_${i}.jpg`,
            finalName,
            handle: nList[i].handle,
          });
        } else {
          nList[i].serialNo = toSerial(i + 1);
        }
      }

      if (refTasks.length === 0 && photoTasks.length === 0) {
        setIsProcessing(false);
        showToast("すべてのファイル名が既に最適な状態です（スキップ）", 'success');
        return;
      }

      if (drawfDir && refTasks.length > 0) {
        await executeChunked(refTasks, async (task) => {
          try {
            const fh = await drawfDir.getFileHandle(task.oldName);
            if (hasMove) {
              await (fh as any).move(task.tmpName);
            } else {
              const f = await fh.getFile();
              const th = await drawfDir.getFileHandle(task.tmpName, { create: true });
              const w = await th.createWritable();
              await w.write(f);
              await w.close();
              await drawfDir.removeEntry(task.oldName);
            }
          } catch (e) {
            console.error(e);
          }
        });
        await executeChunked(refTasks, async (task) => {
          try {
            const th = await drawfDir.getFileHandle(task.tmpName);
            if (hasMove) {
              await (th as any).move(task.finalName);
            } else {
              const f = await th.getFile();
              const fh = await drawfDir.getFileHandle(task.finalName, { create: true });
              const w = await fh.createWritable();
              await w.write(f);
              await w.close();
              await drawfDir.removeEntry(task.tmpName);
            }
          } catch (e) {
            console.error(e);
          }
        });
      }

      if (photoTasks.length > 0) {
        await executeChunked(photoTasks, async (task) => {
          if (hasMove) {
            await (task.handle as any).move(task.tmpName);
          } else {
            const f = await task.handle.getFile();
            const th = await picDir.getFileHandle(task.tmpName, { create: true });
            const w = await th.createWritable();
            await w.write(f);
            await w.close();
            await picDir.removeEntry(task.oldName);
            task.handle = th;
          }
        });
        await executeChunked(photoTasks, async (task) => {
          let finalHandle: FileSystemFileHandle;
          if (hasMove) {
            await (task.handle as any).move(task.finalName);
            finalHandle = task.handle;
          } else {
            const f = await task.handle.getFile();
            finalHandle = await picDir.getFileHandle(task.finalName, { create: true });
            const w = await finalHandle.createWritable();
            await w.write(f);
            await w.close();
            await picDir.removeEntry(task.tmpName);
          }
          const pItem = nList[task.index];
          pItem.name = task.finalName;
          pItem.serialNo = toSerial(task.index + 1);
          pItem.handle = finalHandle;
          pItem.file = await finalHandle.getFile();
          pItem.id = task.finalName + '_' + pItem.file.size;
        });
      }
      setPhotos(nList);
      setSelectedIds(new Set());
      showToast("リネーム完了", 'success');
    } catch (e: any) {
      showToast("リネーム失敗: " + e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMerge = async () => {
    if (!selectedStandard || !rootHandle) return;
    try {
      const srcHandle = await window.showDirectoryPicker();
      setIsProcessing(true);
      setProcessMsg("プロジェクトを結合中...");
      const std = STANDARDS[selectedStandard];
      let srcPhotoDir: FileSystemDirectoryHandle;
      try {
        srcPhotoDir = srcHandle.name === std.photoFolder
          ? srcHandle
          : await srcHandle.getDirectoryHandle(std.photoFolder);
      } catch {
        srcPhotoDir = srcHandle;
      }
      const srcPicDir = await srcPhotoDir.getDirectoryHandle(std.picFolder);

      let srcXmlMap: Record<string, Partial<Photo>> = {};
      try {
        const { nodes } = await readPhotoXmlNodes(srcPhotoDir);
        srcXmlMap = buildXmlMapFromNodes(nodes) as Record<string, Partial<Photo>>;
      } catch {
        // パース失敗時も続行
      }

      const photoDir = await getPhotoDir(rootHandle, std);
      const destPicDir = await photoDir.getDirectoryHandle(std.picFolder);
      const maxNum = photos.length > 0 ? Math.max(...photos.map(p => parseFileNum(p.name))) : 0;
      const maxSerial = photos.length > 0 ? Math.max(...photos.map(p => parseInt(p.serialNo) || 0)) : 0;
      const existingSizes = new Set(photos.map(p => p.size));
      const pendingFiles: { entry: FileSystemFileHandle; file: File; originalSerial: number; xmlData: Partial<Photo> }[] = [];

      for await (const entry of srcPicDir.values()) {
        if (entry.kind !== 'file' || !std.acceptExt.test(entry.name)) continue;
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        if (existingSizes.has(file.size)) continue;
        const x = srcXmlMap[entry.name.toUpperCase()] || {};
        pendingFiles.push({
          entry: fileHandle,
          file,
          originalSerial: parseInt(x.serialNo || "") || 9999999,
          xmlData: x,
        });
      }
      pendingFiles.sort((a, b) => a.originalSerial - b.originalSerial);

      const newPhotos: Photo[] = [];
      const CONCURRENCY_LIMIT = 15;
      for (let i = 0; i < pendingFiles.length; i += CONCURRENCY_LIMIT) {
        const chunk = pendingFiles.slice(i, i + CONCURRENCY_LIMIT);
        const results = await Promise.all(chunk.map(async (item, idx) => {
          const globalIndex = i + idx;
          const name = makeFileName(maxNum + globalIndex + 1, selectedStandard);
          const th = await destPicDir.getFileHandle(name, { create: true });
          const w = await th.createWritable();
          await w.write(item.file);
          await w.close();
          const nf = await th.getFile();
          const x = item.xmlData;

          const sDate = x.shootingDate || await readExifDate(item.file);

          return {
            id: name + '_' + nf.size + '_' + Date.now(),
            name,
            handle: th,
            file: nf,
            size: nf.size,
            serialNo: toSerial(maxSerial + globalIndex + 1),
            category: x.category || "施工状況写真",
            workType: x.workType || "",
            type: x.type || "",
            subdivision: x.subdivision || "",
            discipline: findDiscipline(x.workType || ""),
            title: x.title || "",
            shootingDate: sDate,
            isRepresentative: x.isRepresentative || false,
            isFrequency: x.isFrequency || false,
            referenceFileName: x.referenceFileName || "",
            referenceTitle: x.referenceTitle || "",
          };
        }));
        newPhotos.push(...results);
      }

      if (newPhotos.length === 0) {
        showToast("追加できる新しい写真がありませんでした", 'success');
      } else {
        setPhotos(p => [...p, ...newPhotos]);
        showToast(`${newPhotos.length}枚の写真を結合しました`, 'success');
      }
    } catch (e: any) {
      showToast("結合失敗: " + e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectReferenceFile = async () => {
    if (!selectedStandard || !rootHandle || selectedIds.size !== 1) return;
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: '参考図ファイル (PDF/画像等)',
          accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png', '.tiff'] }
        }]
      });
      setIsProcessing(true);
      setProcessMsg("参考図を登録中...");
      
      const std = STANDARDS[selectedStandard];
      const photoDir = await getPhotoDir(rootHandle, std);
      const drawfDir = await photoDir.getDirectoryHandle(std.drawfFolder, { create: true });
      const file = await fileHandle.getFile();
      
      // 重複しないテンポラリ/仮ファイル名を設定
      const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
      const destName = `REF_${Date.now()}${ext.toUpperCase()}`;
      
      const dh = await drawfDir.getFileHandle(destName, { create: true });
      const w = await dh.createWritable();
      await w.write(file);
      await w.close();

      setPhotos(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, referenceFileName: destName } : p));
      showToast("参考図ファイルを登録しました", 'success');
    } catch {
      // キャンセル時
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePageDragOver = (e: React.DragEvent, dir: 'prev' | 'next') => {
    e.preventDefault();
    if (!pageChangeTimerRef.current) {
      pageChangeTimerRef.current = setTimeout(() => {
        setCurrentPage(p => dir === 'prev' ? Math.max(1, p - 1) : Math.min(totalPages, p + 1));
        pageChangeTimerRef.current = null;
      }, 1000);
    }
  };

  const handlePageDragLeave = () => {
    if (pageChangeTimerRef.current) {
      clearTimeout(pageChangeTimerRef.current);
      pageChangeTimerRef.current = null;
    }
  };

  const isMatch = (itemVal: string, filterVal: string) => {
    if (!filterVal) return true;
    if (filterVal === '__EMPTY__') return !itemVal;
    return itemVal === filterVal;
  };

  const filteredPhotos = useMemo(() => photos.filter(p => {
    if (!isMatch(p.category, fCategory)) return false;
    if (!isMatch(p.workType, fWorkType)) return false;
    if (!isMatch(p.type, fType)) return false;
    if (!isMatch(p.subdivision, fSubdivision)) return false;
    if (fErr && validatePhoto(p).length === 0) return false;
    return true;
  }), [photos, fCategory, fWorkType, fType, fSubdivision, fErr]);

  useEffect(() => {
    setCurrentPage(1);
  }, [fCategory, fWorkType, fType, fSubdivision, fErr]);

  const totalPages = Math.max(1, Math.ceil(filteredPhotos.length / ITEMS_PER_PAGE));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginatedPhotos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPhotos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPhotos, currentPage]);

  const handlePhotoClick = (e: React.MouseEvent, id: string) => {
    const next = new Set(selectedIds);
    if (e.shiftKey && lastSelectedId) {
      const a = paginatedPhotos.findIndex(p => p.id === lastSelectedId);
      const b = paginatedPhotos.findIndex(p => p.id === id);
      if (a !== -1 && b !== -1) {
        const [s, end] = a < b ? [a, b] : [b, a];
        paginatedPhotos.slice(s, end + 1).forEach(p => next.add(p.id));
      } else {
        next.add(id);
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setLastSelectedId(id);
    } else {
      next.clear();
      next.add(id);
      setLastSelectedId(id);
    }
    setSelectedIds(next);
  };

  const updateField = (field: keyof Photo, value: any) => {
    setPhotos(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, [field]: value } : p));
  };

  const commonVal = (field: keyof Photo) => {
    const sel = photos.filter(p => selectedIds.has(p.id));
    if (!sel.length) return "";
    const first = sel[0][field];
    return sel.every(p => p[field] === first) ? (first ?? "") : "MIXED";
  };

  const getDraftVal = (field: keyof Photo) => {
    return editDraft[field] !== undefined ? editDraft[field] : commonVal(field);
  };

  const handleDraftChange = (field: keyof Photo, val: any) => {
    setEditDraft(prev => ({ ...prev, [field]: val }));
  };

  const applyDraft = (field: keyof Photo) => {
    if (editDraft[field] === undefined) return;
    setPhotos(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, [field]: editDraft[field] } : p));
    setEditDraft(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const errorCount = useMemo(() => photos.filter(p => validatePhoto(p).length > 0).length, [photos]);

  const renderPaginationControls = (extraClass = "") => {
    if (totalPages <= 1) return null;
    return (
      <div className={`flex items-center justify-center gap-4 w-full no-print ${extraClass}`}>
        <button
          className={`btn ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'btn-ghost'}`}
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          onDragOver={e => handlePageDragOver(e, 'prev')}
          onDragLeave={handlePageDragLeave}
          onDrop={handlePageDragLeave}
        >
          <Ic k="chevronLeft" size={16} /> 前の100件
        </button>
        <div className="text-sm font-bold text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          {currentPage} <span className="text-slate-400 font-normal mx-1">/</span> {totalPages} ページ
        </div>
        <button
          className={`btn ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'btn-ghost'}`}
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          onDragOver={e => handlePageDragOver(e, 'next')}
          onDragLeave={handlePageDragLeave}
          onDrop={handlePageDragLeave}
        >
          次の100件 <Ic k="chevronRight" size={16} />
        </button>
      </div>
    );
  };

  if (mode === 'welcome' || mode === 'select_std') {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#001d4a] to-[#003580]">
        {isProcessing && <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center no-print"><div className="spinner mb-4" /><span className="text-white text-sm font-bold tracking-widest uppercase">{processMsg}</span></div>}
        <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-lg mx-4 anim-fadeup">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-[#002d6e] rounded-xl p-3"><Ic k="camera" size={28} cls="text-white" /></div>
            <div>
              <h1 className="text-xl font-black text-[#002d6e] tracking-tight">JS PHOTO PRO</h1>
              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">v3.11.1 — 日本下水道事業団 電子納品対応</p>
            </div>
          </div>
          {mode === 'welcome' && (
            <>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed">JS工事記録写真電子管理要領に完全準拠した写真管理・PHOTO.XML生成ツールです。<br />写真データはすべてローカルフォルダに直接保存されます。</p>
              <div className="space-y-3">
                <button className="btn btn-blue w-full py-3 text-sm justify-center" onClick={handleOpenFolder}><Ic k="folderOpen" size={18} /> 既存フォルダを開く</button>
                <button className="btn btn-ghost w-full py-3 text-sm justify-center" onClick={handleNewProject}><Ic k="plus" size={18} /> 新規プロジェクト作成</button>
              </div>
              <div className="mt-8 bg-blue-50 rounded-xl p-4 text-xs text-blue-700 font-medium leading-relaxed border border-blue-100">
                <strong className="font-bold">基準の選択について</strong><br />
                ・<span className="text-orange-600 font-bold">H30年度基準</span>：H30.4.1 〜 R6.3.31 契約分<br />
                ・<span className="text-blue-600 font-bold">R6年度基準</span>：R6.4.1 以降 契約分<br />
                既存フォルダはPHOTO.XMLの内容から自動判定します。
              </div>
            </>
          )}
          {mode === 'select_std' && (
            <>
              <p className="text-sm font-bold text-slate-600 mb-5">{standardSelectMode === 'new' ? "新規プロジェクトの基準を選択" : "適用する基準を選択してください"}</p>
              <div className="space-y-3">
                {Object.values(STANDARDS).map(s => (
                  <button key={s.id} className="w-full text-left p-4 border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl transition-all group" onClick={() => handleStandardChosen(s.id)}>
                    <div className="flex items-center justify-between">
                      <div><div className="font-bold text-slate-800 group-hover:text-blue-700">{s.fullLabel}</div><div className="text-xs text-slate-400 mt-1">{s.period}</div><div className="text-[10px] font-mono text-slate-400 mt-0.5">{s.versionTag}</div></div>
                      <span className={`badge ${s.color} text-[10px]`}>{s.dtdName}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button className="text-xs text-slate-400 mt-6 underline block mx-auto" onClick={() => setMode('welcome')}>← 戻る</button>
            </>
          )}
        </div>
      </div>
    );
  }

  const activeStd = selectedStandard ? STANDARDS[selectedStandard] : null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {isProcessing && <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center no-print"><div className="spinner mb-4" /><span className="text-white text-sm font-bold tracking-widest uppercase">{processMsg}</span></div>}
      {isDragOver && <div className="drop-overlay"><div className="bg-white p-12 rounded-2xl shadow-2xl text-center"><Ic k="upload" size={48} cls="text-blue-600 mx-auto mb-4" /><p className="font-bold text-slate-700">写真をドロップ</p></div></div>}

      {isChangeStdModalOpen && (
        <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center no-print">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 anim-fadeup">
            <p className="text-sm font-bold text-slate-600 mb-5">適用する基準を選択してください</p>
            <div className="space-y-3">
              {Object.values(STANDARDS).map(s => (
                <button key={s.id} className="w-full text-left p-4 border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl transition-all group" onClick={() => { handleStandardChange(s.id); setIsChangeStdModalOpen(false); }}>
                  <div className="flex items-center justify-between">
                    <div><div className="font-bold text-slate-800 group-hover:text-blue-700">{s.fullLabel}</div><div className="text-xs text-slate-400 mt-1">{s.period}</div><div className="text-[10px] font-mono text-slate-400 mt-0.5">{s.versionTag}</div></div>
                    <span className={`badge ${s.color} text-[10px]`}>{s.dtdName}</span>
                  </div>
                </button>
              ))}
            </div>
            <button className="text-xs text-slate-400 mt-6 underline block mx-auto hover:text-slate-600" onClick={() => setIsChangeStdModalOpen(false)}>キャンセル</button>
          </div>
        </div>
      )}

      <header className="app-header no-print">
        <div className="flex items-center gap-3">
          <div className="bg-[#0055b3] rounded-lg p-1.5"><Ic k="camera" size={20} cls="text-white" /></div>
          <span className="font-black text-lg tracking-tight">JS PHOTO PRO</span>
          <button onClick={() => setIsChangeStdModalOpen(true)} className={`badge ${activeStd?.color} text-[11px] px-2.5 py-1 hover:opacity-80 transition-opacity ml-2 cursor-pointer`} title="適用基準を変更">
            {activeStd?.label} <span className="ml-1 text-[9px]">▼</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-warn" onClick={handleRename} data-tip="表示順でファイル名を一括連番化"><Ic k="sortNum" size={14} /> リネーム</button>
          <button className="btn btn-green" onClick={handleMerge} data-tip="他フォルダの写真を結合"><Ic k="merge" size={14} /> 結合</button>
          <button className="btn bg-white text-slate-700 hover:bg-slate-100" onClick={() => window.print()} data-tip="写真台帳を印刷・PDF保存"><Ic k="printer" size={14} cls="text-slate-600" /> 印刷</button>
          <button className="btn btn-ghost text-white border-white/20 hover:bg-white/10" onClick={() => { if (confirm("プロジェクトを閉じますか？")) { setMode('welcome'); setPhotos([]); setRootHandle(null); setSelectedStandard(null); } }}><Ic k="logOut" size={14} /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden"
        onDragOver={e => { e.preventDefault(); const hasFiles = e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files'); if (!isProcessing && hasFiles && !draggedId) setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={e => { e.preventDefault(); setIsDragOver(false); if (!draggedId && e.dataTransfer.files.length) processDropFiles(e.dataTransfer.files); }}>

        <main className="flex-1 flex flex-col overflow-hidden bg-slate-100">
          <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center gap-4 flex-shrink-0 no-print overflow-x-auto no-sb">
            <div className="flex items-center gap-2 mr-2 flex-shrink-0"><Ic k="folder" size={18} cls="text-blue-500" /><span className="text-base font-bold text-slate-700">{rootHandle?.name}</span><span className="badge badge-blue text-[10px] ml-1">{filteredPhotos.length}/{photos.length}枚</span></div>
            <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
            <Ic k="filter" size={14} cls="text-slate-400 flex-shrink-0" />
            
            <select value={fCategory} onChange={e => setFCategory(e.target.value)} className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-pointer hover:border-blue-300 transition-colors max-w-[160px] flex-shrink-0 select-custom">
              <option value="">区分: すべて</option>
              {PHOTO_CATEGORIES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select value={fWorkType} onChange={e => setFWorkType(e.target.value)} className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-pointer hover:border-blue-300 transition-colors max-w-[160px] flex-shrink-0 select-custom">
              <option value="">工種: すべて</option>
              {[...new Set(photos.map(p => p.workType))].filter(Boolean).sort().map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select value={fType} onChange={e => setFType(e.target.value)} className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-pointer hover:border-blue-300 transition-colors max-w-[160px] flex-shrink-0 select-custom">
              <option value="">種別: すべて</option>
              {[...new Set(photos.map(p => p.type))].filter(Boolean).sort().map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <select value={fSubdivision} onChange={e => setFSubdivision(e.target.value)} className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none cursor-pointer hover:border-blue-300 transition-colors max-w-[160px] flex-shrink-0 select-custom">
              <option value="">細別: すべて</option>
              {[...new Set(photos.map(p => p.subdivision))].filter(Boolean).sort().map(o => <option key={o} value={o}>{o}</option>)}
            </select>

            <button className={`btn flex-shrink-0 ${fErr ? 'btn-danger' : 'btn-ghost'}`} onClick={() => setFErr(v => !v)}>
              <Ic k="alertCircle" size={13} /> 未完了 {errorCount > 0 && <span className={`badge ${fErr ? 'bg-red-700 text-white' : 'badge-orange'}`}>{errorCount}</span>}
            </button>
            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              <button className="text-xs font-bold text-blue-600 hover:underline" onClick={() => setSelectedIds(new Set(filteredPhotos.map(p => p.id)))}>全選択</button>
              <span className="text-slate-300">|</span>
              <button className="text-xs font-bold text-slate-500 hover:underline" onClick={() => setSelectedIds(new Set())}>解除</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-24 text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-100"><Ic k="camera" size={36} cls="text-blue-400" /></div>
                <h3 className="text-lg font-bold text-slate-600 mb-2">写真がありません</h3>
                <p className="text-sm text-slate-400">JPEGファイルをここにドラッグ＆ドロップしてください</p>
              </div>
            ) : filteredPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400"><Ic k="filter" size={40} cls="mb-4 opacity-30" /><p className="font-bold">フィルタ条件に一致する写真がありません</p></div>
            ) : (
              <>
                {renderPaginationControls("mb-4")}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {paginatedPhotos.map(p => {
                    const errs = validatePhoto(p);
                    const isErr = errs.length > 0;
                    const isSel = selectedIds.has(p.id);
                    return (
                      <div key={p.id} draggable
                        onDragStart={e => { setDraggedId(p.id); e.dataTransfer.setData('text/plain', p.id); }}
                        onDragEnd={() => { setDraggedId(null); handlePageDragLeave(); }}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => {
                          e.preventDefault();
                          if (!draggedId || draggedId === p.id) return;
                          const items = [...photos];
                          const di = items.findIndex(i => i.id === draggedId);
                          const ti = items.findIndex(i => i.id === p.id);
                          const [di2] = items.splice(di, 1);
                          items.splice(ti, 0, di2);
                          setPhotos(items.map((it, i) => ({ ...it, serialNo: toSerial(i + 1) })));
                          setDraggedId(null); handlePageDragLeave();
                        }}
                        onClick={e => handlePhotoClick(e, p.id)}
                        onDoubleClick={() => setPreviewPhoto(p)}
                        className={`photo-card ${isSel ? 'selected' : ''} ${isErr && !isSel ? 'error-card' : ''}`}>
                        <div className="aspect-[4/3] relative overflow-hidden bg-slate-200 rounded-t-xl">
                          <LazyImage file={p.file} className="w-full h-full object-cover" />
                          {isErr && <div className="absolute top-2 left-2 badge badge-orange text-[9px]"><Ic k="alertCircle" size={10} /> 要修正</div>}
                          <div className="absolute top-2 right-2 flex gap-1">
                            {p.referenceFileName && <div className="w-5 h-5 bg-purple-600 rounded-md flex items-center justify-center" title="参考図あり"><Ic k="list" size={10} cls="text-white" /></div>}
                            {p.isRepresentative && <div className="w-5 h-5 bg-blue-600 rounded-md flex items-center justify-center"><Ic k="star" size={10} cls="text-white" fill="white" /></div>}
                            {p.isFrequency && <div className="w-5 h-5 bg-emerald-600 rounded-md flex items-center justify-center"><Ic k="checkCircle" size={10} cls="text-white" /></div>}
                          </div>
                        </div>
                        <div className="p-2.5">
                          <div className="flex items-center justify-between mb-1"><span className="mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{p.serialNo}</span><span className="mono text-[9px] text-slate-400">{p.shootingDate}</span></div>
                          <p className={`text-[11px] font-bold line-clamp-2 leading-tight ${!p.title ? 'text-orange-500 italic' : 'text-slate-700'}`}>{p.title || "（タイトル未入力）"}</p>
                          {p.category && <div className="mt-1.5"><span className="badge badge-slate text-[9px]">{p.category}</span></div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {renderPaginationControls("mt-8 pt-4 pb-4")}
              </>
            )}
          </div>
        </main>

        <DetailPanel
          selectedIds={selectedIds}
          photos={photos}
          onDelete={handleDelete}
          getDraftVal={getDraftVal}
          handleDraftChange={handleDraftChange}
          applyDraft={applyDraft}
          onUpdateField={updateField}
          onSelectReferenceFile={handleSelectReferenceFile}
          selectedStandard={selectedStandard || ""}
          onCloseProject={() => {
            setMode('welcome');
            setPhotos([]);
            setRootHandle(null);
            setSelectedStandard(null);
          }}
        />
      </div>

      <div className="status-bar no-print">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5 text-emerald-400"><Ic k="check" size={12} /> JS基準適合</span>
          <span className="flex items-center gap-1.5"><Ic k="hardDrive" size={12} /> {rootHandle?.name}</span>
          <span className="flex items-center gap-1.5"><Ic k="camera" size={12} /> {photos.length}枚</span>
          {errorCount > 0 && <span className="flex items-center gap-1.5 text-orange-400"><Ic k="alertCircle" size={12} /> 未完了 {errorCount}件</span>}
        </div>
        <div className="flex items-center gap-4"><span>{activeStd?.versionTag}</span><span>v3.11.1</span></div>
      </div>

      {previewPhoto && (
        <div className="fixed inset-0 z-[2000] bg-black/95 flex flex-col no-print" onClick={() => setPreviewPhoto(null)}>
          <div className="flex items-center justify-between p-6 border-b border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4"><span className="mono badge badge-blue text-sm">{previewPhoto.serialNo}</span><h3 className="text-white font-bold text-lg">{previewPhoto.title || "（タイトル未設定）"}</h3></div>
            <button className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors" onClick={() => setPreviewPhoto(null)}><Ic k="close" size={24} /></button>
          </div>
          <div className="flex-1 flex items-center justify-center p-8"><LazyImage file={previewPhoto.file} forceLoad={true} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" /></div>
          <div className="p-4 border-t border-white/10 flex items-center gap-6 text-xs text-white/50 font-bold" onClick={e => e.stopPropagation()}>
            <span>{previewPhoto.category}</span>{previewPhoto.workType && <span>{previewPhoto.workType} / {previewPhoto.type}</span>}
            <span className="ml-auto mono">{previewPhoto.name} · {previewPhoto.shootingDate}</span>
          </div>
        </div>
      )}

      {toast && <div className={`toast no-print ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-900'} text-white`}><Ic k={toast.type === 'error' ? 'alertCircle' : 'check'} size={16} />{toast.message}</div>}

      <div className="hidden print:block">{activeStd && <PrintLedger photos={photos} std={activeStd} />}</div>
    </div>
  );
}
