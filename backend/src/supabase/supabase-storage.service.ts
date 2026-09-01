import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';
import type { ObjectStorage } from '../storage/object-storage';

@Injectable()
export class SupabaseStorageService implements ObjectStorage {
  private readonly bucket: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {
    this.bucket =
      this.configService.get<string>('SUPABASE_STORAGE_BUCKET') ?? 'documents';
  }

  get bucketName() {
    return this.bucket;
  }

  /** Uploads a buffer (e.g. from multer memoryStorage) and returns its storage key. */
  async upload(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    try {
      const { error } = await this.supabaseService.admin.storage
        .from(this.bucket)
        .upload(key, buffer, { contentType, upsert: false });

      if (!error) return key;
    } catch {
      // Supabase offline; fall back to local disk storage
    }

    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const localDir = path.resolve(process.cwd(), 'uploads', path.dirname(key));
    await fs.mkdir(localDir, { recursive: true });
    await fs.writeFile(path.resolve(process.cwd(), 'uploads', key), buffer);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    try {
      const { data, error } = await this.supabaseService.admin.storage
        .from(this.bucket)
        .download(key);

      if (!error && data) {
        const arrayBuffer = await data.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    } catch {
      // Supabase offline fallback
    }

    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    return fs.readFile(path.resolve(process.cwd(), 'uploads', key));
  }

  async remove(key: string): Promise<void> {
    try {
      await this.supabaseService.admin.storage.from(this.bucket).remove([key]);
    } catch {
      // ignore
    }
    try {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      await fs.unlink(path.resolve(process.cwd(), 'uploads', key));
    } catch {
      // ignore
    }
  }

  /** Signed URL the frontend can use to preview/download the original file. */
  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    try {
      const { data, error } = await this.supabaseService.admin.storage
        .from(this.bucket)
        .createSignedUrl(key, expiresInSeconds);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch {
      // Supabase offline fallback
    }

    // Local fallback: read file as base64 data URI for instant rendering
    try {
      const buffer = await this.download(key);
      const ext = key.split('.').pop()?.toLowerCase();
      const mime =
        ext === 'png'
          ? 'image/png'
          : ext === 'jpg' || ext === 'jpeg'
            ? 'image/jpeg'
            : ext === 'webp'
              ? 'image/webp'
              : ext === 'svg'
                ? 'image/svg+xml'
                : ext === 'wav'
                  ? 'audio/wav'
                  : ext === 'mp3'
                    ? 'audio/mpeg'
                    : 'application/octet-stream';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
      return `/uploads/${key}`;
    }
  }
}
