export type AppSettings = {
  targetFormat: 'image/avif' | 'image/webp' | 'image/png' | 'image/jpeg';
  quality: number;
  prefix: string;
  suffix: string;
  findStr: string;
  replaceStr: string;
  casing: 'none' | 'capitalizeFirst' | 'titleCase' | 'upper' | 'lower';
};

export type FileStatus = 'pending' | 'processing' | 'done' | 'error';

export type ImageFile = {
  id: string;
  originalFile: File;
  originalName: string;
  newName: string;
  relativePath: string;
  status: FileStatus;
  blob?: Blob;
  error?: string;
  previewUrl: string;
};
