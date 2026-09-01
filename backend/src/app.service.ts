import { Injectable } from '@nestjs/common';
import { TestDto } from './common/dto/test.dto';

@Injectable()
export class AppService {
  test(data: TestDto) {
    return {
      message: 'Validation Successful',
      data,
    };
  }
}
