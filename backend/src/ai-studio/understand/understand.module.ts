import { Module } from '@nestjs/common';
import { AiStudioCoreModule } from '../core/ai-studio-core.module';
import { UnderstandController } from './understand.controller';
import { UnderstandService } from './understand.service';
@Module({
  imports: [AiStudioCoreModule],
  controllers: [UnderstandController],
  providers: [UnderstandService],
})
export class UnderstandModule {}
