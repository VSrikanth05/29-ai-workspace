import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  SupabaseAuthGuard,
  type RequestUser,
} from '../auth/guards/supabase-auth.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@ApiTags('Workspaces')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  @ApiOperation({ summary: 'List workspaces available to the current user' })
  list(@CurrentUser() user: RequestUser) {
    return this.workspaces.list(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a workspace' })
  create(@CurrentUser() user: RequestUser, @Body() body: CreateWorkspaceDto) {
    return this.workspaces.create(user.userId, body);
  }

  @Get(':workspaceId')
  @ApiOperation({ summary: 'Get workspace details and membership' })
  get(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workspaces.get(user.userId, workspaceId);
  }

  @Delete(':workspaceId')
  @ApiOperation({ summary: 'Delete a workspace owned by the current user' })
  remove(
    @CurrentUser() user: RequestUser,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workspaces.remove(user.userId, workspaceId);
  }
}
