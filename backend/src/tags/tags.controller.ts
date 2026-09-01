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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import type { RequestUser } from '../auth/guards/supabase-auth.guard';
import { WorkspaceQueryDto } from '../knowledge/dto/target.dto';
import { AssignTagDto, CreateTagDto, UpdateTagDto } from './tags.dto';
import { TagsService } from './tags.service';
@UseGuards(SupabaseAuthGuard)
@Controller('tags')
export class TagsController {
  constructor(private readonly tags: TagsService) {}
  @Get() list(
    @CurrentUser() user: RequestUser,
    @Query() query: WorkspaceQueryDto,
  ) {
    return this.tags.list(user.userId, query.workspaceId);
  }
  @Post() create(@CurrentUser() user: RequestUser, @Body() body: CreateTagDto) {
    return this.tags.create(user.userId, body);
  }
  @Patch(':id') update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: UpdateTagDto,
  ) {
    return this.tags.update(user.userId, id, body);
  }
  @Delete(':id') remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.tags.remove(user.userId, id);
  }
  @Post(':id/assign') assign(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: AssignTagDto,
  ) {
    return this.tags.assign(user.userId, id, body);
  }
  @Delete(':id/assignments/:assignmentId') unassign(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.tags.unassign(user.userId, id, assignmentId);
  }
}
