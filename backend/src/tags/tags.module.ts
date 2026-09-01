import { Module } from '@nestjs/common';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
@Module({
  imports: [PrismaModule, WorkspacesModule, KnowledgeModule],
  controllers: [TagsController],
  providers: [TagsService],
})
export class TagsModule {}
