import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import type { RequestUser } from '../auth/guards/supabase-auth.guard';
import { WorkspaceQueryDto } from '../knowledge/dto/target.dto';
import {
  CollectionItemDto,
  CreateCollectionDto,
  UpdateCollectionDto,
} from './collections.dto';
import { CollectionsService } from './collections.service';
@ApiTags('Collections')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}
  @Get() list(
    @CurrentUser() user: RequestUser,
    @Query() query: WorkspaceQueryDto,
  ) {
    return this.collections.list(user.userId, query.workspaceId);
  }
  @Post() create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateCollectionDto,
  ) {
    return this.collections.create(user.userId, body);
  }
  @Patch(':id') update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: UpdateCollectionDto,
  ) {
    return this.collections.update(user.userId, id, body);
  }
  @Delete(':id') remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.collections.remove(user.userId, id);
  }
  @Post(':id/items') addItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: CollectionItemDto,
  ) {
    return this.collections.addItem(user.userId, id, body);
  }
  @Delete(':id/items/:itemId') removeItem(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.collections.removeItem(user.userId, id, itemId);
  }
}
