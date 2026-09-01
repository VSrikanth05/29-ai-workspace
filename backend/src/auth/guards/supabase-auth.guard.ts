import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';

export interface RequestUser {
  userId: string;
  email: string;
}

/**
 * Validates the `Authorization: Bearer <supabase-access-token>` header against
 * Supabase Auth directly (no local JWT secret needed) and attaches the user
 * to `req.user` for downstream handlers/decorators.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token || token.length > 8192 || /[\r\n\0]/.test(token))
      throw new UnauthorizedException('Malformed bearer token');
    const user = await this.supabaseService.getUserFromToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    (request as Request & { user: RequestUser }).user = {
      userId: user.id,
      email: user.email ?? '',
    };

    return true;
  }
}
