import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  SupabaseAuthGuard,
  type RequestUser,
} from '../auth/guards/supabase-auth.guard';
import { DocumentFileValidatorService } from './document-file-validator.service';
import {
  resolveDocumentFormat,
  SUPPORTED_EXTENSIONS,
} from './document-formats';
import { DocumentsService } from './documents.service';
import { SourceListQueryDto } from './dto/source-list-query.dto';

const MAX_SOURCE_SIZE = 20 * 1024 * 1024;

@ApiTags('Workspace Sources')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('workspaces/:workspaceId/sources')
export class SourcesController {
  constructor(
    private readonly documents: DocumentsService,
    private readonly validator: DocumentFileValidatorService,
  ) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Upload a source to a workspace' })
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
      storage: memoryStorage(),
      limits: { fileSize: MAX_SOURCE_SIZE },
      fileFilter: (_request, file, callback) => {
        if (!resolveDocumentFormat(file.originalname, file.mimetype)) {
          callback(
            new BadRequestException(
              `Unsupported file type. Supported extensions: ${SUPPORTED_EXTENSIONS.join(', ')}.`,
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async upload(
    @Param('workspaceId') workspaceId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) throw new BadRequestException('File is required');
    await this.validator.validate(file);
    const source = await this.documents.createDocument(
      file,
      user.userId,
      workspaceId,
    );
    return { message: 'Source uploaded successfully', source };
  }

  @Get()
  @ApiOperation({ summary: 'Search and filter workspace sources' })
  list(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Query() query: SourceListQueryDto,
  ) {
    return this.documents.listSources(user.userId, workspaceId, query);
  }

  @Get(':sourceId')
  get(
    @Param('workspaceId') workspaceId: string,
    @Param('sourceId') sourceId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documents.getSource(user.userId, workspaceId, sourceId);
  }

  @Get(':sourceId/download-url')
  download(
    @Param('workspaceId') workspaceId: string,
    @Param('sourceId') sourceId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documents.getSourceDownloadUrl(
      user.userId,
      workspaceId,
      sourceId,
    );
  }

  @Post(':sourceId/retry')
  retry(
    @Param('workspaceId') workspaceId: string,
    @Param('sourceId') sourceId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documents.retrySource(user.userId, workspaceId, sourceId);
  }

  @Delete(':sourceId')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('sourceId') sourceId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documents.deleteSource(user.userId, workspaceId, sourceId);
  }
}
