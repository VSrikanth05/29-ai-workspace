import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ObjectStorage } from './object-storage';

@Injectable()
export class R2StorageService implements ObjectStorage {
  readonly bucketName: string;
  private readonly client: S3Client;
  private readonly publicUrl?: string;

  constructor(config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID') || 'mock-r2-account';
    this.bucketName = config.get<string>('R2_BUCKET_NAME') || '29-ai-workspace-sources';
    this.publicUrl = config.get<string>('R2_PUBLIC_URL')?.replace(/\/+$/, '');
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get<string>('R2_ACCESS_KEY_ID') || 'mock-key',
        secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY') || 'mock-secret',
      },
    });
  }

  async upload(key: string, buffer: Buffer, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ContentLength: buffer.length,
      }),
    );
    return key;
  }

  async download(key: string) {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
    if (!response.Body) throw new Error('Storage object has no body');
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async remove(key: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
  }

  getSignedUrl(key: string, expiresInSeconds = 3600) {
    if (this.publicUrl) {
      return Promise.resolve(`${this.publicUrl}/${key}`);
    }
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }
}
