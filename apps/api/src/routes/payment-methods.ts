import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { createPaymentMethodSchema, updatePaymentMethodSchema } from '@homemoney/shared';
import { getRequestUserId } from '../lib/auth.js';

export const paymentMethodsRoutes: FastifyPluginAsync = async (app) => {
  // List payment methods
  app.get('/', async (request) => {
    const userId = await getRequestUserId(request);
    const { includeArchived } = request.query as { includeArchived?: string };
    const where: any = { userId };
    if (includeArchived !== 'true') {
      where.isArchived = false;
    }

    let methods = await prisma.paymentMethod.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    if (methods.length === 0) {
      const defaults = ['Crédito', 'Débito', 'Pix', 'Dinheiro'];
      for (const name of defaults) {
        await prisma.paymentMethod.create({ data: { name, userId } });
      }
      methods = await prisma.paymentMethod.findMany({ where, orderBy: { name: 'asc' } });
    }

    return methods;
  });

  // Create payment method
  app.post('/', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const parseResult = createPaymentMethodSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.format() });
    }

    const { name, icon } = parseResult.data;

    const existing = await prisma.paymentMethod.findFirst({
      where: { name, userId },
    });

    if (existing) {
      if (existing.isArchived) {
        const restored = await prisma.paymentMethod.update({
          where: { id: existing.id },
          data: {
            isArchived: false,
            icon: icon !== undefined ? icon : existing.icon,
          },
        });
        return reply.status(200).send(restored);
      }
      return reply.status(200).send(existing);
    }

    const method = await prisma.paymentMethod.create({
      data: { name, icon, userId },
    });

    return reply.status(201).send(method);
  });

  // Update payment method
  app.patch('/:id', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };
    const current = await prisma.paymentMethod.findFirst({ where: { id, userId } });
    if (!current) {
      return reply.status(404).send({ error: 'Método não encontrado' });
    }

    const parseResult = updatePaymentMethodSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.format() });
    }

    const { name } = parseResult.data;
    if (name) {
      const existing = await prisma.paymentMethod.findFirst({
        where: { name, userId },
      });
      if (existing && existing.id !== id) {
        return reply.status(400).send({
          error: existing.isArchived
            ? `Já existe um método arquivado com o nome "${name}". Reative-o ou escolha outro nome.`
            : `Já existe um método ativo com o nome "${name}".`,
        });
      }
    }

    const updated = await prisma.paymentMethod.update({
      where: { id },
      data: parseResult.data,
    });

    return reply.send(updated);
  });

  // Safe Delete / Archive payment method
  app.delete('/:id', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };

    const target = await prisma.paymentMethod.findFirst({ where: { id, userId } });
    if (!target) return reply.status(404).send({ error: 'Método não encontrado' });

    // Check if used in transactions
    const count = await prisma.transaction.count({
      where: { paymentMethod: target.name, userId },
    });

    if (count > 0) {
      await prisma.paymentMethod.update({
        where: { id },
        data: { isArchived: true },
      });
      return reply.send({
        archived: true,
        message: `Método arquivado com segurança para preservar as ${count} transações associadas.`,
      });
    }

    await prisma.paymentMethod.delete({ where: { id } });
    return reply.status(204).send();
  });
};
