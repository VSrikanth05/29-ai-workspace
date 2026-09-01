import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  SupabaseAuthGuard,
  type RequestUser,
} from '../../auth/guards/supabase-auth.guard';
import { AnalyticsRequestDto, ChartRequestDto } from '../dto/tool-request.dto';
import { AnalyticsService } from './analytics.service';
import { ChartService } from './chart.service';

@ApiTags('AI Studio — Analytics')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('ai-studio')
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly charts: ChartService,
  ) {}
  @Post('analytics') analyze(
    @Body() dto: AnalyticsRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.analytics.generate(user.userId, dto);
  }
  @Post('chart') chart(
    @Body() dto: ChartRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.charts.generate(user.userId, dto);
  }
}
