/**
 * 全角→半角変換・制御文字除去
 * 出典: ZH005-00-24-A 6章 使用文字
 * 「全角の数字・ラテン文字は使用不可、数字やラテン文字は半角文字で統一」
 */
export const sanitizeForJS = (text: string): string => {
  if (!text) return '';
  return String(text)
    .replace(/[０-９ａ-ｚＡ-Ｚ]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[\x00-\x1F\x7F]/g, '')
    .slice(0, 255);
};

/** XML特殊文字エスケープ */
export const esc = (s: string | number | undefined): string => {
  if (s === undefined || s === null) return '';
  return String(s).replace(
    /[<>&"']/g,
    (c) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[c] || c,
  );
};
