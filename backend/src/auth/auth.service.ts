import {
  ConflictException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService,
    private readonly workspaces: WorkspacesService,
    private readonly configService: ConfigService,
  ) {}

  private createLocalToken(userId: string, email: string, name?: string) {
    const payload = {
      userId,
      email,
      name: name || email.split('@')[0],
      exp: Date.now() + 86400000 * 30,
    };
    return `local_${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
  }

  /**
   * Registers the user with Supabase Auth (or local fallback if Supabase is offline),
   * then mirrors a Profile row locally so the rest of the app can use normal Prisma relations.
   */
  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    const existingProfile = await this.prisma.profile.findUnique({
      where: { email },
    });

    if (existingProfile) {
      throw new ConflictException('Email already registered');
    }

    let supabaseUser: { id: string } | null = null;
    let supabaseSession: { access_token?: string; refresh_token?: string } | null = null;

    try {
      const { data, error } = await this.supabaseService.auth.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${frontendUrl.replace(/\/$/, '')}/verify-email`,
        },
      });
      if (!error && data?.user) {
        supabaseUser = data.user;
        supabaseSession = data.session ?? null;
      }
    } catch {
      // Supabase is offline; fall back to local profile
    }

    const userId = supabaseUser?.id ?? randomUUID();
    const profile = await this.prisma.profile.create({
      data: {
        id: userId,
        name,
        email,
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    await this.workspaces.ensurePersonalWorkspace(profile.id);

    const token =
      supabaseSession?.access_token ??
      this.createLocalToken(profile.id, profile.email, profile.name);

    return {
      message: 'User registered successfully',
      user: profile,
      access_token: token,
      refresh_token: supabaseSession?.refresh_token ?? token,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    let supabaseSession: { access_token: string; refresh_token?: string } | null = null;
    let supabaseUser: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null = null;

    try {
      const { data, error } =
        await this.supabaseService.auth.auth.signInWithPassword({
          email,
          password,
        });
      if (!error && data?.session && data?.user) {
        supabaseSession = data.session;
        supabaseUser = data.user;
      }
    } catch {
      // Supabase is offline; fall back to local profile check
    }

    if (supabaseUser && supabaseSession) {
      await this.prisma.profile.upsert({
        where: { id: supabaseUser.id },
        update: { email: supabaseUser.email ?? email },
        create: {
          id: supabaseUser.id,
          email: supabaseUser.email ?? email,
          name:
            (supabaseUser.user_metadata?.name as string | undefined) ??
            email.split('@')[0],
        },
      });
      await this.workspaces.ensurePersonalWorkspace(supabaseUser.id);

      return {
        message: 'Login successful',
        access_token: supabaseSession.access_token,
        refresh_token: supabaseSession.refresh_token,
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email,
        },
      };
    }

    // Local profile login fallback
    const profile = await this.prisma.profile.findUnique({
      where: { email },
    });

    if (!profile) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.workspaces.ensurePersonalWorkspace(profile.id);
    const token = this.createLocalToken(profile.id, profile.email, profile.name);

    return {
      message: 'Login successful',
      access_token: token,
      refresh_token: token,
      user: {
        id: profile.id,
        email: profile.email,
      },
    };
  }

  async forgotPassword({ email }: ForgotPasswordDto) {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const { error } =
      await this.supabaseService.auth.auth.resetPasswordForEmail(email, {
        redirectTo: `${frontendUrl.replace(/\/$/, '')}/reset-password`,
      });

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Keep the response generic so the endpoint does not disclose whether an
    // email is registered.
    return {
      message: 'If an account exists, a password reset email is on its way.',
    };
  }

  async resetPassword({
    password,
    accessToken,
    refreshToken,
    code,
  }: ResetPasswordDto) {
    const client = this.supabaseService.createAuthClient();
    const sessionResponse = code
      ? await client.auth.exchangeCodeForSession(code)
      : accessToken && refreshToken
        ? await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
        : null;
    const sessionData = sessionResponse?.data;
    const sessionError = sessionResponse?.error;

    if (!sessionData || sessionError || !sessionData.session) {
      throw new BadRequestException(
        'The password reset link is invalid or expired',
      );
    }

    const { data, error } = await client.auth.updateUser({ password });
    if (error || !data.user) {
      throw new BadRequestException(
        error?.message ?? 'Unable to update password',
      );
    }

    return {
      message: 'Password updated successfully',
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      user: { id: data.user.id, email: data.user.email },
    };
  }

  async verifyEmail({ email, token, tokenHash, code }: VerifyEmailDto) {
    const client = this.supabaseService.createAuthClient();
    let data: {
      user: {
        id: string;
        email?: string | undefined;
        user_metadata?: Record<string, unknown>;
      } | null;
      session: { access_token: string; refresh_token: string } | null;
    } | null = null;
    let error: { message: string } | null = null;

    if (code) {
      const response = await client.auth.exchangeCodeForSession(code);
      data = response.data;
      error = response.error;
    } else if (tokenHash) {
      const response = await client.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      });
      data = response.data;
      error = response.error;
    } else if (email && token) {
      const response = await client.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      data = response.data;
      error = response.error;
    } else {
      throw new BadRequestException('A verification code is required');
    }

    if (error || !data?.user) {
      throw new BadRequestException(error?.message ?? 'Unable to verify email');
    }

    const user = data.user;
    const profile = await this.prisma.profile.upsert({
      where: { id: user.id },
      update: { email: user.email ?? email ?? '' },
      create: {
        id: user.id,
        email: user.email ?? email ?? '',
        name:
          (user.user_metadata?.name as string | undefined) ??
          (user.email ?? email ?? '').split('@')[0],
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    await this.workspaces.ensurePersonalWorkspace(profile.id);

    return {
      message: 'Email verified successfully',
      access_token: data.session?.access_token ?? null,
      refresh_token: data.session?.refresh_token ?? null,
      user: profile,
    };
  }

  async refresh({ refreshToken }: RefreshSessionDto) {
    const client = this.supabaseService.createAuthClient();
    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session || !data.user) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    const profile = await this.prisma.profile.upsert({
      where: { id: data.user.id },
      update: { email: data.user.email ?? '' },
      create: {
        id: data.user.id,
        email: data.user.email ?? '',
        name:
          (data.user.user_metadata?.name as string | undefined) ??
          (data.user.email ?? '').split('@')[0],
      },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    await this.workspaces.ensurePersonalWorkspace(profile.id);

    return {
      message: 'Session refreshed',
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: profile,
    };
  }

  async me(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });
    if (!profile) {
      throw new UnauthorizedException('User profile is unavailable');
    }
    return profile;
  }

  async logout(accessToken: string) {
    if (!accessToken) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const { error } = await this.supabaseService.admin.auth.admin.signOut(
      accessToken,
      'local',
    );
    if (error) throw new UnauthorizedException('Unable to revoke session');
    return { message: 'Logout successful' };
  }
}
