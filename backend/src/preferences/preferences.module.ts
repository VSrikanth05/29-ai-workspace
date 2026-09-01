import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { PreferencesController } from './preferences.controller';
import { PreferencesService } from './preferences.service';
@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [PreferencesController],
  providers: [PreferencesService],
})
export class PreferencesModule {}
