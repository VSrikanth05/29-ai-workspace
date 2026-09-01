import { BadRequestException, Injectable } from '@nestjs/common';
import JSZip from 'jszip';
import { DocumentParser, ParsedDocument } from '../parsers/document-parser';

type SheetReference = { name: string; relationshipId: string };

@Injectable()
export class XlsxExtractorService implements DocumentParser {
  readonly format = 'xlsx' as const;

  async parse(buffer: Buffer): Promise<ParsedDocument> {
    const zip = await JSZip.loadAsync(buffer);
    const workbookXml = await this.readRequired(zip, 'xl/workbook.xml');
    const relationshipsXml = await this.readRequired(
      zip,
      'xl/_rels/workbook.xml.rels',
    );
    const sharedStrings = await this.readSharedStrings(zip);
    const relationships = this.readRelationships(relationshipsXml);
    const sheets = this.readSheets(workbookXml);

    const sections = await Promise.all(
      sheets.map(async (sheet) => {
        const target = relationships.get(sheet.relationshipId);
        if (!target) {
          throw new BadRequestException(
            `Invalid XLSX: missing worksheet relationship ${sheet.relationshipId}.`,
          );
        }
        const worksheetXml = await this.readRequired(
          zip,
          this.worksheetPath(target),
        );
        return `## Sheet: ${sheet.name}\n${this.sheetToCsv(worksheetXml, sharedStrings)}`;
      }),
    );

    return {
      text: sections.join('\n\n').trim(),
      metadata: {
        format: this.format,
        sheetCount: sheets.length,
        sheetNames: sheets.map((sheet) => sheet.name).join(', '),
      },
    };
  }

  private async readRequired(zip: JSZip, path: string): Promise<string> {
    const entry = zip.file(path);
    if (!entry) throw new BadRequestException(`Invalid XLSX: missing ${path}.`);
    return entry.async('string');
  }

  private async readSharedStrings(zip: JSZip): Promise<string[]> {
    const entry = zip.file('xl/sharedStrings.xml');
    if (!entry) return [];
    const xml = await entry.async('string');
    return [...xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) =>
      this.textNodes(match[1]),
    );
  }

  private readSheets(xml: string): SheetReference[] {
    return [...xml.matchAll(/<sheet\b([^>]*)\/?\s*>/g)].map((match) => {
      const name = this.attribute(match[1], 'name');
      const relationshipId = this.attribute(match[1], 'r:id');
      if (!name || !relationshipId)
        throw new BadRequestException('Invalid XLSX worksheet declaration.');
      return { name: this.decodeXml(name), relationshipId };
    });
  }

  private readRelationships(xml: string): Map<string, string> {
    return new Map(
      [...xml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)].flatMap(
        (match): [string, string][] => {
          const id = this.attribute(match[1], 'Id');
          const target = this.attribute(match[1], 'Target');
          return id && target ? [[id, this.decodeXml(target)]] : [];
        },
      ),
    );
  }

  private sheetToCsv(xml: string, sharedStrings: string[]): string {
    return [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)]
      .map((rowMatch) => {
        const values: string[] = [];
        for (const cellMatch of rowMatch[1].matchAll(
          /<c\b([^>]*)>([\s\S]*?)<\/c>/g,
        )) {
          const reference = this.attribute(cellMatch[1], 'r');
          const column = reference
            ? this.columnIndex(reference)
            : values.length;
          while (values.length < column) values.push('');
          values[column] = this.cellValue(
            cellMatch[1],
            cellMatch[2],
            sharedStrings,
          );
        }
        return values.map((value) => this.escapeCsv(value)).join(',');
      })
      .join('\n');
  }

  private cellValue(
    attributes: string,
    body: string,
    sharedStrings: string[],
  ): string {
    const type = this.attribute(attributes, 't');
    if (type === 'inlineStr') return this.textNodes(body);
    const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? '';
    if (type === 's') return sharedStrings[Number(raw)] ?? '';
    if (type === 'b') return raw === '1' ? 'TRUE' : 'FALSE';
    return this.decodeXml(raw);
  }

  private textNodes(xml: string): string {
    return [...xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
      .map((match) => this.decodeXml(match[1]))
      .join('');
  }

  private attribute(attributes: string, name: string): string | undefined {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`${escapedName}="([^"]*)"`).exec(attributes)?.[1];
  }

  private worksheetPath(target: string): string {
    const normalized = target.replace(/\\/g, '/').replace(/^\/+/, '');
    return normalized.startsWith('xl/') ? normalized : `xl/${normalized}`;
  }

  private columnIndex(reference: string): number {
    const letters = /^[A-Za-z]+/.exec(reference)?.[0] ?? 'A';
    return (
      [...letters.toUpperCase()].reduce(
        (value, letter) => value * 26 + letter.charCodeAt(0) - 64,
        0,
      ) - 1
    );
  }

  private escapeCsv(value: string): string {
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }

  private decodeXml(value: string): string {
    return value
      .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
        String.fromCodePoint(Number.parseInt(code, 16)),
      )
      .replace(/&#([0-9]+);/g, (_, code: string) =>
        String.fromCodePoint(Number.parseInt(code, 10)),
      )
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&');
  }
}
