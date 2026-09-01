import { ConfigService } from '@nestjs/config';
import { EnvironmentValidationService } from './environment-validation.service';
describe('EnvironmentValidationService', () => {
  it('fails fast for incomplete production configuration', () => {
    const service = new EnvironmentValidationService({
      get: (name: string) => (name === 'NODE_ENV' ? 'production' : undefined),
    } as unknown as ConfigService);
    expect(() => service.onModuleInit()).toThrow(
      /Missing required production configuration/,
    );
  });
  it('does not require production secrets during tests', () => {
    const service = new EnvironmentValidationService({
      get: () => 'test',
    } as unknown as ConfigService);
    expect(() => service.onModuleInit()).not.toThrow();
  });
});
