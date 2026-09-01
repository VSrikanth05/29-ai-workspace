import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { logout: jest.Mock };

  beforeEach(async () => {
    authService = { logout: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: jest.fn() })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('rejects logout without a bearer header', () => {
    expect(() => controller.logout()).toThrow('Missing bearer token');
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('passes only the bearer token to the service', async () => {
    await controller.logout('Bearer  token-value  ');
    expect(authService.logout).toHaveBeenCalledWith('token-value');
  });
});
