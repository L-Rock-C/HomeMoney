import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { createTransactionSchema } from '@homemoney/shared';
import { randomUUID } from 'crypto';
import { getRequestUserId } from '../lib/auth.js';

export const transactionsRoutes: FastifyPluginAsync = async (app) => {
  // List transactions with filtering
  app.get('/', async (request) => {
    const userId = await getRequestUserId(request);
    const query = request.query as {
      month?: string; // YYYY-MM
      startDate?: string;
      endDate?: string;
      type?: string;
      accountId?: string;
      categoryId?: string;
      personId?: string;
      paid?: string;
    };

    const where: any = { userId };

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      where.dueDate = { gte: start, lte: end };
    } else if (query.startDate || query.endDate) {
      where.dueDate = {};
      if (query.startDate) where.dueDate.gte = new Date(query.startDate + 'T00:00:00Z');
      if (query.endDate) where.dueDate.lte = new Date(query.endDate + 'T23:59:59Z');
    }

    if (query.type) where.type = query.type;
    if (query.accountId) where.accountId = query.accountId;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.personId) where.personId = query.personId;
    if (query.paid !== undefined) where.paid = query.paid === 'true';

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        account: true,
        category: true,
        person: true,
      },
      orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
    });

    return transactions.map((t) => ({
      ...t,
      purchaseDate: t.purchaseDate.toISOString().split('T')[0],
      dueDate: t.dueDate.toISOString().split('T')[0],
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  });

  // Create transaction (supports multi-installment generation)
  app.post('/', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const parseResult = createTransactionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.format() });
    }

    const data = parseResult.data;
    const installments = data.totalInstallments || 1;
    const pDate = new Date(data.purchaseDate + 'T12:00:00Z');
    const baseDueDate = new Date(data.dueDate + 'T12:00:00Z');

    if (installments <= 1) {
      const transaction = await prisma.transaction.create({
        data: {
          description: data.description,
          amount: data.amount,
          type: data.type,
          purchaseDate: pDate,
          dueDate: baseDueDate,
          paid: data.paid,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
          accountId: data.accountId,
          categoryId: data.categoryId,
          personId: data.personId || null,
          totalInstallments: 1,
          userId,
        },
        include: { account: true, category: true, person: true },
      });

      return reply.status(201).send(transaction);
    }

    // Multiple installments
    const groupId = randomUUID();
    const installmentAmount = Math.round((data.amount / installments) * 100) / 100;
    const createdList = [];

    for (let i = 1; i <= installments; i++) {
      const instDueDate = new Date(baseDueDate);
      instDueDate.setUTCMonth(instDueDate.getUTCMonth() + (i - 1));

      const inst = await prisma.transaction.create({
        data: {
          description: `${data.description} (${i}/${installments})`,
          amount: installmentAmount,
          type: data.type,
          purchaseDate: pDate,
          dueDate: instDueDate,
          paid: i === 1 ? data.paid : false,
          paymentMethod: data.paymentMethod,
          notes: data.notes,
          accountId: data.accountId,
          categoryId: data.categoryId,
          personId: data.personId || null,
          currentInstallment: i,
          totalInstallments: installments,
          installmentGroupId: groupId,
          userId,
        },
      });
      createdList.push(inst);
    }

    return reply.status(201).send({
      message: `${installments} parcelas criadas com sucesso`,
      groupId,
      transactions: createdList,
    });
  });

  // Toggle paid status
  app.patch('/:id/toggle-paid', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };
    const current = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!current) {
      return reply.status(404).send({ error: 'Transação não encontrada' });
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: { paid: !current.paid },
      include: { account: true, category: true, person: true },
    });

    return reply.send(updated);
  });

  // Update transaction (Full Edit)
  app.patch('/:id', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };
    const current = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!current) {
      return reply.status(404).send({ error: 'Transação não encontrada' });
    }

    const body = request.body as any;

    const data: any = {};
    if (body.description !== undefined) data.description = body.description;
    if (body.amount !== undefined) data.amount = Number(body.amount);
    if (body.type !== undefined) data.type = body.type;
    if (body.purchaseDate !== undefined) data.purchaseDate = new Date(body.purchaseDate + 'T12:00:00Z');
    if (body.dueDate !== undefined) data.dueDate = new Date(body.dueDate + 'T12:00:00Z');
    if (body.paid !== undefined) data.paid = Boolean(body.paid);
    if (body.paymentMethod !== undefined) data.paymentMethod = body.paymentMethod;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.accountId !== undefined) data.accountId = body.accountId;
    if (body.categoryId !== undefined) data.categoryId = body.categoryId;
    if (body.personId !== undefined) data.personId = body.personId || null;

    const updated = await prisma.transaction.update({
      where: { id },
      data,
      include: { account: true, category: true, person: true },
    });

    return reply.send(updated);
  });

  // Delete transaction
  app.delete('/:id', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };
    const current = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!current) {
      return reply.status(404).send({ error: 'Transação não encontrada' });
    }
    await prisma.transaction.delete({ where: { id } });
    return reply.status(204).send();
  });
};
