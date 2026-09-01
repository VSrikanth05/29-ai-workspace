import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { languageCode } from './image-translation.languages';

export const IMAGE_TRANSLATION_MODEL = 'facebook/nllb-200-distilled-600M';

@Injectable()
export class ImageTranslationTranslationService {
  constructor(private readonly config: ConfigService) {}

  async translate(texts: string[], sourceLanguage: string, targetLanguage: string) {
    const token = this.config.get<string>('HUGGINGFACE_API_TOKEN')?.trim();
    const endpoint = this.config.get<string>('IMAGE_TRANSLATION_NLLB_URL')?.trim() || `https://api-inference.huggingface.co/models/${IMAGE_TRANSLATION_MODEL}`;
    if (!token && !this.config.get<string>('IMAGE_TRANSLATION_NLLB_URL')?.trim()) throw new BadGatewayException('Hugging Face is not configured for image translation.');
    const response = await fetch(endpoint, { method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify({ inputs: texts, parameters: { src_lang: languageCode(sourceLanguage), tgt_lang: languageCode(targetLanguage), wait_for_model: true } }), signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new BadGatewayException(`Translation service failed (${response.status}).`);
    const payload: unknown = await response.json();
    const result = this.parse(payload);
    if (result.length !== texts.length) throw new BadGatewayException('Translation service returned an unexpected number of results.');
    return result;
  }

  private parse(payload: unknown): string[] {
    if (typeof payload === 'string') return [payload];
    if (!Array.isArray(payload)) return [];
    return payload.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        if (typeof record.translation_text === 'string') return record.translation_text;
        if (typeof record.generated_text === 'string') return record.generated_text;
      }
      return '';
    });
  }
}
