import type { Standard } from '../types';

export const STANDARDS: Record<string, Standard> = {
  H30: {
    id: 'H30',
    label: 'H30年度基準',
    fullLabel: '平成30年度 基準',
    period: 'H30.4.1 ～ R6.3.31 契約',
    dtdName: 'PHOTO05.DTD',
    versionTag: '土木201603-01',
    photoFolder: 'PHOTO',
    picFolder: 'PIC',
    drawfFolder: 'DRA',
    color: 'badge-h30',
    acceptExt: /\.(jpe?g)$/i,
    defaultExt: 'JPG',
  },
  R06: {
    id: 'R06',
    label: 'R6年度基準',
    fullLabel: '令和6年度 基準',
    period: 'R6.4.1 以降 契約',
    dtdName: 'PHOTO05.DTD',
    versionTag: '土木202303-01',
    photoFolder: 'PHOTO',
    picFolder: 'PIC',
    drawfFolder: 'DRA',
    color: 'badge-r06',
    acceptExt: /\.(jpe?g|tiff?|svg)$/i,
    defaultExt: 'JPEG',
  },
};

export const PHOTO05_DTD = `<!-- PHOTO05.DTD / 2008/05 -->
<!ELEMENT photodata (基礎情報,写真情報+,ソフトメーカ用TAG*)>
<!ATTLIST photodata DTD_version CDATA #FIXED "05">
<!ELEMENT 基礎情報 (写真フォルダ名,参考図フォルダ名?,適用要領基準)>
<!ELEMENT 写真フォルダ名 (#PCDATA)>
<!ELEMENT 参考図フォルダ名 (#PCDATA)>
<!ELEMENT 適用要領基準 (#PCDATA)>
<!ELEMENT 写真情報 (写真ファイル情報,撮影工種区分,付加情報*,撮影情報,代表写真,提出頻度写真,施工管理値?,請負者説明文?)>
<!ELEMENT 代表写真 (#PCDATA)>
<!ELEMENT 提出頻度写真 (#PCDATA)>
<!ELEMENT 施工管理値 (#PCDATA)>
<!ELEMENT 請負者説明文 (#PCDATA)>
<!ELEMENT 写真ファイル情報 (シリアル番号,写真ファイル名,写真ファイル日本語名?,メディア番号)>
<!ELEMENT シリアル番号 (#PCDATA)>
<!ELEMENT 写真ファイル名 (#PCDATA)>
<!ELEMENT 写真ファイル日本語名 (#PCDATA)>
<!ELEMENT メディア番号 (#PCDATA)>
<!ELEMENT 撮影工種区分 (写真-大分類,写真区分?,工種?,種別?,細別?,写真タイトル,工種区分予備*)>
<!ELEMENT 写真-大分類 (#PCDATA)>
<!ELEMENT 写真区分 (#PCDATA)>
<!ELEMENT 工種 (#PCDATA)>
<!ELEMENT 種別 (#PCDATA)>
<!ELEMENT 細別 (#PCDATA)>
<!ELEMENT 写真タイトル (#PCDATA)>
<!ELEMENT 工種区分予備 (#PCDATA)>
<!ELEMENT 付加情報 (参考図ファイル名,参考図ファイル日本語名?,参考図タイトル,付加情報予備*)>
<!ELEMENT 参考図ファイル名 (#PCDATA)>
<!ELEMENT 参考図ファイル日本語名 (#PCDATA)>
<!ELEMENT 参考図タイトル (#PCDATA)>
<!ELEMENT 付加情報予備 (#PCDATA)>
<!ELEMENT 撮影情報 (撮影箇所?,撮影年月日)>
<!ELEMENT 撮影箇所 (#PCDATA)>
<!ELEMENT 撮影年月日 (#PCDATA)>
<!ELEMENT ソフトメーカ用TAG (#PCDATA)>`;
