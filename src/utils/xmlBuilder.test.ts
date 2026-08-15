import { describe, expect, it } from 'vitest';
import type { Photo } from '../types';
import { buildPhotoXml, dateToXml, toSerial } from './xmlBuilder';

const mockPhoto: Photo = {
  id: 'P0000001_1000',
  name: 'P0000001.JPG',
  handle: {} as FileSystemFileHandle,
  file: {} as File,
  size: 1000,
  serialNo: '1',
  category: '施工状況写真',
  workType: '土工',
  type: '掘削工',
  subdivision: '床掘り',
  discipline: '土木',
  title: '掘削施工状況',
  shootingDate: '2024-05-10',
  isRepresentative: true,
  isFrequency: false,
  referenceFileName: 'D0000001.PDF',
  referenceTitle: '標準断面図',
};

describe('xmlBuilder', () => {
  describe('dateToXml', () => {
    it('converts YYYYMMDD to YYYY-MM-DD', () => {
      expect(dateToXml('20240510')).toBe('2024-05-10');
    });

    it('preserves YYYY-MM-DD as-is', () => {
      expect(dateToXml('2024-05-10')).toBe('2024-05-10');
    });

    it('returns empty string for empty input', () => {
      expect(dateToXml('')).toBe('');
    });
  });

  describe('toSerial', () => {
    it('returns integer serial as string without leading zeroes', () => {
      expect(toSerial('0000005')).toBe('5');
      expect(toSerial(10)).toBe('10');
      expect(toSerial('1')).toBe('1');
    });
  });

  describe('buildPhotoXml', () => {
    it('generates valid H30 standard XML with PHOTO05.DTD', () => {
      const xml = buildPhotoXml([mockPhoto], 'H30');

      expect(xml).toContain('<?xml version="1.0" encoding="Shift_JIS"?>');
      expect(xml).toContain('<!DOCTYPE photodata SYSTEM "PHOTO05.DTD">');
      expect(xml).toContain('<適用要領基準>土木201603-01</適用要領基準>');
      expect(xml).toContain('<写真フォルダ名>PHOTO/PIC</写真フォルダ名>');
      expect(xml).toContain('<参考図フォルダ名>PHOTO/DRA</参考図フォルダ名>');
      expect(xml).toContain('<シリアル番号>1</シリアル番号>');
      expect(xml).toContain('<写真ファイル名>P0000001.JPG</写真ファイル名>');
      expect(xml).toContain('<写真区分>施工状況写真</写真区分>');
      expect(xml).toContain('<工種>土工</工種>');
      expect(xml).toContain('<種別>掘削工</種別>');
      expect(xml).toContain('<細別>床掘り</細別>');
      expect(xml).toContain('<写真タイトル>掘削施工状況</写真タイトル>');
      expect(xml).toContain('<参考図ファイル名>D0000001.PDF</参考図ファイル名>');
      expect(xml).toContain('<参考図タイトル>標準断面図</参考図タイトル>');
      expect(xml).toContain('<代表写真>1</代表写真>');
      expect(xml).toContain('<提出頻度写真>0</提出頻度写真>');
    });

    it('generates valid R06 standard XML with PHOTO05.DTD', () => {
      const xml = buildPhotoXml([mockPhoto], 'R06');

      expect(xml).toContain('<!DOCTYPE photodata SYSTEM "PHOTO05.DTD">');
      expect(xml).toContain('<適用要領基準>土木202303-01</適用要領基準>');
    });

    it('throws error for unknown standard ID', () => {
      expect(() => buildPhotoXml([mockPhoto], 'UNKNOWN')).toThrowError('不明な基準IDです: UNKNOWN');
    });
  });
});
