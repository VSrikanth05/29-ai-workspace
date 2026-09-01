import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    profile: {
      findUnique: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      profile: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: SupabaseService,
          useValue: {
            auth: {
              auth: { signUp: jest.fn(), signInWithPassword: jest.fn() },
            },
          },
        },
        {
          provide: WorkspacesService,
          useValue: { ensurePersonalWorkspace: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects a bearer session whose local profile is missing', async () => {
    prisma.profile.findUnique.mockResolvedValue(null);

    await expect(service.me('missing-user')).rejects.toThrow(
      'User profile is unavailable',
    );
  });

  it('rejects logout when the token is empty', async () => {
    await expect(service.logout('')).rejects.toThrow('Missing bearer token');
  });
});
