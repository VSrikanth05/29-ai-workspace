export type ImageTranslationBox = {
  id?: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right';
};

export type OcrResult = {
  text: string;
  language?: string;
  boxes: ImageTranslationBox[];
};

export type RenderResult = { bytes: Buffer; mimeType: string };
