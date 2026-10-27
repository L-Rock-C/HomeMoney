import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { createPersonSchema, updatePersonSchema, settleDebtSchema } from '@homemoney/shared';
import { getRequestUserId } from '../lib/auth.js';

export const peopleRoutes: FastifyPluginAsync = async (app) => {
  // List people with calculated balances for current user
  app.get('/', async (request) => {
    const userId = await getRequestUserId(request);
    const authUser = await prisma.user.findUnique({ where: { id: userId } });
    const { includeArchived } = request.query as { includeArchived?: string };

    const where: any = { userId };
    if (authUser) {
      where.name = { not: authUser.name };
    }
    if (includeArchived !== 'true') {
      where.isArchived = false;
    }

    const people = await prisma.person.findMany({
      where,
      include: {
        linkedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        transactions: {
          where: { userId },
          select: {
            id: true,
            amount: true,
            type: true,
            paid: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return people.map((p) => {
      let toReceive = 0;
      let toPay = 0;
      let pendingCount = 0;

      for (const t of p.transactions) {
        if (!t.paid) {
          if (t.type === 'REIMBURSEMENT') {
            toReceive += t.amount;
            pendingCount += 1;
          } else if (t.type === 'EXPENSE') {
            toPay += t.amount;
            pendingCount += 1;
          }
        }
      }

      return {
        id: p.id,
        name: p.name,
        notes: p.notes,
        isArchived: p.isArchived,
        linkedUserId: p.linkedUserId,
        linkedUser: p.linkedUser,
        pendingCount,
        toReceive: Math.round(toReceive * 100) / 100,
        toPay: Math.round(toPay * 100) / 100,
        netBalance: Math.round((toReceive - toPay) * 100) / 100,
        createdAt: p.createdAt.toISOString(),
      };
    });
  });

  // Get itemized pending transactions for a specific person
  app.get('/:id/pending-transactions', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };

    const transactions = await prisma.transaction.findMany({
      where: {
        personId: id,
        userId,
        paid: false,
        type: { in: ['REIMBURSEMENT', 'EXPENSE'] },
      },
      include: {
        category: true,
        account: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    return transactions.map((t) => ({
      ...t,
      purchaseDate: t.purchaseDate.toISOString().split('T')[0],
      dueDate: t.dueDate.toISOString().split('T')[0],
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  });

  // Create person
  app.post('/', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const parseResult = createPersonSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.format() });
    }

    const { name, notes } = parseResult.data;

    const existing = await prisma.person.findFirst({
      where: { name, userId },
    });

    if (existing) {
      if (existing.isArchived) {
        const restored = await prisma.person.update({
          where: { id: existing.id },
          data: {
            isArchived: false,
            notes: notes !== undefined ? notes : existing.notes,
          },
        });
        return reply.status(200).send(restored);
      }
      return reply.status(200).send(existing);
    }

    const person = await prisma.person.create({
      data: { name, notes, userId },
    });

    return reply.status(201).send(person);
  });

  // Update person
  app.patch('/:id', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };
    const current = await prisma.person.findFirst({ where: { id, userId } });
    if (!current) {
      return reply.status(404).send({ error: 'Contato não encontrado' });
    }

    const parseResult = updatePersonSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.format() });
    }

    const { name } = parseResult.data;
    if (name) {
      const existing = await prisma.person.findFirst({
        where: { name, userId },
      });
      if (existing && existing.id !== id) {
        return reply.status(400).send({
          error: existing.isArchived
            ? `Já existe um contato arquivado com o nome "${name}". Reative-o ou escolha outro nome.`
            : `Já existe um contato ativo com o nome "${name}".`,
        });
      }
    }

    const updated = await prisma.person.update({
      where: { id },
      data: parseResult.data,
    });

    return reply.send(updated);
  });

  // Safe Delete / Archive person (protects if pending balance exists)
  app.delete('/:id', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };
    const current = await prisma.person.findFirst({ where: { id, userId } });
    if (!current) {
      return reply.status(404).send({ error: 'Contato não encontrado' });
    }

    // Check if there are pending unpaid transactions
    const pendingCount = await prisma.transaction.count({
      where: {
        personId: id,
        userId,
        paid: false,
        type: { in: ['REIMBURSEMENT', 'EXPENSE'] },
      },
    });

    if (pendingCount > 0) {
      return reply.status(400).send({
        error: `Não é possível excluir este contato pois existem ${pendingCount} transações pendentes de acerto financeiro. Realize a quitação antes de excluir.`,
      });
    }

    // Check total historical transactions
    const totalCount = await prisma.transaction.count({
      where: { personId: id, userId },
    });

    if (totalCount > 0) {
      await prisma.person.update({
        where: { id },
        data: { isArchived: true },
      });
      return reply.send({
        archived: true,
        message: `O contato possui ${totalCount} transações no histórico e foi arquivado com sucesso.`,
      });
    }

    await prisma.person.delete({ where: { id } });
    return reply.status(204).send();
  });

  // Settle debt with a person (Acerto de contas com quitação de itens)
  app.post('/:id/settle', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };
    const currentPerson = await prisma.person.findFirst({ where: { id, userId } });
    if (!currentPerson) {
      return reply.status(404).send({ error: 'Contato não encontrado' });
    }

    const parseResult = settleDebtSchema.safeParse({ ...(request.body as object), personId: id });
    if (!parseResult.success) {
      return reply.status(400).send({ error: parseResult.error.format() });
    }

    const { accountId, amount, date, description } = parseResult.data;
    const body = request.body as any;
    const specificTransactionIds: string[] = body.transactionIds || [];

    let settlementCategory = await prisma.category.findFirst({
      where: { name: 'Acerto de Contas', userId },
    });
    if (!settlementCategory) {
      settlementCategory = await prisma.category.create({
        data: { name: 'Acerto de Contas', isIncome: true, color: '#10B981', userId },
      });
    }

    // 1. Mark corresponding pending transactions as paid!
    if (specificTransactionIds.length > 0) {
      await prisma.transaction.updateMany({
        where: { id: { in: specificTransactionIds }, userId },
        data: { paid: true },
      });
    } else {
      // Mark all pending transactions for this person as paid
      await prisma.transaction.updateMany({
        where: {
          personId: id,
          userId,
          paid: false,
          type: { in: ['REIMBURSEMENT', 'EXPENSE'] },
        },
        data: { paid: true },
      });
    }

    // 2. Create the inflow transaction
    const dateObj = new Date(date + 'T12:00:00Z');
    const transaction = await prisma.transaction.create({
      data: {
        description: `${description} (${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`,
        amount,
        type: 'INCOME',
        purchaseDate: dateObj,
        dueDate: dateObj,
        paid: true,
        paymentMethod: 'Pix',
        accountId,
        categoryId: settlementCategory.id,
        personId: id,
        notes: 'Acerto de contas / Reembolso recebido',
        userId,
      },
    });

    // Se o contato for vinculado a outro usuário, cria notificação de acerto/reembolso para reconhecimento
    if (currentPerson.linkedUserId && currentPerson.linkedUserId !== userId) {
      try {
        await prisma.transferNotification.create({
          data: {
            senderId: userId,
            receiverId: currentPerson.linkedUserId,
            transactionId: transaction.id,
            description: `Acerto / Reembolso: ${description}`,
            amount,
            type: 'SETTLEMENT',
            date: dateObj,
            paymentMethod: 'Pix',
            notes: `Acerto de contas no valor de ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
            status: 'PENDING',
          },
        });
      } catch (err) {
        console.error('Erro ao criar notificação de acerto para usuário vinculado:', err);
      }
    }

    return reply.status(201).send({ message: 'Acerto registrado e itens quitados com sucesso!', transaction });
  });

  // Link person to a real User account by email
  app.post('/:id/link', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };
    const { email } = (request.body as any) || {};

    if (!email || !email.includes('@')) {
      return reply.status(400).send({ error: 'Informe um e-mail válido para vincular.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (targetUser && targetUser.id === userId) {
      return reply.status(400).send({ error: 'Você não pode vincular seu próprio usuário como contato.' });
    }

    const person = await prisma.person.findFirst({ where: { id, userId } });
    if (!person) {
      return reply.status(404).send({ error: 'Contato não encontrado.' });
    }

    // Remove any previous rejected/pending invites for this person
    await prisma.contactInvite.deleteMany({
      where: {
        senderId: userId,
        personId: id,
      },
    }).catch(() => {});

    // Create a PENDING contact invite so the other user receives it in their dashboard
    const invite = await prisma.contactInvite.create({
      data: {
        senderId: userId,
        receiverEmail: cleanEmail,
        receiverId: targetUser?.id || null,
        personId: id,
        status: 'PENDING',
      },
    });

    return reply.send({
      message: `Convite de conexão enviado para "${cleanEmail}"! O outro usuário receberá o convite para aceitar no painel dele.`,
      person,
      invite,
    });
  });

  // Unlink person from real User account
  app.post('/:id/unlink', async (request, reply) => {
    const userId = await getRequestUserId(request);
    const { id } = request.params as { id: string };
    const person = await prisma.person.findFirst({ where: { id, userId } });
    if (!person) {
      return reply.status(404).send({ error: 'Contato não encontrado.' });
    }

    const updated = await prisma.person.update({
      where: { id },
      data: { linkedUserId: null },
    });

    // Remove any invites associated with this contact so it can be invited again
    await prisma.contactInvite.deleteMany({
      where: {
        personId: id,
      },
    }).catch(() => {});

    return reply.send({
      message: `Vínculo com usuário removido com sucesso.`,
      person: updated,
    });
  });
};
