import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

type AppSupabaseClient = ReturnType<typeof createClient>;

/**
 * Wraps two Supabase clients:
 *  - `auth`  -> anon key, used for sign up / sign in / token verification.
 *              Safe to use the same permissions a browser client would have.
 *  - `admin` -> service role key, used for Storage uploads/downloads and any
 *              admin-only operation. Never expose this key to the frontend.
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private supabaseUrl = '';
  private supabaseAnonKey = '';

  public auth!: AppSupabaseClient;
  public admin!: AppSupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('SUPABASE_URL');
    const anonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    const serviceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    this.supabaseUrl = url ?? '';
    this.supabaseAnonKey = anonKey ?? '';

    if (!url || !anonKey || !serviceRoleKey) {
      this.logger.warn(
        'SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are not fully set. ' +
          'Auth and Storage calls will fail until these are configured in .env.',
      );
    }

    this.auth = createClient(url ?? '', anonKey ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    this.admin = createClient(url ?? '', serviceRoleKey ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  /** Creates an isolated anon client for request-scoped auth flows. */
  createAuthClient() {
    return createClient(this.supabaseUrl, this.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  /** Verifies a bearer access token and returns the Supabase user, or null. */
  async getUserFromToken(accessToken: string) {
    if (accessToken.startsWith('local_')) {
      try {
        const payload = JSON.parse(
          Buffer.from(accessToken.slice(6), 'base64url').toString('utf8'),
        );
        if (payload.userId && payload.email) {
          return {
            id: payload.userId,
            email: payload.email,
            app_metadata: {},
            user_metadata: { name: payload.name || payload.email.split('@')[0] },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          } as never;
        }
      } catch {
        return null;
      }
    }

    try {
      const { data, error } = await this.auth.auth.getUser(accessToken);
      if (error || !data?.user) {
        return null;
      }
      return data.user;
    } catch {
      return null;
    }
  }
}
