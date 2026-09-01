import { Prisma } from '@prisma/client';
import type { RetrievalRequest } from './retrieval.types';

const MAX_FILTER_VALUES = 50;

export function buildMetadataFilterSql(request: RetrievalRequest): Prisma.Sql {
  const conditions: Prisma.Sql[] = [
    request.workspaceId
      ? Prisma.sql`d."workspaceId" = ${request.workspaceId}`
      : Prisma.sql`d."userId" = ${request.userId}`,
  ];

  if (request.documentId) {
    conditions.push(Prisma.sql`c."documentId" = ${request.documentId}`);
  }

  const documentIds = request.metadataFilter?.documentIds
    ?.filter(Boolean)
    .slice(0, MAX_FILTER_VALUES);
  if (documentIds?.length) {
    conditions.push(
      Prisma.sql`c."documentId" IN (${Prisma.join(documentIds)})`,
    );
  }

  const mimeTypes = request.metadataFilter?.mimeTypes
    ?.filter(Boolean)
    .slice(0, MAX_FILTER_VALUES);
  if (mimeTypes?.length) {
    conditions.push(Prisma.sql`d."mimeType" IN (${Prisma.join(mimeTypes)})`);
  }

  const createdAfter = validDate(request.metadataFilter?.createdAfter);
  if (createdAfter) {
    conditions.push(Prisma.sql`d."createdAt" >= ${createdAfter}`);
  }

  const createdBefore = validDate(request.metadataFilter?.createdBefore);
  if (createdBefore) {
    conditions.push(Prisma.sql`d."createdAt" <= ${createdBefore}`);
  }

  return Prisma.join(conditions, ' AND ');
}

function validDate(value: string | Date | undefined): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
