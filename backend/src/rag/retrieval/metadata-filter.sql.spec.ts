import { buildMetadataFilterSql } from './metadata-filter.sql';

describe('buildMetadataFilterSql', () => {
  it('always scopes retrieval to the owning user and applies optional filters', () => {
    const createdAfter = '2026-01-01T00:00:00.000Z';
    const createdBefore = '2026-07-01T00:00:00.000Z';
    const sql = buildMetadataFilterSql({
      userId: 'user-1',
      query: 'question',
      documentId: 'session-document',
      metadataFilter: {
        documentIds: ['document-a', 'document-b'],
        mimeTypes: ['application/pdf'],
        createdAfter,
        createdBefore,
      },
    });

    expect(sql.strings.join('')).toContain('d."userId" = ');
    expect(sql.strings.join('')).toContain('c."documentId" IN (');
    expect(sql.strings.join('')).toContain('d."mimeType" IN (');
    expect(sql.values).toEqual(
      expect.arrayContaining([
        'user-1',
        'session-document',
        'document-a',
        'document-b',
        'application/pdf',
        new Date(createdAfter),
        new Date(createdBefore),
      ]),
    );
  });

  it('ignores invalid date filters rather than emitting invalid SQL values', () => {
    const sql = buildMetadataFilterSql({
      userId: 'user-1',
      query: 'question',
      metadataFilter: { createdAfter: 'not-a-date' },
    });

    expect(sql.values).toEqual(['user-1']);
  });

  it('scopes workspace retrieval to every document in the workspace', () => {
    const sql = buildMetadataFilterSql({
      userId: 'member-1',
      workspaceId: 'workspace-1',
      query: 'question',
    });

    expect(sql.strings.join('')).toContain('d."workspaceId" = ');
    expect(sql.strings.join('')).not.toContain('d."userId" = ');
    expect(sql.values).toEqual(['workspace-1']);
  });
});
