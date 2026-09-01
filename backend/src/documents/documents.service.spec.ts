import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentIngestionService } from './document-ingestion.service';
import { IngestionQueueService } from './ingestion-queue.service';
import { RedisCacheService } from '../infrastructure/redis-cache.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { OBJECT_STORAGE } from '../storage/object-storage';

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: {} },
        {
          provide: WorkspacesService,
          useValue: { ensurePersonalWorkspace: jest.fn() },
        },
        {
          provide: WorkspaceAccessService,
          useValue: { requireRole: jest.fn() },
        },
        {
          provide: DocumentIngestionService,
          useValue: { process: jest.fn() },
        },
        {
          provide: IngestionQueueService,
          useValue: { enabled: false, enqueue: jest.fn() },
        },
        {
          provide: RedisCacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: OBJECT_STORAGE,
          useValue: {
            upload: jest.fn(),
            download: jest.fn(),
            remove: jest.fn(),
            getSignedUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
