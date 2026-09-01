import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OBJECT_STORAGE, type ObjectStorage } from '../../storage/object-storage';
import { WorkspaceAccessService } from '../../workspaces/workspace-access.service';
import { ImageTranslationOcrService } from './image-translation-ocr.service';
import { IMAGE_TRANSLATION_MODEL, ImageTranslationTranslationService } from './image-translation-translation.service';
import { ImageTranslationRendererService } from './image-translation-renderer.service';
import { languageCode } from './image-translation.languages';
import { validateImageTranslationFile } from './image-translation.validation';
import type { ImageTranslationBox } from './image-translation.types';
import type { ImageTranslationRequestDto } from './image-translation.dto';

@Injectable()
export class ImageTranslationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly ocr: ImageTranslationOcrService,
    private readonly translation: ImageTranslationTranslationService,
    private readonly renderer: ImageTranslationRendererService,
    private readonly config: ConfigService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async translate(userId: string, file: Express.Multer.File, dto: ImageTranslationRequestDto) {
    const fileInfo = validateImageTranslationFile(file);
    await this.access.requireRole(dto.workspaceId, userId, WorkspaceRole.EDITOR);
    const originalStoragePath = `image-translations/${dto.workspaceId}/${userId}/${randomUUID()}-original.${fileInfo.extension}`;
    await this.storage.upload(originalStoragePath, file.buffer, file.mimetype);
    const record = await this.prisma.imageTranslation.create({ data: { originalName: file.originalname.replace(/[\r\n]/g, '_').slice(0, 255), mimeType: file.mimetype, size: file.size, status: 'PROCESSING', sourceLanguage: dto.sourceLanguage?.trim() || 'auto', targetLanguage: languageCode(dto.targetLanguage), extractedText: '', translatedText: '', ocrBoxes: [], originalStoragePath, userId, workspaceId: dto.workspaceId } });
    try {
      const ocr = await this.ocr.extract(file);
      const sourceLanguage = dto.sourceLanguage?.trim() ? languageCode(dto.sourceLanguage) : await this.detectLanguage(userId, ocr.text, ocr.language);
      const targetLanguage = languageCode(dto.targetLanguage);
      const texts = ocr.boxes.length ? ocr.boxes.map((box) => box.text) : [ocr.text];
      const translatedTexts = await this.translation.translate(texts, sourceLanguage, targetLanguage);
      const translatedText = translatedTexts.join('\n');
      const rendered = await this.renderer.render(file, ocr.boxes, translatedTexts);
      const extension = rendered.mimeType === 'image/svg+xml' ? 'svg' : rendered.mimeType.split('/')[1] || 'png';
      const translatedStoragePath = `image-translations/${dto.workspaceId}/${userId}/${record.id}-translated.${extension}`;
      await this.storage.upload(translatedStoragePath, rendered.bytes, rendered.mimeType);
      const updated = await this.prisma.imageTranslation.update({ where: { id: record.id }, data: { status: 'COMPLETED', sourceLanguage, targetLanguage, extractedText: ocr.text.slice(0, 200_000), translatedText: translatedText.slice(0, 200_000), ocrBoxes: ocr.boxes as unknown as Prisma.InputJsonValue, translatedStoragePath, translatedMimeType: rendered.mimeType, error: null } });
      return this.present(updated);
    } catch (error) {
      await this.prisma.imageTranslation.update({ where: { id: record.id }, data: { status: 'FAILED', error: error instanceof Error ? error.message.slice(0, 500) : 'Image translation failed.' } }).catch(() => undefined);
      if (error instanceof BadRequestException || error instanceof BadGatewayException) throw error;
      throw new BadGatewayException('Image translation could not be completed.');
    }
  }

  async get(userId: string, id: string) {
    const record = await this.prisma.imageTranslation.findFirst({ where: { id, userId } });
    if (!record) throw new NotFoundException('Image translation not found.');
    await this.access.requireRole(record.workspaceId, userId);
    return this.present(record);
  }

  async saveToOutputLibrary(userId: string, id: string) {
    const record = await this.prisma.imageTranslation.findFirst({ where: { id, userId } });
    if (!record) throw new NotFoundException('Image translation not found.');
    await this.access.requireRole(record.workspaceId, userId, WorkspaceRole.EDITOR);
    if (record.outputId) return this.prisma.aIOutput.findUnique({ where: { id: record.outputId } });
    const conversation = await this.prisma.chatSession.create({ data: { title: `Image Translation — ${record.originalName}`, userId, workspaceId: record.workspaceId, provider: 'huggingface', model: IMAGE_TRANSLATION_MODEL, metadata: { imageTranslationId: record.id } } });
    const output = await this.prisma.aIOutput.create({ data: { type: 'TRANSLATION', title: `Image Translation — ${record.originalName}`, content: { format: 'image-translation', imageTranslationId: record.id, extractedText: record.extractedText, translatedText: record.translatedText, sourceLanguage: record.sourceLanguage, targetLanguage: record.targetLanguage }, metadata: { imageTranslationId: record.id, translatedStoragePath: record.translatedStoragePath }, provider: 'huggingface', model: IMAGE_TRANSLATION_MODEL, userId, workspaceId: record.workspaceId, conversationId: conversation.id } });
    await this.prisma.imageTranslation.update({ where: { id }, data: { outputId: output.id } });
    return output;
  }

  private async detectLanguage(userId: string, text: string, providerLanguage?: string) {
    const configured = this.config.get<string>('IMAGE_TRANSLATION_LANGUAGE_URL')?.trim();
    if (configured) {
      const response = await fetch(configured, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, userId }), signal: AbortSignal.timeout(30_000) });
      if (response.ok) {
        const payload = (await response.json()) as { language?: string; lang?: string };
        if (payload.language || payload.lang) return languageCode(payload.language ?? payload.lang ?? 'eng_Latn');
      }
    }
    if (providerLanguage) return languageCode(providerLanguage);
    return detectByScript(text);
  }

  private async present(record: { id: string; originalName: string; mimeType: string; size: number; status: string; sourceLanguage: string; targetLanguage: string; extractedText: string; translatedText: string; ocrBoxes: Prisma.JsonValue; translatedMimeType: string | null; error: string | null; originalStoragePath: string; translatedStoragePath: string | null; workspaceId: string; createdAt: Date; updatedAt: Date }) {
    return { id: record.id, originalName: record.originalName, mimeType: record.mimeType, size: record.size, status: record.status, sourceLanguage: record.sourceLanguage, targetLanguage: record.targetLanguage, extractedText: record.extractedText, translatedText: record.translatedText, ocrBoxes: record.ocrBoxes, translatedMimeType: record.translatedMimeType, error: record.error, originalUrl: await this.storage.getSignedUrl(record.originalStoragePath), translatedUrl: record.translatedStoragePath ? await this.storage.getSignedUrl(record.translatedStoragePath) : null, workspaceId: record.workspaceId, createdAt: record.createdAt, updatedAt: record.updatedAt };
  }
}

function detectByScript(text: string) {
  if (/[\u0900-\u097f]/u.test(text)) return 'hin_Deva';
  if (/[\u4e00-\u9fff]/u.test(text)) return 'zho_Hans';
  if (/[\u3040-\u30ff]/u.test(text)) return 'jpn_Jpan';
  if (/[\uac00-\ud7af]/u.test(text)) return 'kor_Hang';
  if (/[\u0600-\u06ff]/u.test(text)) return 'arb_Arab';
  if (/[\u0b80-\u0bff]/u.test(text)) return 'tam_Taml';
  return 'eng_Latn';
}
