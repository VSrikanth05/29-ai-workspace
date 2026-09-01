import { BadRequestException } from '@nestjs/common';

export const IMAGE_TRANSLATION_MAX_BYTES = 20 * 1024 * 1024;
export const IMAGE_TRANSLATION_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'] as const;
export const IMAGE_TRANSLATION_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'pdf'] as const;

export function validateImageTranslationFile(file: Pick<Express.Multer.File, 'originalname' | 'mimetype' | 'size' | 'buffer'>) {
  if (!file || !Buffer.isBuffer(file.buffer)) throw new BadRequestException('Image or PDF file is required.');
  if (file.size > IMAGE_TRANSLATION_MAX_BYTES) throw new BadRequestException('Image translation files must be 20 MB or smaller.');
  const extension = file.originalname.toLowerCase().split('.').pop();
  if (!extension || !IMAGE_TRANSLATION_EXTENSIONS.includes(extension as (typeof IMAGE_TRANSLATION_EXTENSIONS)[number])) throw new BadRequestException('Supported files are PNG, JPG, JPEG, WEBP, and PDF.');
  if (!IMAGE_TRANSLATION_MIME_TYPES.includes(file.mimetype as (typeof IMAGE_TRANSLATION_MIME_TYPES)[number])) throw new BadRequestException('The uploaded content type is not supported.');
  const bytes = file.buffer;
  const isPng = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const isJpeg = bytes.subarray(0, 3).equals(Buffer.from([255,216,255]));
  const isWebp = bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  const isPdf = bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  if (!((extension === 'png' && isPng) || (['jpg', 'jpeg'].includes(extension) && isJpeg) || (extension === 'webp' && isWebp) || (extension === 'pdf' && isPdf))) throw new BadRequestException('The file contents do not match the declared file type.');
  return { extension, isPdf };
}
