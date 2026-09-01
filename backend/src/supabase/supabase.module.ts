import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { SupabaseStorageService } from './supabase-storage.service';

/**
 * @Global so every feature module (auth, documents, chat, ...) can inject
 * SupabaseService / SupabaseStorageService without re-importing this module.
 */
@Global()
@Module({
  providers: [SupabaseService, SupabaseStorageService],
  exports: [SupabaseService, SupabaseStorageService],
})
export class SupabaseModule {}
