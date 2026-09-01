import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  SupabaseAuthGuard,
  type RequestUser,
} from '../../auth/guards/supabase-auth.guard';
import { ToolRequestDto } from '../dto/tool-request.dto';
import { UnderstandService } from './understand.service';

@ApiTags('AI Studio — Understand')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('ai-studio')
export class UnderstandController {
  constructor(private readonly service: UnderstandService) {}
  @Post('explain') explain(
    @Body() dto: ToolRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.explain(user.userId, dto);
  }
  @Post('rewrite') rewrite(
    @Body() dto: ToolRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.rewrite(user.userId, dto);
  }
  @Post('simplify') simplify(
    @Body() dto: ToolRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.simplify(user.userId, dto);
  }
}
