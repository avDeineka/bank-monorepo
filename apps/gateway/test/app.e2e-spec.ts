import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { of } from 'rxjs';
import { ROLES, SERVICES, PATTERNS } from '@app/common';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let authClientMock: { send: jest.Mock };
  let accountsClientMock: { send: jest.Mock };

  const createToken = (payload: { sub: number; email: string; role?: string }) =>
    jwtService.sign(payload);

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret';

    authClientMock = {
      send: jest.fn(),
    };

    accountsClientMock = {
      send: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SERVICES.AUTH)
      .useValue(authClientMock)
      .overrideProvider(SERVICES.ACCOUNTS)
      .useValue(accountsClientMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    jwtService = moduleFixture.get(JwtService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/api/me (GET) returns current user profile', async () => {
    const token = createToken({ sub: 7, email: 'user@example.com', role: ROLES.USER });
    const userProfile = {
      id: 7,
      name: 'Test User',
      email: 'user@example.com',
      phone: '+380000000000',
      role: ROLES.USER,
    };

    authClientMock.send.mockReturnValue(of(userProfile));

    await request(app.getHttpServer())
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(userProfile);

    expect(authClientMock.send).toHaveBeenCalledWith(
      { cmd: PATTERNS.USER.GET_ONE },
      expect.objectContaining({
        data: { id: 7 },
      }),
    );
  });

  it('/api/register (POST) rejects explicit role', async () => {
    await request(app.getHttpServer())
      .post('/api/register')
      .send({
        email: 'user@example.com',
        password: 'secret123',
        name: 'Test User',
        role: ROLES.ADMIN,
      })
      .expect(400);

    expect(authClientMock.send).not.toHaveBeenCalled();
  });

  it('/api/users (GET) allows admin', async () => {
    const token = createToken({ sub: 1, email: 'admin@example.com', role: ROLES.ADMIN });
    const users = [
      { id: 1, name: 'Admin', email: 'admin@example.com', phone: null, role: ROLES.ADMIN },
      { id: 2, name: 'User', email: 'user@example.com', phone: null, role: ROLES.USER },
    ];

    authClientMock.send.mockReturnValue(of(users));

    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(users);

    expect(authClientMock.send).toHaveBeenCalledWith(
      { cmd: PATTERNS.USER.GET_ALL },
      expect.objectContaining({
        data: {},
      }),
    );
  });

  it('/api/users (GET) denies non-admin', async () => {
    const token = createToken({ sub: 2, email: 'user@example.com', role: ROLES.USER });

    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(authClientMock.send).not.toHaveBeenCalled();
  });

  it('/api/users/:id (GET) allows admin', async () => {
    const token = createToken({ sub: 1, email: 'admin@example.com', role: ROLES.ADMIN });
    const userProfile = {
      id: 9,
      name: 'Target User',
      email: 'target@example.com',
      phone: '+380111111111',
      role: ROLES.USER,
    };

    authClientMock.send.mockReturnValue(of(userProfile));

    await request(app.getHttpServer())
      .get('/api/users/9')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(userProfile);

    expect(authClientMock.send).toHaveBeenCalledWith(
      { cmd: PATTERNS.USER.GET_ONE },
      expect.objectContaining({
        data: { id: 9 },
      }),
    );
  });

  it('/api/users/:id (GET) denies non-admin', async () => {
    const token = createToken({ sub: 2, email: 'user@example.com', role: ROLES.USER });

    await request(app.getHttpServer())
      .get('/api/users/9')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(authClientMock.send).not.toHaveBeenCalled();
  });

  it('/api/set-role (POST) allows admin', async () => {
    const token = createToken({ sub: 1, email: 'admin@example.com', role: ROLES.ADMIN });
    const updatedUser = {
      id: 2,
      name: 'User',
      email: 'user@example.com',
      phone: null,
      role: ROLES.ADMIN,
    };

    authClientMock.send.mockReturnValue(of(updatedUser));

    await request(app.getHttpServer())
      .post('/api/set-role')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'user@example.com', role: ROLES.ADMIN })
      .expect(201)
      .expect(updatedUser);

    expect(authClientMock.send).toHaveBeenCalledWith(
      { cmd: PATTERNS.USER.SET_ROLE },
      expect.objectContaining({
        data: { email: 'user@example.com', role: ROLES.ADMIN },
      }),
    );
  });

  it('/api/set-role (POST) denies non-admin', async () => {
    const token = createToken({ sub: 2, email: 'user@example.com', role: ROLES.USER });

    await request(app.getHttpServer())
      .post('/api/set-role')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'admin@example.com', role: ROLES.ADMIN })
      .expect(403);

    expect(authClientMock.send).not.toHaveBeenCalled();
  });
});
