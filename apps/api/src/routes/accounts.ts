import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { createAccountSchema, updateAccountSchema } from '@homemoney/shared';
import { getRequestUserId } from '../lib/auth.js';

export const accountsRoutes: FastifyPluginAsync = async (app) => {
  // List accounts/wallets with calculated balance
  app.get('/', async (request) => {
    const userId = await getRequestUserId(request);
    const { includeArchived } = request.query as { includeArchived?: string };
    const where: any = { userId };
    if (includeArchived !== 'true') {
      where.isArchived = false;
    }

    const [accounts, balanceGroups] = await Promise.all([
      prisma.account.findMany({
        where,
        orderBy: { name: 'asc' },
      }),
      prisma.transaction.groupBy({
        by: ['accountId', 'type'],
        where: {
          userId,
          paid: true,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const balanceMap = new Map<string, number>();
    for (const group of balanceGroups) {
      if (!group.accountId) continue;
      const current = balanceMap.get(group.accountId) || 0;
      const amount = group._sum.amount || 0;
      if (group.type === 'INCOME') {
        balanceMap.set(group.accountId, current + amount);
      } else if (group.type === 'EXPENSE' || group.type === 'REIMBURSEMENT') {
        balanceMap.set(group.accountId, current - amount);
      }
    }

    return accounts.map((acc) => {
      const transactionSum = balanceMap.get(acc.id) || 0;

      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        color: acc.color,
        isArchived: acc.isArchived,
        initialBalance: acc.initialBalance,
        dueDay: acc.dueDay,
        currentBalance: Math.round((acc.initialBalance + transactionSum) * 100) / 100,
        createdAt: acc.createdAt.toISOString(),
      };
    });
  });

  // Create account/wallet
  app.post('/', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const parseResult = createAccountSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.format() });
    }

    const { name, type, color, initialBalance, dueDay } = parseResult.data;

    const existing = await prisma.account.findFirst({
      where: { name, userId },
    });

    if (existing) {
      if (existing.isArchived) {
        const effectiveType = type || existing.type;
        const restored = await prisma.account.update({
          where: { id: existing.id },
          data: {
            isArchived: false,
            type: effectiveType,
            color: color !== undefined ? color : existing.color,
            initialBalance: initialBalance !== undefined ? initialBalance : existing.initialBalance,
            dueDay: dueDay !== undefined ? (effectiveType === 'CHECKING' ? dueDay : null) : existing.dueDay,
          },
        });
        return reply.status(200).send(restored);
      }
      return reply.status(200).send(existing);
    }

    const account = await prisma.account.create({
      data: {
        name,
        type,
        color,
        initialBalance,
        dueDay: type === 'CHECKING' ? dueDay : null,
        userId,
      },
    });

    return reply.status(201).send(account);
  });

  // Update account/wallet
  app.patch('/:id', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };
    const current = await prisma.account.findFirst({ where: { id, userId } });
    if (!current) {
      return reply.status(404).send({ error: 'Carteira não encontrada' });
    }

    const parseResult = updateAccountSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.format() });
    }

    const { name } = parseResult.data;
    if (name) {
      const existing = await prisma.account.findFirst({
        where: { name, userId },
      });
      if (existing && existing.id !== id) {
        return reply.status(400).send({
          error: existing.isArchived
            ? `Já existe uma carteira arquivada com o nome "${name}". Reative-a ou escolha outro nome.`
            : `Já existe uma carteira ativa com o nome "${name}".`,
        });
      }
    }

    const dataToUpdate = { ...parseResult.data };
    const effectiveType = dataToUpdate.type || current.type;
    if (effectiveType !== 'CHECKING') {
      dataToUpdate.dueDay = null;
    }

    const updated = await prisma.account.update({
      where: { id },
      data: dataToUpdate,
    });

    return reply.send(updated);
  });

  // Safe Delete / Archive account/wallet
  app.delete('/:id', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };
    const current = await prisma.account.findFirst({ where: { id, userId } });
    if (!current) {
      return reply.status(404).send({ error: 'Carteira não encontrada' });
    }

    const transactionCount = await prisma.transaction.count({
      where: { accountId: id, userId },
    });

    if (transactionCount > 0) {
      await prisma.account.update({
        where: { id },
        data: { isArchived: true },
      });
      return reply.send({
        archived: true,
        message: `A carteira possui ${transactionCount} transações registradas e foi arquivada com segurança.`,
      });
    }

    await prisma.account.delete({ where: { id } });
    return reply.status(204).send();
  });
};
