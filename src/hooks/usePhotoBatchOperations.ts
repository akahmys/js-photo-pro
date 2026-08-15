import { STANDARDS } from '../constants/standards';
import type { Photo } from '../types';
import {
  buildXmlMapFromNodes,
  executeChunked,
  findDiscipline,
  getPhotoDir,
  makeFileName,
  parseFileNum,
  readExifDate,
  readPhotoXmlNodes,
  toSerial,
} from '../utils/fileSystem';

interface UsePhotoBatchOperationsParams {
  photos: Photo[];
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  rootHandle: FileSystemDirectoryHandle | null;
  selectedStandard: string | null;
  setIsProcessing: (v: boolean) => void;
  setProcessMsg: (msg: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function usePhotoBatchOperations({
  photos,
  setPhotos,
  selectedIds,
  setSelectedIds,
  rootHandle,
  selectedStandard,
  setIsProcessing,
  setProcessMsg,
  showToast,
}: UsePhotoBatchOperationsParams) {
  const processDropFiles = async (files: FileList) => {
    if (!rootHandle || !selectedStandard) return;
    setIsProcessing(true);
    setProcessMsg('写真を取り込み中...');
    try {
      const std = STANDARDS[selectedStandard];
      const photoDir = await getPhotoDir(rootHandle, std);
      const picDir = await photoDir.getDirectoryHandle(std.picFolder);
      const valid = Array.from(files).filter((f) => std.acceptExt.test(f.name));
      if (!valid.length) {
        showToast('対応形式のファイルがありません', 'error');
        return;
      }

      const maxSerial =
        photos.length > 0 ? Math.max(...photos.map((p) => parseInt(p.serialNo, 10) || 0)) : 0;
      const maxNum = photos.length > 0 ? Math.max(...photos.map((p) => parseFileNum(p.name))) : 0;
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
          id: `${name}_${f.size}_${Date.now()}`,
          name,
          handle: h,
          file: nf,
          size: f.size,
          serialNo: toSerial(maxSerial + i + 1),
          category: '施工状況写真',
          workType: '',
          type: '',
          subdivision: '',
          discipline: '',
          title: '',
          shootingDate: shootingDateStr,
          isRepresentative: false,
          isFrequency: false,
          referenceFileName: '',
          referenceTitle: '',
        });
      }
      setPhotos((p) => [...p, ...added]);
      showToast(`${added.length}枚を追加しました`, 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`取込み失敗: ${msg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedIds.size || !selectedStandard || !rootHandle) return;
    if (
      !confirm(
        `選択した ${selectedIds.size} 枚の写真を完全に削除しますか？\nこの操作は元に戻せません。`,
      )
    )
      return;
    setIsProcessing(true);
    setProcessMsg('削除中...');
    try {
      const std = STANDARDS[selectedStandard];
      const photoDir = await getPhotoDir(rootHandle, std);
      const picDir = await photoDir.getDirectoryHandle(std.picFolder);
      for (const id of selectedIds) {
        const p = photos.find((x) => x.id === id);
        if (p) {
          try {
            await picDir.removeEntry(p.name);
          } catch {
            // すでにない場合など
          }
        }
      }
      const next = photos
        .filter((x) => !selectedIds.has(x.id))
        .map((p, i) => ({ ...p, serialNo: toSerial(i + 1) }));
      setPhotos(next);
      setSelectedIds(new Set());
      showToast(`${selectedIds.size}枚を削除しました`, 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`削除失敗: ${msg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRename = async () => {
    if (!selectedStandard || !rootHandle) return;
    if (
      !confirm(
        `表示順に従ってファイル名を ${makeFileName(1, selectedStandard)} 形式で再構成します。\n実際のファイルが書き換えられます。続けますか？`,
      )
    )
      return;
    setIsProcessing(true);
    setProcessMsg('リネーム中...');
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
        const uniqueRefs = [...new Set(nList.map((p) => p.referenceFileName).filter(Boolean))];
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

      const photoTasks: {
        index: number;
        oldName: string;
        tmpName: string;
        finalName: string;
        handle: FileSystemFileHandle;
      }[] = [];
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
        showToast('すべてのファイル名が既に最適な状態です（スキップ）', 'success');
        return;
      }

      if (drawfDir && refTasks.length > 0) {
        await executeChunked(refTasks, async (task) => {
          try {
            const fh = await drawfDir.getFileHandle(task.oldName);
            if (hasMove && 'move' in fh) {
              await (fh as unknown as { move: (name: string) => Promise<void> }).move(task.tmpName);
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
            if (hasMove && 'move' in th) {
              await (th as unknown as { move: (name: string) => Promise<void> }).move(
                task.finalName,
              );
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
          if (hasMove && 'move' in task.handle) {
            await (task.handle as unknown as { move: (name: string) => Promise<void> }).move(
              task.tmpName,
            );
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
          if (hasMove && 'move' in task.handle) {
            await (task.handle as unknown as { move: (name: string) => Promise<void> }).move(
              task.finalName,
            );
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
          pItem.id = `${task.finalName}_${pItem.file.size}`;
        });
      }
      setPhotos(nList);
      setSelectedIds(new Set());
      showToast('リネーム完了', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`リネーム失敗: ${msg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMerge = async () => {
    if (!selectedStandard || !rootHandle) return;
    try {
      const srcHandle = await window.showDirectoryPicker();
      setIsProcessing(true);
      setProcessMsg('プロジェクトを結合中...');
      const std = STANDARDS[selectedStandard];
      let srcPhotoDir: FileSystemDirectoryHandle;
      try {
        srcPhotoDir =
          srcHandle.name === std.photoFolder
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
      const maxNum = photos.length > 0 ? Math.max(...photos.map((p) => parseFileNum(p.name))) : 0;
      const maxSerial =
        photos.length > 0 ? Math.max(...photos.map((p) => parseInt(p.serialNo, 10) || 0)) : 0;
      const existingSizes = new Set(photos.map((p) => p.size));
      const pendingFiles: {
        entry: FileSystemFileHandle;
        file: File;
        originalSerial: number;
        xmlData: Partial<Photo>;
      }[] = [];

      for await (const entry of srcPicDir.values()) {
        if (entry.kind !== 'file' || !std.acceptExt.test(entry.name)) continue;
        const fileHandle = entry as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        if (existingSizes.has(file.size)) continue;
        const x = srcXmlMap[entry.name.toUpperCase()] || {};
        pendingFiles.push({
          entry: fileHandle,
          file,
          originalSerial: parseInt(x.serialNo || '', 10) || 9999999,
          xmlData: x,
        });
      }
      pendingFiles.sort((a, b) => a.originalSerial - b.originalSerial);

      const newPhotos: Photo[] = [];
      const CONCURRENCY_LIMIT = 15;
      for (let i = 0; i < pendingFiles.length; i += CONCURRENCY_LIMIT) {
        const chunk = pendingFiles.slice(i, i + CONCURRENCY_LIMIT);
        const results = await Promise.all(
          chunk.map(async (item, idx) => {
            const globalIndex = i + idx;
            const name = makeFileName(maxNum + globalIndex + 1, selectedStandard);
            const th = await destPicDir.getFileHandle(name, { create: true });
            const w = await th.createWritable();
            await w.write(item.file);
            await w.close();
            const nf = await th.getFile();
            const x = item.xmlData;

            const sDate = x.shootingDate || (await readExifDate(item.file));

            return {
              id: `${name}_${nf.size}_${Date.now()}`,
              name,
              handle: th,
              file: nf,
              size: nf.size,
              serialNo: toSerial(maxSerial + globalIndex + 1),
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
            };
          }),
        );
        newPhotos.push(...results);
      }

      if (newPhotos.length === 0) {
        showToast('結合対象となる新しい写真が見つかりませんでした', 'success');
      } else {
        setPhotos((prev) => [...prev, ...newPhotos]);
        showToast(`${newPhotos.length}枚の写真を結合しました`, 'success');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast(`結合失敗: ${msg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processDropFiles,
    handleDelete,
    handleRename,
    handleMerge,
  };
}
