import { Module } from '@nestjs/common';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { SharingController } from './sharing.controller';
import { SharingService } from './sharing.service';
@Module({
  imports: [PrismaModule, WorkspacesModule, KnowledgeModule],
  controllers: [SharingController],
  providers: [SharingService],
})
export class SharingModule {}
