import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports ok', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });

  it('POST /orders rejects an empty items array', () => {
    return request(app.getHttpServer()).post('/orders').send({ items: [] }).expect(400);
  });

  it('POST /orders rejects a malformed line item', () => {
    return request(app.getHttpServer())
      .post('/orders')
      .send({ items: [{ productId: 'sku-001', quantity: 0, unitPrice: -5 }] })
      .expect(400);
  });
});
