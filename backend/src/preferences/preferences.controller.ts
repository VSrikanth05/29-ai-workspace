import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import type { RequestUser } from '../auth/guards/supabase-auth.guard';
import { PreferencesQueryDto, UpdatePreferencesDto } from './preferences.dto';
import { PreferencesService } from './preferences.service';
@UseGuards(SupabaseAuthGuard)
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferences: PreferencesService) {}
  @Get() get(
    @CurrentUser() user: RequestUser,
    @Query() query: PreferencesQueryDto,
  ) {
    return this.preferences.get(user.userId, query.workspaceId);
  }
  @Patch() update(
    @CurrentUser() user: RequestUser,
    @Body() body: UpdatePreferencesDto,
  ) {
    return this.preferences.update(user.userId, body);
  }
}
