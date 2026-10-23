import fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.js';
import { accountsRoutes } from './routes/accounts.js';
import { categoriesRoutes } from './routes/categories.js';
import { peopleRoutes } from './routes/people.js';
import { transactionsRoutes } from './routes/transactions.js';
import { reportsRoutes } from './routes/reports.js';
import { paymentMethodsRoutes } from './routes/payment-methods.js';
import { invitesRoutes } from './routes/invites.js';
import { ensureUserData } from './lib/backfill.js';

dotenv.config();

const app = fastify({
  logger: true,
});

async function main() {
  // CORS configuration
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Swagger OpenAPI documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'HomeMoney API',
        description: 'API REST dedicada para gestão de finanças pessoais (HomeMoney)',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3333',
          description: 'Servidor Local',
        },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Healthcheck
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
  // API Routes
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(accountsRoutes, { prefix: '/accounts' });
  await app.register(categoriesRoutes, { prefix: '/categories' });
  await app.register(peopleRoutes, { prefix: '/people' });
  await app.register(transactionsRoutes, { prefix: '/transactions' });
  await app.register(reportsRoutes, { prefix: '/reports' });
  await app.register(paymentMethodsRoutes, { prefix: '/payment-methods' });
  await app.register(invitesRoutes, { prefix: '/invites' });

  const port = Number(process.env.PORT) || 3333;
  const host = '0.0.0.0';

  try {
    await ensureUserData();
    await app.listen({ port, host });
    console.log(`🚀 HomeMoney API running at http://localhost:${port}`);
    console.log(`📚 Swagger documentation at http://localhost:${port}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
