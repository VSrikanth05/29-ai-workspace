import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import type { RequestUser } from '../auth/guards/supabase-auth.guard';
import { CreateShareDto } from './sharing.dto';
import { SharingService } from './sharing.service';
@Controller('share')
export class SharingController {
  constructor(private readonly sharing: SharingService) {}
  @Post() @UseGuards(SupabaseAuthGuard) create(
    @CurrentUser() user: RequestUser,
    @Body() body: CreateShareDto,
  ) {
    return this.sharing.create(user.userId, body);
  }
  @Delete(':id') @UseGuards(SupabaseAuthGuard) disable(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.sharing.disable(user.userId, id);
  }
  @Get(':token') view(@Param('token') token: string) {
    return this.sharing.view(token);
  }
}
