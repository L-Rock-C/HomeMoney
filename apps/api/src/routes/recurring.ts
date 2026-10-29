import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import {
  createRecurringTransactionSchema,
  updateRecurringTransactionSchema,
} from '@homemoney/shared';
import { getRequestUserId } from '../lib/auth.js';

export const recurringRoutes: FastifyPluginAsync = async (app) => {
  // List all recurring transactions with summary metrics
  app.get('/', async (request) => {
    const userId = await getRequestUserId(request);
    const { status } = request.query as { status?: string };

    const where: any = { userId };
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const items = await prisma.recurringTransaction.findMany({
      where,
      include: {
        account: true,
        category: true,
      },
      orderBy: [{ type: 'asc' }, { recurrenceDay: 'asc' }, { description: 'asc' }],
    });

    let totalFixedIncomes = 0;
    let totalFixedExpenses = 0;
    let totalSubscriptions = 0;
    let activeCount = 0;
    let pausedCount = 0;

    for (const item of items) {
      if (item.status === 'ACTIVE') {
        activeCount++;
        if (item.type === 'INCOME') {
          totalFixedIncomes += item.amount;
        } else {
          totalFixedExpenses += item.amount;
          // Subscrições / Assinaturas: se a categoria tiver nome relacionado ou se for do tipo despesa
          const catName = item.category?.name?.toLowerCase() || '';
          if (
            catName.includes('assinatura') ||
            catName.includes('streaming') ||
            catName.includes('serviço') ||
            catName.includes('software') ||
            catName.includes('lazer')
          ) {
            totalSubscriptions += item.amount;
          }
        }
      } else if (item.status === 'PAUSED') {
        pausedCount++;
      }
    }

    return {
      items,
      metrics: {
        totalFixedIncomes: Math.round(totalFixedIncomes * 100) / 100,
        totalFixedExpenses: Math.round(totalFixedExpenses * 100) / 100,
        totalSubscriptions: Math.round(totalSubscriptions * 100) / 100,
        netFreeBalance: Math.round((totalFixedIncomes - totalFixedExpenses) * 100) / 100,
        activeCount,
        pausedCount,
        totalCount: items.length,
      },
    };
  });

  // Create new recurring transaction
  app.post('/', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const parseResult = createRecurringTransactionSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.format() });
    }

    const data = parseResult.data;

    const created = await prisma.recurringTransaction.create({
      data: {
        description: data.description,
        amount: data.amount,
        type: data.type,
        frequency: data.frequency || 'MONTHLY',
        recurrenceDay: data.recurrenceDay,
        paymentMethod: data.paymentMethod,
        notes: data.notes || null,
        autoGenerate: data.autoGenerate !== undefined ? data.autoGenerate : true,
        accountId: data.accountId,
        categoryId: data.categoryId,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: 'ACTIVE',
        userId,
      },
      include: {
        account: true,
        category: true,
      },
    });

    return reply.status(201).send(created);
  });

  // Update existing recurring transaction
  app.put('/:id', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };

    const parseResult = updateRecurringTransactionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.format() });
    }

    const existing = await prisma.recurringTransaction.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Recorrência não encontrada' });
    }

    const data = parseResult.data;

    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.frequency !== undefined ? { frequency: data.frequency } : {}),
        ...(data.recurrenceDay !== undefined ? { recurrenceDay: data.recurrenceDay } : {}),
        ...(data.paymentMethod !== undefined ? { paymentMethod: data.paymentMethod } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.autoGenerate !== undefined ? { autoGenerate: data.autoGenerate } : {}),
        ...(data.accountId !== undefined ? { accountId: data.accountId } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate ? new Date(data.startDate) : null } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate ? new Date(data.endDate) : null } : {}),
      },
      include: {
        account: true,
        category: true,
      },
    });

    return reply.status(200).send(updated);
  });

  // Toggle active/paused status
  app.patch('/:id/toggle', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };

    const existing = await prisma.recurringTransaction.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Recorrência não encontrada' });
    }

    const newStatus = existing.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';

    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: { status: newStatus },
      include: {
        account: true,
        category: true,
      },
    });

    return reply.status(200).send(updated);
  });

  // Delete recurring transaction
  app.delete('/:id', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };

    const existing = await prisma.recurringTransaction.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Recorrência não encontrada' });
    }

    await prisma.recurringTransaction.delete({
      where: { id },
    });

    return reply.status(200).send({ message: 'Recorrência removida com sucesso' });
  });

  // Generate / materialize transactions for a given month
  app.post('/generate-month', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { month } = request.body as { month: string };

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return reply.status(400).send({ error: 'Mês no formato YYYY-MM é obrigatório' });
    }

    const [yearNum, monthNum] = month.split('-').map(Number);
    // Número de dias no mês selecionado
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

    // Busca todas as recorrências ativas do usuário
    const recurrings = await prisma.recurringTransaction.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        autoGenerate: true,
      },
    });

    const monthStart = new Date(Date.UTC(yearNum, monthNum - 1, 1));
    const monthEnd = new Date(Date.UTC(yearNum, monthNum, 0, 23, 59, 59, 999));

    // Busca transações já geradas neste mês para evitar duplicação
    const existingTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        recurringId: { in: recurrings.map((r) => r.id) },
        dueDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      select: { recurringId: true },
    });

    const existingSet = new Set(existingTransactions.map((t) => t.recurringId));
    const createdTransactions = [];
    let skipped = 0;

    for (const rec of recurrings) {
      if (existingSet.has(rec.id)) {
        skipped++;
        continue;
      }

      // Clampa o dia caso o mês não tenha 31 dias (ex: dia 31 em fevereiro vira dia 28/29)
      const day = Math.min(Math.max(1, rec.recurrenceDay), daysInMonth);
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${month}-${dayStr}`;
      const targetDate = new Date(`${dateStr}T12:00:00Z`);

      const t = await prisma.transaction.create({
        data: {
          description: rec.description,
          amount: rec.amount,
          type: rec.type,
          purchaseDate: targetDate,
          dueDate: targetDate,
          paid: false,
          paymentMethod: rec.paymentMethod,
          notes: rec.notes ? `[Recorrência] ${rec.notes}` : '[Recorrência Automática]',
          accountId: rec.accountId,
          categoryId: rec.categoryId,
          totalInstallments: 1,
          recurringId: rec.id,
          userId,
        },
        include: {
          account: true,
          category: true,
        },
      });

      createdTransactions.push(t);
    }

    return reply.status(200).send({
      message: `${createdTransactions.length} transações geradas para ${month}`,
      createdCount: createdTransactions.length,
      skippedCount: skipped,
      transactions: createdTransactions,
    });
  });
};
