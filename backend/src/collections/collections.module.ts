import { Module } from '@nestjs/common';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';
@Module({
  imports: [PrismaModule, WorkspacesModule, KnowledgeModule],
  controllers: [CollectionsController],
  providers: [CollectionsService],
})
export class CollectionsModule {}
