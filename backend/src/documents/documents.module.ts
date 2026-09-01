import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentExtractorService } from './document-extractor.service';
import { PdfExtractorService } from './extractors/pdf-extractor.service';
import { DocxExtractorService } from './extractors/docx-extractor.service';
import { XlsxExtractorService } from './extractors/xlsx-extractor.service';
import { PptxExtractorService } from './extractors/pptx-extractor.service';
import { CsvParserService } from './parsers/csv-parser.service';
import { MarkdownParserService } from './parsers/markdown-parser.service';
import { TxtParserService } from './parsers/txt-parser.service';
import { TextChunkerService } from './text-chunker.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { DocumentFileValidatorService } from './document-file-validator.service';
import { DocumentIngestionService } from './document-ingestion.service';
import { IngestionQueueService } from './ingestion-queue.service';
import { SourcesController } from './sources.controller';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, RagModule, WorkspacesModule, StorageModule],
  controllers: [DocumentsController, SourcesController],
  providers: [
    DocumentsService,
    DocumentExtractorService,
    PdfExtractorService,
    DocxExtractorService,
    XlsxExtractorService,
    PptxExtractorService,
    CsvParserService,
    MarkdownParserService,
    TxtParserService,
    TextChunkerService,
    DocumentFileValidatorService,
    DocumentIngestionService,
    IngestionQueueService,
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
