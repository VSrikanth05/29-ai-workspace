import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseAuthGuard, type RequestUser } from '../auth/guards/supabase-auth.guard';
import { GenerateStudioDiagramDto } from './dto/generate-studio-diagram.dto';
import { DiagramService } from './diagram.service';

@ApiTags('AI Studio — Diagram')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('ai-studio')
export class StudioDiagramController {
  constructor(private readonly diagrams: DiagramService) {}

  @Post('diagram')
  generate(@Body() dto: GenerateStudioDiagramDto, @CurrentUser() user: RequestUser) {
    return this.diagrams.generateStudioDiagram(user.userId, dto);
  }
}
