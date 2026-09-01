import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DiagramService } from './diagram.service';
import { GenerateDiagramDto } from './dto/generate-diagram.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/guards/supabase-auth.guard';

@ApiTags('Mind Maps (legacy diagram compatibility)')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('documents/:id/diagram')
export class DiagramController {
  constructor(private readonly diagramService: DiagramService) {}

  @Post()
  @ApiOperation({
    summary: 'Generate a legacy Mermaid Mind Map/diagram for a document',
  })
  generate(
    @Param('id') id: string,
    @Body() dto: GenerateDiagramDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.diagramService.generateDiagram(
      user.userId,
      id,
      dto.provider,
      dto.diagramType,
    );
  }

  @Get()
  @ApiOperation({
    summary:
      'List previously generated legacy Mind Maps/diagrams for a document',
  })
  list(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.diagramService.listDiagrams(user.userId, id);
  }
}
