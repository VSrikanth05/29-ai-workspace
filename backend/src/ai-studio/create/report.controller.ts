import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  SupabaseAuthGuard,
  type RequestUser,
} from '../../auth/guards/supabase-auth.guard';
import { ReportRequestDto, ToolRequestDto } from '../dto/tool-request.dto';
import { ReportService } from './report.service';
import { PresentationService } from './presentation.service';

@ApiTags('AI Studio — Create')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('ai-studio')
export class ReportController {
  constructor(
    private readonly service: ReportService,
    private readonly presentationService: PresentationService,
  ) {}

  @Post('report')
  report(
    @Body() dto: ReportRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.generate(user.userId, dto);
  }

  @Post('presentation')
  presentation(
    @Body() dto: ToolRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.presentationService.generate(user.userId, dto);
  }
}
