import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { TestDto } from './common/dto/test.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('test')
  test(@Body() body: TestDto) {
    return this.appService.test(body);
  }
}
