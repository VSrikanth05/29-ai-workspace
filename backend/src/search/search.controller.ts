import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import type { RequestUser } from '../auth/guards/supabase-auth.guard';
import { CreateSavedSearchDto, SavedSearchListQueryDto, SearchQueryDto } from '../knowledge/dto/target.dto';
import { SearchService } from './search.service';
@UseGuards(SupabaseAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}
  @Get() search(
    @CurrentUser() user: RequestUser,
    @Query() query: SearchQueryDto,
  ) {
    return this.searchService.search(
      user.userId,
      query.workspaceId,
      query.query,
      query.tagId,
      query.mode,
    );
  }

  @Get('saved') listSaved(@CurrentUser() user: RequestUser, @Query() query: SavedSearchListQueryDto) {
    return this.searchService.listSaved(user.userId, query.workspaceId);
  }

  @Post('saved') createSaved(@CurrentUser() user: RequestUser, @Body() dto: CreateSavedSearchDto) {
    return this.searchService.createSaved(user.userId, dto);
  }

  @Delete('saved/:id') removeSaved(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.searchService.removeSaved(user.userId, id);
  }
}
