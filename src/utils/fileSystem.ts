import Encoding from 'encoding-japanese';
import exifr from 'exifr';
import { PHOTO05_DTD, STANDARDS } from '../constants/standards';
import { WORK_MASTER } from '../constants/workMaster';
import type { Photo, Standard } from '../types';
import { buildPhotoXml, dateFromXml, toSerial } from './xmlBuilder';

/** 写真ファイル名を生成 */
export const makeFileName = (n: number, stdId: string): string => {
  const std = STANDARDS[stdId];
  const ext = std?.defaultExt || 'JPG';
  return `P${String(n).padStart(7, '0')}.${ext}`;
};

/** ファイル名から番号部分を取り出す */
export const parseFileNum = (name: string): number => {
  const m = String(name || '').match(/^P(\d{7})\./i);
  return m ? parseInt(m[1], 10) : 0;
};

/** 既存XMLのシリアル番号を正規化 */
export const parseSerialNum = (s: string): number => {
  if (!s) return 0;
  return parseInt(String(s).replace(/^P0*/i, '').replace(/^0+/, ''), 10) || 0;
};

/** Date → "CCYY-MM-DD" 文字列変換 */
export const dateToStr = (d: Date | string | number): string => {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

/** EXIFから撮影日を取得 */
export const readExifDate = async (file: File): Promise<string> => {
  try {
    const exifData = await exifr.parse(file);
    if (!exifData?.DateTimeOriginal) return '';
    let pd = exifData.DateTimeOriginal;
    if (typeof pd === 'string') {
      pd = new Date(pd.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
    }
    return pd instanceof Date && !Number.isNaN(pd.getTime()) ? dateToStr(pd) : '';
  } catch {
    return '';
  }
};

/** workType文字列からdiscipline（工事種別）を逆引き */
export const findDiscipline = (workType: string): string => {
  if (!workType) return '';
  const m = WORK_MASTER.find((m) => m.workTypes.some((w) => w.name === workType));
  return m ? m.discipline : '';
};

/** PHOTOフォルダハンドルを取得 */
export const getPhotoDir = async (
  rootHandle: FileSystemDirectoryHandle,
  std: Standard,
  create = false,
): Promise<FileSystemDirectoryHandle> => {
  if (rootHandle.name === std.photoFolder) return rootHandle;
  return rootHandle.getDirectoryHandle(std.photoFolder, { create });
};

/** PHOTO.XML の写真情報ノード群からxmlMapを構築 */
export const buildXmlMapFromNodes = (
  nodes: HTMLCollectionOf<Element>,
): Record<string, Partial<Photo>> => {
  const map: Record<string, Partial<Photo>> = {};
  for (let i = 0; i < nodes.length; i++) {
    const g = (tag: string) => nodes[i].getElementsByTagName(tag)[0]?.textContent?.trim() || '';
    const fn = g('写真ファイル名').toUpperCase();
    if (!fn) continue;
    const rawSerial = g('シリアル番号');
    const addInfoNode = nodes[i].getElementsByTagName('付加情報')[0];
    map[fn] = {
      serialNo: rawSerial ? toSerial(parseSerialNum(rawSerial) || i + 1) : toSerial(i + 1),
      category: g('写真区分'),
      workType: g('工種'),
      type: g('種別'),
      subdivision: g('細別'),
      title: g('写真タイトル'),
      shootingDate: dateFromXml(g('撮影年月日')),
      isRepresentative: g('代表写真') === '1',
      isFrequency: g('提出頻度写真') === '1',
      referenceFileName:
        addInfoNode?.getElementsByTagName('参考図ファイル名')[0]?.textContent?.trim() || '',
      referenceTitle:
        addInfoNode?.getElementsByTagName('参考図タイトル')[0]?.textContent?.trim() || '',
    };
  }
  return map;
};

/** Shift_JIS エンコード済み PHOTO.XML をパース */
export const readPhotoXmlNodes = async (
  photoDir: FileSystemDirectoryHandle,
): Promise<{ decoded: string; nodes: HTMLCollectionOf<Element> }> => {
  const xmlFile = await photoDir.getFileHandle('PHOTO.XML');
  const buf = await (await xmlFile.getFile()).arrayBuffer();
  const decoded = Encoding.codeToString(Encoding.convert(new Uint8Array(buf), 'UNICODE', 'AUTO'));
  const doc = new DOMParser().parseFromString(decoded, 'text/xml');
  return { decoded, nodes: doc.getElementsByTagName('写真情報') };
};

/** PHOTO.XML を保存 (Shift_JIS) */
export const saveXmlToDir = async (
  photos: Photo[],
  rootHandle: FileSystemDirectoryHandle,
  stdId: string,
): Promise<void> => {
  const std = STANDARDS[stdId];
  const photoDir = await getPhotoDir(rootHandle, std, true);
  const xmlStr = buildPhotoXml(photos, stdId);
  const sjis = new Uint8Array(Encoding.convert(Encoding.stringToCode(xmlStr), 'SJIS', 'UNICODE'));
  const fh = await photoDir.getFileHandle('PHOTO.XML', { create: true });
  const w = await fh.createWritable();
  await w.write(sjis);
  await w.close();
};

/** PHOTO05.DTD を保存 (Shift_JIS) */
export const saveDtdToFolder = async (
  photoDir: FileSystemDirectoryHandle,
  stdId: string,
): Promise<void> => {
  const std = STANDARDS[stdId];
  const sjis = new Uint8Array(
    Encoding.convert(Encoding.stringToCode(PHOTO05_DTD), 'SJIS', 'UNICODE'),
  );
  const fh = await photoDir.getFileHandle(std.dtdName, { create: true });
  const w = await fh.createWritable();
  await w.write(sjis);
  await w.close();
};

/** 並列実行ユーティリティ */
const CONCURRENCY_LIMIT = 15;
export const executeChunked = async <T>(
  tasks: T[],
  action: (task: T) => Promise<void>,
): Promise<void> => {
  for (let i = 0; i < tasks.length; i += CONCURRENCY_LIMIT) {
    await Promise.all(tasks.slice(i, i + CONCURRENCY_LIMIT).map(action));
  }
};

export { toSerial };
