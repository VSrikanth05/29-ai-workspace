import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  SupabaseAuthGuard,
  type RequestUser,
} from '../auth/guards/supabase-auth.guard';
import { AiStudioService } from './ai-studio.service';
import {
  ExportOutputQueryDto,
  OutputListQueryDto,
} from './dto/tool-request.dto';
@ApiTags('AI Studio — Outputs')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('ai-studio/outputs')
export class OutputsController {
  constructor(private readonly studio: AiStudioService) {}
  @Get() list(
    @Query() query: OutputListQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.studio.list(
      user.userId,
      query.workspaceId,
      query.limit,
      query.cursor,
    );
  }
  @Get(':id/export') export(
    @Param('id') id: string,
    @Query() query: ExportOutputQueryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.studio.export(user.userId, id, query.format);
  }
  @Get(':id') get(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.studio.get(user.userId, id);
  }
  @Post(':id/regenerate') regenerate(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.studio.regenerate(user.userId, id);
  }
}
