import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import type { RequestUser } from '../auth/guards/supabase-auth.guard';
import { KnowledgeOutputsService } from './outputs.service';
class RestoreOutputDto {
  @IsUUID() versionId!: string;
}
@UseGuards(SupabaseAuthGuard)
@Controller('outputs')
export class KnowledgeOutputsController {
  constructor(private readonly outputs: KnowledgeOutputsService) {}
  @Get(':id/versions') versions(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.outputs.versions(user.userId, id);
  }
  @Post(':id/restore') restore(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: RestoreOutputDto,
  ) {
    return this.outputs.restore(user.userId, id, body.versionId);
  }
  @Post(':id/duplicate') duplicate(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.outputs.duplicate(user.userId, id);
  }
  @Delete(':id') remove(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.outputs.remove(user.userId, id);
  }
}
