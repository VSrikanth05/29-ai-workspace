import { BadRequestException, Injectable } from '@nestjs/common';
import JSZip from 'jszip';
import { resolveDocumentFormat } from './document-formats';

const MAX_FILENAME_LENGTH = 255;

@Injectable()
export class DocumentFileValidatorService {
  async validate(file: Express.Multer.File): Promise<void> {
    if (!file.originalname || file.originalname.length > MAX_FILENAME_LENGTH) {
      throw new BadRequestException(
        'Filename must be between 1 and 255 characters.',
      );
    }
    if (!file.buffer.length || file.size <= 0) {
      throw new BadRequestException('Uploaded file is empty.');
    }

    const format = resolveDocumentFormat(file.originalname, file.mimetype);
    if (!format) throw new BadRequestException('Unsupported file type.');

    if (format === 'pdf') {
      if (!file.buffer.subarray(0, 1024).toString('latin1').includes('%PDF-')) {
        throw new BadRequestException(
          'File content does not match the PDF format.',
        );
      }
      return;
    }

    if (format === 'docx' || format === 'pptx' || format === 'xlsx') {
      await this.validateOfficeArchive(file.buffer, format);
      return;
    }

    try {
      new TextDecoder('utf-8', { fatal: true }).decode(file.buffer);
    } catch {
      throw new BadRequestException('Text document must contain valid UTF-8.');
    }
    if (file.buffer.includes(0)) {
      throw new BadRequestException('Text document contains binary data.');
    }
  }

  private async validateOfficeArchive(
    buffer: Buffer,
    format: 'docx' | 'pptx' | 'xlsx',
  ): Promise<void> {
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      throw new BadRequestException(
        `File content does not match the ${format.toUpperCase()} format.`,
      );
    }
    try {
      const archive = await JSZip.loadAsync(buffer);
      const requiredPart = {
        docx: 'word/document.xml',
        pptx: 'ppt/presentation.xml',
        xlsx: 'xl/workbook.xml',
      }[format];
      if (!archive.file(requiredPart))
        throw new Error('Required part is missing');
    } catch {
      throw new BadRequestException(
        `File content does not match the ${format.toUpperCase()} format.`,
      );
    }
  }
}
