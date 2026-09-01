import { BadRequestException } from '@nestjs/common';
import { validateImageTranslationFile } from './image-translation.validation';

const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1]);

describe('image translation upload validation', () => {
  it('accepts a real PNG signature', () => expect(validateImageTranslationFile({ originalname: 'sample.png', mimetype: 'image/png', size: png.length, buffer: png })).toMatchObject({ extension: 'png', isPdf: false }));
  it('rejects mismatched contents and oversized files', () => {
    expect(() => validateImageTranslationFile({ originalname: 'sample.png', mimetype: 'image/png', size: 3, buffer: Buffer.from('not png') })).toThrow(BadRequestException);
    expect(() => validateImageTranslationFile({ originalname: 'sample.png', mimetype: 'image/png', size: 21 * 1024 * 1024, buffer: png })).toThrow('20 MB');
  });
});
