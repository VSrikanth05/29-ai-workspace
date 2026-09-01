import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import type { RequestUser } from '../auth/guards/supabase-auth.guard';
import { TargetDto, WorkspaceQueryDto } from './dto/target.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('Favorites')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}
  @Get() list(
    @CurrentUser() user: RequestUser,
    @Query() query: WorkspaceQueryDto,
  ) {
    return this.favorites.list(user.userId, query.workspaceId);
  }
  @Post() create(@CurrentUser() user: RequestUser, @Body() body: TargetDto) {
    return this.favorites.create(user.userId, body);
  }
  @Delete(':id') remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.favorites.remove(user.userId, id);
  }
}
