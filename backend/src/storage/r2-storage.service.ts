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

  constructor(config: ConfigService) {
    const accountId = config.getOrThrow<string>('R2_ACCOUNT_ID');
    this.bucketName = config.getOrThrow<string>('R2_BUCKET_NAME');
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
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
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }
}
