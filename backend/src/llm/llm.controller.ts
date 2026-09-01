import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LlmGatewayService } from './llm-gateway.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';

@ApiTags('LLM Gateway')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('llm')
export class LlmController {
  constructor(private readonly llmGatewayService: LlmGatewayService) {}

  @Get('providers')
  @ApiOperation({
    summary:
      'List available LLMs and whether each has credentials configured',
  })
  listProviders() {
    return this.llmGatewayService.listProviders();
  }
}
