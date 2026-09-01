import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  SupabaseAuthGuard,
  type RequestUser,
} from '../../auth/guards/supabase-auth.guard';
import { TranslationRequestDto } from '../dto/tool-request.dto';
import { TranslationService } from './translation.service';
@ApiTags('AI Studio — Language')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('ai-studio')
export class TranslationController {
  constructor(private readonly service: TranslationService) {}
  @Post('translate') translate(
    @Body() dto: TranslationRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.translate(user.userId, dto);
  }
}
