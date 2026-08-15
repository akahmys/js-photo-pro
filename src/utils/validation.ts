import type { Photo } from '../types';

/**
 * バリデーション
 * 出典: ZH005-00-24-A 表5-1 必要度欄、表5-2/5-3 撮影工種区分の記入範囲
 *
 * 工種: 全写真区分・全工事種別で必須
 * 種別・細別:
 *   土木/建築系（表5-2）: 施工状況・品質管理・出来形管理は必須
 *   機械/電気系（表5-3）: 施工状況・機器製作・使用材料・品質管理・出来形管理は必須
 *                         着手前及び完成も△（条件付き）
 */
export const validatePhoto = (
  p: Partial<Photo> & {
    title?: string;
    shootingDate?: string;
    category?: string;
    workType?: string;
    discipline?: string;
    type?: string;
    subdivision?: string;
    referenceFileName?: string;
    referenceTitle?: string;
  },
): string[] => {
  const errs: string[] = [];
  if (!p.title) errs.push('写真タイトル');
  if (!p.shootingDate) errs.push('撮影年月日');
  if (!p.category) errs.push('写真区分');
  if (!p.workType) errs.push('工種');

  const isMechElec = ['機械', '電気'].includes(p.discipline || '');
  // 種別・細別は同一条件で必須（出典: ZH005-00-24-A 表5-2/5-3）
  const needTypeSubdiv = isMechElec
    ? [
        '施工状況写真',
        '機器製作写真',
        '使用材料写真',
        '品質管理写真',
        '出来形管理写真',
        '着手前及び完成写真',
      ].includes(p.category || '')
    : ['施工状況写真', '品質管理写真', '出来形管理写真'].includes(p.category || '');

  if (needTypeSubdiv && !p.type) errs.push('種別');
  if (needTypeSubdiv && !p.subdivision) errs.push('細別');

  // 参考図: 片方だけ入力はエラー
  // 出典: ZH005-00-24-A 表5-1「参考図ファイル名：条件付必須」「参考図タイトル：条件付必須」
  if (p.referenceFileName && !p.referenceTitle) errs.push('参考図タイトル');
  if (!p.referenceFileName && p.referenceTitle) errs.push('参考図ファイル名');
  return errs;
};
