import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Photo } from '../types';
import { STANDARDS } from '../constants/standards';
import { validatePhoto } from '../utils/validation';
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
} from '../utils/fileSystem';
import Encoding from 'encoding-japanese';

const ITEMS_PER_PAGE = 100;

export function usePhotoProject() {
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

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

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
      pageChangeTimerRef.current = window.setTimeout(() => {
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

  const handleCloseProject = () => {
    if (confirm("プロジェクトを閉じますか？")) {
      setMode('welcome');
      setPhotos([]);
      setRootHandle(null);
      setSelectedStandard(null);
    }
  };

  return {
    mode,
    setMode,
    selectedStandard,
    setSelectedStandard,
    rootHandle,
    setRootHandle,
    tempHandle,
    standardSelectMode,
    isChangeStdModalOpen,
    setIsChangeStdModalOpen,
    photos,
    setPhotos,
    selectedIds,
    setSelectedIds,
    editDraft,
    isProcessing,
    processMsg,
    toast,
    setToast,
    previewPhoto,
    setPreviewPhoto,
    isDragOver,
    setIsDragOver,
    draggedId,
    setDraggedId,
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
    totalPages,
    filteredPhotos,
    paginatedPhotos,
    errorCount,
    
    showToast,
    loadFolder,
    handleOpenFolder,
    handleNewProject,
    handleStandardChosen,
    handleStandardChange,
    processDropFiles,
    handleDelete,
    handleRename,
    handleMerge,
    handleSelectReferenceFile,
    handlePageDragOver,
    handlePageDragLeave,
    handlePhotoClick,
    updateField,
    getDraftVal,
    handleDraftChange,
    applyDraft,
    handleCloseProject,
  };
}
