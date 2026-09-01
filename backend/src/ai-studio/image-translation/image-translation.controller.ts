import { BadRequestException, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SupabaseAuthGuard, type RequestUser } from '../../auth/guards/supabase-auth.guard';
import { IMAGE_TRANSLATION_EXTENSIONS, IMAGE_TRANSLATION_MIME_TYPES, IMAGE_TRANSLATION_MAX_BYTES, validateImageTranslationFile } from './image-translation.validation';
import { ImageTranslationService } from './image-translation.service';
import { ImageTranslationRequestDto } from './image-translation.dto';

@ApiTags('AI Studio — Image Translation')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('ai-studio/image-translation')
export class ImageTranslationController {
  constructor(private readonly service: ImageTranslationService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, workspaceId: { type: 'string' }, sourceLanguage: { type: 'string' }, targetLanguage: { type: 'string' } }, required: ['file', 'workspaceId', 'targetLanguage'] } })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: IMAGE_TRANSLATION_MAX_BYTES }, fileFilter: (_request, file, callback) => { const extension = file.originalname.toLowerCase().split('.').pop(); if (!extension || !IMAGE_TRANSLATION_EXTENSIONS.includes(extension as (typeof IMAGE_TRANSLATION_EXTENSIONS)[number]) || !IMAGE_TRANSLATION_MIME_TYPES.includes(file.mimetype as (typeof IMAGE_TRANSLATION_MIME_TYPES)[number])) return callback(new BadRequestException('Supported files are PNG, JPG, JPEG, WEBP, and PDF.'), false); callback(null, true); } }))
  async translate(@UploadedFile() file: Express.Multer.File, @Body() dto: ImageTranslationRequestDto, @CurrentUser() user: RequestUser) {
    if (!file) throw new BadRequestException('File is required.');
    validateImageTranslationFile(file);
    return this.service.translate(user.userId, file, dto);
  }

  @Get(':id') get(@Param('id') id: string, @CurrentUser() user: RequestUser) { return this.service.get(user.userId, id); }
  @Post(':id/save') save(@Param('id') id: string, @CurrentUser() user: RequestUser) { return this.service.saveToOutputLibrary(user.userId, id); }
}
