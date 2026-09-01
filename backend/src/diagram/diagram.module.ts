import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LlmModule } from '../llm/llm.module';
import { DiagramService } from './diagram.service';
import { DiagramController } from './diagram.controller';
import { StudioDiagramController } from './studio-diagram.controller';

@Module({
  imports: [PrismaModule, LlmModule],
  controllers: [DiagramController, StudioDiagramController],
  providers: [DiagramService],
  exports: [DiagramService],
})
export class DiagramModule {}
