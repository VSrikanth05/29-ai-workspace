import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  SupabaseAuthGuard,
  type RequestUser,
} from '../auth/guards/supabase-auth.guard';
import { MediaGenerationService } from './media-generation.service';
import { MediaGenerationDto } from './dto/media-generation.dto';

class MediaListQueryDto {
  @IsUUID()
  workspaceId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaGenerationService) {}

  @Get('capabilities')
  capabilities() {
    return this.media.capabilities();
  }

  @Get()
  list(@CurrentUser() user: RequestUser, @Query() query: MediaListQueryDto) {
    return this.media.list(user.userId, query.workspaceId, query.limit);
  }

  @Post('generate')
  generate(@CurrentUser() user: RequestUser, @Body() dto: MediaGenerationDto) {
    return this.media.generate(user.userId, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.media.get(user.userId, id);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.media.cancel(user.userId, id);
  }
}
