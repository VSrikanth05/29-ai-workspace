import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { KnowledgeOutputsController } from './outputs.controller';
import { KnowledgeOutputsService } from './outputs.service';
import { TargetService } from './target.service';
@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [FavoritesController, KnowledgeOutputsController],
  providers: [TargetService, FavoritesService, KnowledgeOutputsService],
  exports: [TargetService],
})
export class KnowledgeModule {}
