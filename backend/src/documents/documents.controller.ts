import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { DocumentsService } from './documents.service';
import {
  resolveDocumentFormat,
  SUPPORTED_EXTENSIONS,
} from './document-formats';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/guards/supabase-auth.guard';
import { DocumentFileValidatorService } from './document-file-validator.service';
import { Throttle } from '@nestjs/throttler';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly fileValidator: DocumentFileValidatorService,
  ) {}

  @Post('upload')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Upload a document (PDF, Word, Excel, PowerPoint, CSV, Markdown, or plain text)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      // Files are streamed straight to Supabase Storage - no local disk writes.
      storage: memoryStorage(),
      fileFilter: (_req, file, callback) => {
        if (!resolveDocumentFormat(file.originalname, file.mimetype)) {
          return callback(
            new BadRequestException(
              `Unsupported file type. Supported extensions: ${SUPPORTED_EXTENSIONS.join(', ')}.`,
            ),
            false,
          );
        }
        callback(null, true);
      },
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    await this.fileValidator.validate(file);

    const document = await this.documentsService.createDocument(
      file,
      user.userId,
    );

    return { message: 'Document uploaded successfully', document };
  }

  @Get()
  @ApiOperation({ summary: "List the current user's documents" })
  list(@CurrentUser() user: RequestUser) {
    return this.documentsService.listDocuments(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document, including its extracted chunks' })
  get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.documentsService.getDocument(user.userId, id);
  }

  @Get(':id/download-url')
  @ApiOperation({
    summary: 'Get a temporary signed URL to view/download the original file',
  })
  getDownloadUrl(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.documentsService.getDownloadUrl(user.userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document and its storage object' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.documentsService.deleteDocument(user.userId, id);
  }
}
