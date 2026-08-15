import { STANDARDS } from '../constants/standards';
import type { Photo } from '../types';
import { esc, sanitizeForJS } from './sanitize';

/**
 * 撮影年月日フォーマット
 * JS要領正式: CCYY-MM-DD（ハイフン含む10桁固定）
 * 出典: ZH005-00-24-A 表5-1
 *   「CCYY-MM-DD方式で記入する。月又は日が1桁の数の場合0を付加して必ず10桁で記入」
 */
export const dateToXml = (d: string): string => {
  if (!d) return '';
  if (/^\d{8}$/.test(d)) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return d;
};
export const dateFromXml = dateToXml;

/**
 * シリアル番号生成
 * 出典: ZH005-00-24-A 表5-1 シリアル番号欄
 *   「写真通し番号。123枚目を"000123"のように0を付けて記入してはいけない」
 *   データ表現: 半角数字　文字数: 7
 * ⚠️ ゼロ埋めなし・Pプレフィックスなし・純粋な半角数字のみ
 */
export const toSerial = (n: string | number): string => {
  return String(Math.max(1, parseInt(String(n), 10) || 1));
};

/**
 * XML生成関数
 * 出典: 国交省「デジタル写真管理情報基準R5.3月版」付属資料2 XML記入例
 *       PHOTO05.DTD 構造定義に完全準拠
 */
export const buildPhotoXml = (photos: Photo[], stdId: string): string => {
  const std = STANDARDS[stdId];
  if (!std) throw new Error(`不明な基準IDです: ${stdId}`);

  let xml = `<?xml version="1.0" encoding="Shift_JIS"?>\n`;
  xml += `<!DOCTYPE photodata SYSTEM "${std.dtdName}">\n`;
  xml += `<photodata DTD_version="05">\n`;

  // ─── 基礎情報 ───
  const hasAnyReference = photos.some((p) => p.referenceFileName);
  xml += `  <基礎情報>\n`;
  xml += `    <写真フォルダ名>${std.photoFolder}/${std.picFolder}</写真フォルダ名>\n`;
  if (hasAnyReference) {
    xml += `    <参考図フォルダ名>${std.photoFolder}/${std.drawfFolder}</参考図フォルダ名>\n`;
  }
  xml += `    <適用要領基準>${std.versionTag}</適用要領基準>\n`;
  xml += `  </基礎情報>\n`;

  // ─── 写真情報（繰り返し） ───
  photos.forEach((p) => {
    xml += `  <写真情報>\n`;

    // 写真ファイル情報
    xml += `    <写真ファイル情報>\n`;
    xml += `      <シリアル番号>${esc(toSerial(p.serialNo))}</シリアル番号>\n`;
    xml += `      <写真ファイル名>${esc(p.name)}</写真ファイル名>\n`;
    xml += `      <メディア番号>1</メディア番号>\n`;
    xml += `    </写真ファイル情報>\n`;

    // 撮影工種区分
    xml += `    <撮影工種区分>\n`;
    xml += `      <写真-大分類>工事</写真-大分類>\n`;
    xml += `      <写真区分>${esc(p.category)}</写真区分>\n`;
    if (p.workType) xml += `      <工種>${esc(sanitizeForJS(p.workType))}</工種>\n`;
    if (p.type) xml += `      <種別>${esc(sanitizeForJS(p.type))}</種別>\n`;
    if (p.subdivision) xml += `      <細別>${esc(sanitizeForJS(p.subdivision))}</細別>\n`;
    xml += `      <写真タイトル>${esc(sanitizeForJS(p.title))}</写真タイトル>\n`;
    xml += `    </撮影工種区分>\n`;

    // 付加情報（参考図）
    if (p.referenceFileName) {
      xml += `    <付加情報>\n`;
      xml += `      <参考図ファイル名>${esc(sanitizeForJS(p.referenceFileName))}</参考図ファイル名>\n`;
      xml += `      <参考図タイトル>${esc(sanitizeForJS(p.referenceTitle))}</参考図タイトル>\n`;
      xml += `    </付加情報>\n`;
    }

    // 撮影情報
    xml += `    <撮影情報>\n`;
    xml += `      <撮影年月日>${dateToXml(p.shootingDate)}</撮影年月日>\n`;
    xml += `    </撮影情報>\n`;

    // 代表写真・提出頻度写真
    xml += `    <代表写真>${p.isRepresentative ? '1' : '0'}</代表写真>\n`;
    xml += `    <提出頻度写真>${p.isFrequency ? '1' : '0'}</提出頻度写真>\n`;

    xml += `  </写真情報>\n`;
  });

  xml += `</photodata>`;
  return xml;
};
