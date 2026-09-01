import { UnsupportedMediaTypeException } from '@nestjs/common';
import JSZip from 'jszip';
import { DocumentExtractorService } from './document-extractor.service';
import {
  resolveDocumentFormat,
  SUPPORTED_EXTENSIONS,
} from './document-formats';
import { DocxExtractorService } from './extractors/docx-extractor.service';
import { PdfExtractorService } from './extractors/pdf-extractor.service';
import { PptxExtractorService } from './extractors/pptx-extractor.service';
import { XlsxExtractorService } from './extractors/xlsx-extractor.service';
import { CsvParserService } from './parsers/csv-parser.service';
import { MarkdownParserService } from './parsers/markdown-parser.service';
import { TxtParserService } from './parsers/txt-parser.service';

const mockPdfGetText = jest.fn();
const mockPdfDestroy = jest.fn();

jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: mockPdfGetText,
    destroy: mockPdfDestroy,
  })),
}));

const MIME = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;

async function createDocx(text: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`,
  );
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function createPptx(text: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    'ppt/slides/slide1.xml',
    `<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><a:t>${text}</a:t></p:cSld></p:sld>`,
  );
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function createXlsx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    'xl/workbook.xml',
    '<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Metrics" sheetId="1" r:id="rId1"/></sheets></workbook>',
  );
  zip.file(
    'xl/_rels/workbook.xml.rels',
    '<?xml version="1.0"?><Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
  );
  zip.file(
    'xl/sharedStrings.xml',
    '<?xml version="1.0"?><sst><si><t>Name</t></si><si><t>Value</t></si><si><t>XLSX regression</t></si></sst>',
  );
  zip.file(
    'xl/worksheets/sheet1.xml',
    '<?xml version="1.0"?><worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>42</v></c></row></sheetData></worksheet>',
  );
  return zip.generateAsync({ type: 'nodebuffer' });
}

describe('document parser regressions', () => {
  beforeEach(() => {
    mockPdfGetText.mockResolvedValue({
      text: 'PDF regression',
      total: 1,
    });
    mockPdfDestroy.mockResolvedValue(undefined);
  });

  it('parses PDF into normalized text and page metadata', async () => {
    const result = await new PdfExtractorService().parse(Buffer.from('%PDF'));

    expect(result.text).toContain('PDF regression');
    expect(result.metadata).toMatchObject({ format: 'pdf', pageCount: 1 });
    expect(mockPdfDestroy).toHaveBeenCalled();
  });

  it('parses DOCX into text and metadata', async () => {
    const result = await new DocxExtractorService().parse(
      await createDocx('DOCX regression'),
    );

    expect(result.text).toContain('DOCX regression');
    expect(result.metadata).toMatchObject({ format: 'docx' });
  });

  it('parses PPTX slides in numeric order', async () => {
    const result = await new PptxExtractorService().parse(
      await createPptx('PPTX regression'),
    );

    expect(result.text).toContain('## Slide 1\nPPTX regression');
    expect(result.metadata).toMatchObject({ format: 'pptx', slideCount: 1 });
  });

  it('parses every XLSX worksheet into readable text', async () => {
    const result = await new XlsxExtractorService().parse(await createXlsx());

    expect(result.text).toContain('## Sheet: Metrics');
    expect(result.text).toContain('XLSX regression,42');
    expect(result.metadata).toMatchObject({ format: 'xlsx', sheetCount: 1 });
  });

  it('parses CSV and removes BOM/Windows line endings', () => {
    const result = new CsvParserService().parse(
      Buffer.from('\uFEFFname,value\r\nCSV regression,7\r\n'),
    );

    expect(result.text).toBe('name,value\nCSV regression,7');
    expect(result.metadata).toMatchObject({ format: 'csv', rowCount: 2 });
  });

  it('parses Markdown without discarding its useful structure', () => {
    const result = new MarkdownParserService().parse(
      Buffer.from('# Markdown regression\r\n\r\n- item\r\n'),
    );

    expect(result.text).toBe('# Markdown regression\n\n- item');
    expect(result.metadata).toEqual({ format: 'markdown' });
  });

  it('parses plain text into the common representation', () => {
    const result = new TxtParserService().parse(
      Buffer.from('TXT regression\r\nsecond line\r\n'),
    );

    expect(result.text).toBe('TXT regression\nsecond line');
    expect(result.metadata).toEqual({ format: 'txt' });
  });
});

describe('DocumentExtractorService', () => {
  const service = new DocumentExtractorService(
    new PdfExtractorService(),
    new DocxExtractorService(),
    new XlsxExtractorService(),
    new PptxExtractorService(),
    new CsvParserService(),
    new MarkdownParserService(),
    new TxtParserService(),
  );

  it('keeps the legacy PDF MIME-only string extraction API working', async () => {
    mockPdfGetText.mockResolvedValue({ text: 'Legacy PDF', total: 1 });
    await expect(
      service.extract(Buffer.from('%PDF'), MIME.pdf),
    ).resolves.toContain('Legacy PDF');
  });

  it('returns common text and metadata from the parser facade', async () => {
    await expect(
      service.parse(Buffer.from('# Facade'), 'readme.md', 'text/plain'),
    ).resolves.toEqual({ text: '# Facade', metadata: { format: 'markdown' } });
  });

  it('rejects unsupported or mismatched file types', async () => {
    await expect(
      service.parse(
        Buffer.from('data'),
        'malware.exe',
        'application/octet-stream',
      ),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    await expect(
      service.parse(Buffer.from('data'), 'spoofed.pdf', 'text/plain'),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });
});

describe('document format validation', () => {
  it.each([
    ['file.pdf', MIME.pdf, 'pdf'],
    ['file.docx', MIME.docx, 'docx'],
    ['file.pptx', MIME.pptx, 'pptx'],
    ['file.xlsx', MIME.xlsx, 'xlsx'],
    ['file.csv', 'text/csv', 'csv'],
    ['file.md', 'text/plain', 'markdown'],
    ['file.markdown', 'text/markdown', 'markdown'],
    ['file.txt', 'text/plain', 'txt'],
    ['FILE.PDF', 'application/octet-stream', 'pdf'],
  ])('accepts %s (%s)', (name, mime, format) => {
    expect(resolveDocumentFormat(name, mime)).toBe(format);
  });

  it('lists every supported extension for upload errors', () => {
    expect(SUPPORTED_EXTENSIONS).toEqual(
      expect.arrayContaining([
        '.pdf',
        '.docx',
        '.pptx',
        '.xlsx',
        '.csv',
        '.md',
        '.markdown',
        '.txt',
      ]),
    );
  });
});
