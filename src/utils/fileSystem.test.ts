import { describe, expect, it } from 'vitest';
import {
  dateToStr,
  findDiscipline,
  makeFileName,
  parseFileNum,
  parseSerialNum,
} from './fileSystem';

describe('fileSystem utils', () => {
  describe('makeFileName', () => {
    it('generates standard photo file name with 7-digit zero padding', () => {
      expect(makeFileName(1, 'H30')).toBe('P0000001.JPG');
      expect(makeFileName(42, 'R06')).toBe('P0000042.JPEG');
      expect(makeFileName(9999999, 'H30')).toBe('P9999999.JPG');
    });
  });

  describe('parseFileNum', () => {
    it('extracts number from standard file name', () => {
      expect(parseFileNum('P0000001.JPG')).toBe(1);
      expect(parseFileNum('p0000123.jpg')).toBe(123);
      expect(parseFileNum('invalid.jpg')).toBe(0);
      expect(parseFileNum('')).toBe(0);
    });
  });

  describe('parseSerialNum', () => {
    it('normalizes serial numbers with P prefix or leading zeros', () => {
      expect(parseSerialNum('P0000005')).toBe(5);
      expect(parseSerialNum('0000010')).toBe(10);
      expect(parseSerialNum('15')).toBe(15);
      expect(parseSerialNum('')).toBe(0);
    });
  });

  describe('dateToStr', () => {
    it('formats date object to CCYY-MM-DD string', () => {
      const d = new Date(2024, 3, 5); // 2024-04-05
      expect(dateToStr(d)).toBe('2024-04-05');
    });

    it('formats date string or timestamp to CCYY-MM-DD', () => {
      const formatted = dateToStr('2024-12-31T00:00:00Z');
      expect(formatted).toMatch(/^2024-(12|11)-(30|31)/);
    });
  });

  describe('findDiscipline', () => {
    it('finds discipline from known work types in master', () => {
      expect(findDiscipline('処理施設工(土木)')).toBe('土木');
      expect(findDiscipline('処理施設工(機械)')).toBe('機械');
      expect(findDiscipline('処理施設工(電気)')).toBe('電気');
      expect(findDiscipline('処理施設工(建築)')).toBe('建築');
    });

    it('returns empty string for unknown work type', () => {
      expect(findDiscipline('存在しない工種')).toBe('');
      expect(findDiscipline('')).toBe('');
    });
  });
});
