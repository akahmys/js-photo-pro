import { describe, expect, it } from 'vitest';
import { validatePhoto } from './validation';

describe('validatePhoto', () => {
  it('returns errors for missing basic required fields', () => {
    const errors = validatePhoto({});
    expect(errors).toContain('写真タイトル');
    expect(errors).toContain('撮影年月日');
    expect(errors).toContain('写真区分');
    expect(errors).toContain('工種');
  });

  it('passes when all required fields are present for general photo', () => {
    const errors = validatePhoto({
      title: '着工前全景',
      shootingDate: '2024-04-01',
      category: '着手前及び完成写真',
      workType: '土工',
      discipline: '土木',
    });
    expect(errors).toEqual([]);
  });

  it('requires type and subdivision for 施工状況写真 in civil engineering', () => {
    const errors = validatePhoto({
      title: '床掘工施工状況',
      shootingDate: '2024-04-01',
      category: '施工状況写真',
      workType: '土工',
      discipline: '土木',
    });
    expect(errors).toContain('種別');
    expect(errors).toContain('細別');
  });

  it('passes when type and subdivision are filled for 施工状況写真', () => {
    const errors = validatePhoto({
      title: '床掘工施工状況',
      shootingDate: '2024-04-01',
      category: '施工状況写真',
      workType: '土工',
      discipline: '土木',
      type: '掘削工',
      subdivision: '床掘り',
    });
    expect(errors).toEqual([]);
  });

  it('requires matching reference file name and title', () => {
    const err1 = validatePhoto({
      title: '写真',
      shootingDate: '2024-04-01',
      category: '着手前及び完成写真',
      workType: '土工',
      referenceFileName: 'REF01.PDF',
    });
    expect(err1).toContain('参考図タイトル');

    const err2 = validatePhoto({
      title: '写真',
      shootingDate: '2024-04-01',
      category: '着手前及び完成写真',
      workType: '土工',
      referenceTitle: '参考図面',
    });
    expect(err2).toContain('参考図ファイル名');
  });
});
