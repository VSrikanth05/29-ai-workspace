import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvironmentValidationService implements OnModuleInit {
  private readonly logger = new Logger(EnvironmentValidationService.name);
  constructor(private readonly config: ConfigService) {}
  onModuleInit(): void {
    if (this.config.get<string>('NODE_ENV') !== 'production') return;
    const missing: string[] = [];
    const require = (name: string) => {
      const value = this.config.get<string>(name);
      if (!value || value === 'replace-me') missing.push(name);
    };
    require('DATABASE_URL');
    require('DIRECT_URL');
    require('SUPABASE_URL');
    require('SUPABASE_ANON_KEY');
    require('SUPABASE_SERVICE_ROLE_KEY');
    require('CORS_ORIGINS');
    require('FRONTEND_URL');
    if (this.config.get<string>('REDIS_REQUIRED') === 'true')
      require('REDIS_URL');
    if (this.config.get<string>('STORAGE_PROVIDER') === 'r2') {
      require('R2_ACCOUNT_ID');
      require('R2_ACCESS_KEY_ID');
      require('R2_SECRET_ACCESS_KEY');
      require('R2_BUCKET_NAME');
    } else require('SUPABASE_STORAGE_BUCKET');
    const providerKeys: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      gpt: 'OPENAI_API_KEY',
      gemini: 'GEMINI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      claude: 'ANTHROPIC_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
      nvidia: 'NVIDIA_API_KEY',
    };
    const configuredKeys = [
      'OPENAI_API_KEY',
      'GEMINI_API_KEY',
      'ANTHROPIC_API_KEY',
      'OPENROUTER_API_KEY',
      'NVIDIA_API_KEY',
    ];
    if (!configuredKeys.some((name) => Boolean(this.config.get<string>(name))))
      missing.push('at least one LLM provider API key');
    const selectedProvider =
      this.config.get<string>('LLM_PROVIDER') ?? 'gemini';
    const selectedKey = providerKeys[selectedProvider];
    if (!selectedKey) missing.push('a supported LLM_PROVIDER');
    else if (!this.config.get<string>(selectedKey)) missing.push(selectedKey);
    const origins = this.config.get<string>('CORS_ORIGINS') ?? '';
    if (origins.includes('*'))
      throw new Error('CORS_ORIGINS cannot contain a wildcard in production');
    for (const name of [
      'FRONTEND_URL',
      ...(this.config.get<string>('OTEL_ENABLED') === 'true'
        ? ['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT']
        : []),
    ]) {
      const value = this.config.get<string>(name);
      if (value) {
        try {
          new URL(value);
        } catch {
          throw new Error(`${name} must be an absolute URL`);
        }
      }
    }
    if (missing.length) {
      this.logger.warn(
        `Production configuration notice: ${missing.join(', ')}`,
      );
    } else {
      this.logger.log(
        JSON.stringify({ event: 'production_environment_validated' }),
      );
    }
  }
}
