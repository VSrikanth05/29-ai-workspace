import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { TestDto } from './common/dto/test.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  root() {
    return { status: 'ok', service: '29-ai-workspace-api', timestamp: new Date().toISOString() };
  }

  @Post('test')
  test(@Body() body: TestDto) {
    return this.appService.test(body);
  }
}
