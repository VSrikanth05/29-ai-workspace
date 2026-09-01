import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import {
  SupabaseAuthGuard,
} from '../../auth/guards/supabase-auth.guard';
import {
  IMAGE_TRANSLATION_EXTENSIONS,
  IMAGE_TRANSLATION_MIME_TYPES,
  IMAGE_TRANSLATION_MAX_BYTES,
  validateImageTranslationFile,
} from './image-translation.validation';
import { ImageTranslationOcrService } from './image-translation-ocr.service';

@ApiTags('AI Studio — OCR')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('ai-studio/ocr')
export class OcrController {
  constructor(private readonly ocrService: ImageTranslationOcrService) {}

  @Post()
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
      limits: { fileSize: IMAGE_TRANSLATION_MAX_BYTES },
      fileFilter: (_request, file, callback) => {
        const extension = file.originalname.toLowerCase().split('.').pop();
        if (
          !extension ||
          !IMAGE_TRANSLATION_EXTENSIONS.includes(
            extension as (typeof IMAGE_TRANSLATION_EXTENSIONS)[number],
          ) ||
          !IMAGE_TRANSLATION_MIME_TYPES.includes(
            file.mimetype as (typeof IMAGE_TRANSLATION_MIME_TYPES)[number],
          )
        ) {
          return callback(
            new BadRequestException(
              'Supported files are PNG, JPG, JPEG, WEBP, and PDF.',
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async extract(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required.');
    validateImageTranslationFile(file);
    return this.ocrService.extract(file);
  }
}
