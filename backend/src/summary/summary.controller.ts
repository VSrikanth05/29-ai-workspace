import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SummaryService } from './summary.service';
import { GenerateSummaryDto } from './dto/generate-summary.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/guards/supabase-auth.guard';

@ApiTags('Summaries')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('documents/:id/summary')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a new AI summary for a document' })
  generate(
    @Param('id') id: string,
    @Body() dto: GenerateSummaryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.summaryService.generateSummary(user.userId, id, dto.provider);
  }

  @Get()
  @ApiOperation({
    summary: 'List previously generated summaries for a document',
  })
  list(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.summaryService.listSummaries(user.userId, id);
  }
}
