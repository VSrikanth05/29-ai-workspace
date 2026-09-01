import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditRecord {
  action: string;
  userId?: string;
  workspaceId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');
  constructor(private readonly prisma: PrismaService) {}

  async record(record: AuditRecord): Promise<void> {
    const safe = {
      ...record,
      ipAddress: record.ipAddress?.slice(0, 64),
      userAgent: record.userAgent?.slice(0, 500),
      requestId: record.requestId?.slice(0, 100),
      metadata: record.metadata
        ? (JSON.parse(
            JSON.stringify(record.metadata),
          ) as Prisma.InputJsonObject)
        : undefined,
    };
    try {
      await this.prisma.auditEvent.create({ data: safe });
      this.logger.log(
        JSON.stringify({
          event: 'audit_recorded',
          ...safe,
          metadata: undefined,
        }),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'audit_write_failed',
          action: record.action,
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}
