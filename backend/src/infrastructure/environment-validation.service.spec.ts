import { ConfigService } from '@nestjs/config';
import { EnvironmentValidationService } from './environment-validation.service';
describe('EnvironmentValidationService', () => {
  it('logs warning without throwing for incomplete production configuration', () => {
    const service = new EnvironmentValidationService({
      get: (name: string) => (name === 'NODE_ENV' ? 'production' : undefined),
    } as unknown as ConfigService);
    expect(() => service.onModuleInit()).not.toThrow();
  });
  it('does not require production secrets during tests', () => {
    const service = new EnvironmentValidationService({
      get: () => 'test',
    } as unknown as ConfigService);
    expect(() => service.onModuleInit()).not.toThrow();
  });
});
