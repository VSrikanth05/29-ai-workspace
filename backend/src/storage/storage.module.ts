import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseStorageService } from '../supabase/supabase-storage.service';
import { OBJECT_STORAGE, type ObjectStorage } from './object-storage';
import { R2StorageService } from './r2-storage.service';

@Global()
@Module({
  providers: [
    {
      provide: OBJECT_STORAGE,
      inject: [ConfigService, SupabaseStorageService],
      useFactory: (
        config: ConfigService,
        supabase: SupabaseStorageService,
      ): ObjectStorage =>
        config.get<string>('STORAGE_PROVIDER') === 'r2'
          ? new R2StorageService(config)
          : supabase,
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
