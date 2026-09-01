import JSZip from 'jszip';
import { DocumentFileValidatorService } from './document-file-validator.service';

function file(
  originalname: string,
  mimetype: string,
  buffer: Buffer,
): Express.Multer.File {
  return {
    originalname,
    mimetype,
    buffer,
    size: buffer.length,
  } as Express.Multer.File;
}

describe('DocumentFileValidatorService', () => {
  const validator = new DocumentFileValidatorService();

  it('accepts content matching the declared PDF format', async () => {
    await expect(
      validator.validate(
        file('report.pdf', 'application/pdf', Buffer.from('%PDF-1.7\n')),
      ),
    ).resolves.toBeUndefined();
  });

  it('rejects extension/MIME spoofing and empty files', async () => {
    await expect(
      validator.validate(
        file('report.pdf', 'application/pdf', Buffer.from('not a PDF')),
      ),
    ).rejects.toThrow('does not match');
    await expect(
      validator.validate(file('empty.txt', 'text/plain', Buffer.alloc(0))),
    ).rejects.toThrow('empty');
  });

  it('rejects binary data disguised as text', async () => {
    await expect(
      validator.validate(
        file('notes.txt', 'text/plain', Buffer.from([0, 1, 2, 3])),
      ),
    ).rejects.toThrow('binary data');
  });

  it('checks required Office Open XML package parts', async () => {
    const valid = new JSZip();
    valid.file('word/document.xml', '<w:document/>');
    const validBuffer = await valid.generateAsync({ type: 'nodebuffer' });
    await expect(
      validator.validate(
        file(
          'report.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          validBuffer,
        ),
      ),
    ).resolves.toBeUndefined();

    const invalidBuffer = await new JSZip()
      .file('other.xml', '<x/>')
      .generateAsync({
        type: 'nodebuffer',
      });
    await expect(
      validator.validate(
        file(
          'report.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          invalidBuffer,
        ),
      ),
    ).rejects.toThrow('does not match');
  });
});
