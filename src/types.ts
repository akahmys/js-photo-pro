export interface Standard {
  id: string;
  label: string;
  fullLabel: string;
  period: string;
  dtdName: string;
  versionTag: string;
  photoFolder: string;
  picFolder: string;
  drawfFolder: string;
  color: string;
  acceptExt: RegExp;
  defaultExt: string;
}

export interface Photo {
  id: string;
  name: string;
  handle: FileSystemFileHandle;
  file: File;
  size: number;
  serialNo: string;
  category: string;
  workType: string;
  type: string;
  subdivision: string;
  discipline: string;
  title: string;
  shootingDate: string;
  isRepresentative: boolean;
  isFrequency: boolean;
  referenceFileName: string;
  referenceTitle: string;
}

export interface WorkSubdivision {
  name: string;
  subdivisions: string[];
}

export interface WorkType {
  discipline: string;
  workTypes: {
    name: string;
    types: {
      name: string;
      subdivisions: string[];
    }[];
  }[];
}
