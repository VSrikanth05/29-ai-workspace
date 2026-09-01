import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  SupabaseAuthGuard,
  type RequestUser,
} from '../../auth/guards/supabase-auth.guard';
import { ToolRequestDto } from '../dto/tool-request.dto';
import { MindMapService } from './mind-map.service';
@ApiTags('AI Studio — Mind Map')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('ai-studio')
export class MindMapController {
  constructor(private readonly service: MindMapService) {}
  @Post('mind-map') generate(
    @Body() dto: ToolRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.generate(user.userId, dto);
  }
}
