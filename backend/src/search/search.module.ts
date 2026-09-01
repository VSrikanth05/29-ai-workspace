import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
@Module({
  imports: [PrismaModule, WorkspacesModule, RagModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
